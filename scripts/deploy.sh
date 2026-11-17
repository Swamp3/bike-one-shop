#!/usr/bin/env bash
# Deploy a branch on THIS server (run it on the server, from the repo checkout):
#   scripts/deploy.sh dev            # fetch origin/dev, build, migrate, restart
#   scripts/deploy.sh dev --force    # redeploy even if the commit is unchanged
# From your machine: `make deploy-dev`.
#
# Needs: systemd units <prefix>-backend / -storefront / -tricon-mock, Postgres +
# Redis from docker-compose.yml, backend/apps/backend/.env and
# backend/apps/storefront/.env.local already written (they are never in git).
# Downtime is a few minutes: backend and storefront are stopped while building,
# and scripts/maintenance/ answers on their ports (503 page) meanwhile.
# No automatic rollback: to go back, revert on the branch and deploy again.
set -euo pipefail

BRANCH="${1:?usage: scripts/deploy.sh <branch> [--force]}"
FORCE="${2:-}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${DEPLOY_DATA_DIR:-$HOME/bike-one-data}"
PREFIX="${DEPLOY_SERVICE_PREFIX:-bikeone}"
BACKEND_DIR="$ROOT/backend/apps/backend"
STOREFRONT_DIR="$ROOT/backend/apps/storefront"
MEDUSA="$ROOT/backend/node_modules/.bin/medusa"

maintenance_on()  { sudo -n systemd-run -q --uid="$(id -u)" --unit="$PREFIX-maintenance-$1" node "$ROOT/scripts/maintenance/server.mjs" "$1"; }
maintenance_off() { sudo -n systemctl stop "$PREFIX-maintenance-$1" 2>/dev/null || true; }

step() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
die()  { printf '\033[1;31mdeploy failed:\033[0m %s\n' "$1" >&2; exit 1; }

mkdir -p "$DATA_DIR/static"
exec 9>"$DATA_DIR/deploy.lock"
flock -n 9 || die "another deploy is running"

# Stage 1 swaps the files of this script, so stage 2 runs as a fresh process.
if [ -z "${DEPLOY_STAGE2:-}" ]; then
  cd "$ROOT"
  step "Fetching origin/$BRANCH"
  git fetch origin "$BRANCH"
  # Local tracked changes on a deploy server are discarded on purpose.
  git checkout -f -B "$BRANCH" FETCH_HEAD
  DEPLOY_STAGE2=1 exec bash "$ROOT/scripts/deploy.sh" "$BRANCH" "$FORCE"
fi

# On failure the maintenance page stays up instead of a bare 502.
trap 'die "step failed (see above). Logs: journalctl -u $PREFIX-backend -u $PREFIX-storefront -n 50"' ERR
cd "$ROOT"

NEW="$(git rev-parse HEAD)"
OLD="$(cat "$DATA_DIR/deployed-rev" 2>/dev/null || true)"
if [ "$NEW" = "$OLD" ] && [ "$FORCE" != "--force" ]; then
  echo "Already deployed: $(git log -1 --format='%h %s')"
  exit 0
fi
echo "Deploying $(git log -1 --format='%h %s') (was ${OLD:0:7})"

for f in "$BACKEND_DIR/.env" "$STOREFRONT_DIR/.env.local"; do
  [ -f "$f" ] || die "missing $f (written once per server, not in git)"
done

step "Stopping storefront and backend, showing the maintenance page"
sudo -n systemctl stop "$PREFIX-storefront" "$PREFIX-backend"
maintenance_off 8000; maintenance_off 9000  # left over from a failed deploy
maintenance_on 8000; maintenance_on 9000

step "Dependencies"
LOCK_HASH="$(cd backend && cat package-lock.json package.json apps/*/package.json | sha256sum | cut -d' ' -f1)"
if [ ! -d backend/node_modules ] || [ "$LOCK_HASH" != "$(cat "$DATA_DIR/deps-hash" 2>/dev/null || true)" ]; then
  (cd backend && npm ci)
  echo "$LOCK_HASH" >"$DATA_DIR/deps-hash"
  DEPS_CHANGED=1
else
  echo "unchanged, skipping npm ci"
  DEPS_CHANGED=0
fi
# Split install = Store API hangs (see REVIEW_TASKS.md task 13).
for p in framework medusa; do
  [ -d "backend/node_modules/@medusajs/$p" ] || die "@medusajs/$p is not in backend/node_modules"
  [ ! -d "$BACKEND_DIR/node_modules/@medusajs/$p" ] || die "@medusajs/$p is split into apps/backend/node_modules"
done

step "Building backend"
# shortcut: the seed script reads ../example-product-images relative to the build dir; remove when it resolves its own path.
ln -sfn "$ROOT/example-product-images" "$ROOT/backend/apps/example-product-images"
(
  cd "$BACKEND_DIR"
  set -a; . ./.env; set +a
  "$MEDUSA" build
  # The build deletes .medusa/server: keep uploads outside it.
  ln -sfn "$DATA_DIR/static" .medusa/server/static
  ln -sfn "$DATA_DIR/static" static
  cd .medusa/server
  "$MEDUSA" db:migrate
)

step "Starting backend"
maintenance_off 9000
sudo -n systemctl start "$PREFIX-backend"
for i in $(seq 1 45); do
  curl -fs -m3 http://127.0.0.1:9000/health >/dev/null && break
  [ "$i" -lt 45 ] || die "backend not healthy after 90 s"
  sleep 2
done

step "Building storefront (needs the running backend)"
(cd "$STOREFRONT_DIR" && NODE_ENV=production npm run build)
maintenance_off 8000
sudo -n systemctl start "$PREFIX-storefront"

# The mock is stateful: only restart it when its code or dependencies changed.
if [ "$DEPS_CHANGED" = 1 ] || [ -z "$OLD" ] || ! git diff --quiet "$OLD" "$NEW" -- backend/apps/tricon-mock 2>/dev/null; then
  step "Restarting TriCon mock"
  sudo -n systemctl restart "$PREFIX-tricon-mock"
fi

step "Smoke test"
PK="$(grep '^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=' "$STOREFRONT_DIR/.env.local" | cut -d= -f2-)"
for i in $(seq 1 15); do
  curl -fs -m5 -o /dev/null http://127.0.0.1:8000/de && break
  [ "$i" -lt 15 ] || die "storefront /de does not answer"
  sleep 2
done
curl -fs -m10 -H "x-publishable-api-key: $PK" "http://127.0.0.1:9000/store/products?limit=1" | grep -q '"products"' \
  || die "Store API returned no product list"

echo "$NEW" >"$DATA_DIR/deployed-rev"
step "Deployed $(git log -1 --format='%h %s')"
