#!/usr/bin/env bash
# One-time (idempotent) local dev setup: infra, deps, env files, DB, admin user.
# Safe to re-run — every step skips itself if already done.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
BACKEND_APP_DIR="$BACKEND_DIR/apps/backend"
STOREFRONT_APP_DIR="$BACKEND_DIR/apps/storefront"
BACKEND_ENV="$BACKEND_APP_DIR/.env"
STOREFRONT_ENV="$STOREFRONT_APP_DIR/.env.local"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@bikeone.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-supersecret}"

step() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
ok()   { printf '    %s\n' "$1"; }

wait_for_healthy() {
  local service="$1" max_wait="${2:-60}" waited=0 status
  while true; do
    status="$(docker compose -f "$COMPOSE_FILE" ps -q "$service" | xargs -r docker inspect -f '{{.State.Health.Status}}' 2>/dev/null || true)"
    [ "$status" = "healthy" ] && return 0
    if [ "$waited" -ge "$max_wait" ]; then
      echo "Timed out waiting for '$service' to become healthy" >&2
      exit 1
    fi
    sleep 2
    waited=$((waited + 2))
  done
}

step "Starting Postgres + Redis (docker compose)"
docker compose -f "$COMPOSE_FILE" up -d postgres redis
wait_for_healthy postgres
wait_for_healthy redis
ok "postgres and redis are healthy"

step "Installing dependencies (npm workspaces)"
(cd "$BACKEND_DIR" && npm install)

step "Writing backend/apps/backend/.env"
if [ -f "$BACKEND_ENV" ]; then
  ok "already exists, skipping"
else
  cp "$BACKEND_APP_DIR/.env.template" "$BACKEND_ENV"
  {
    echo "MEDUSA_ADMIN_ONBOARDING_TYPE=nextjs"
    echo "MEDUSA_ADMIN_ONBOARDING_NEXTJS_DIRECTORY=backend/apps/storefront"
    echo "AUTH_MFA_ENCRYPTION_KEY=$(openssl rand -hex 32)"
  } >>"$BACKEND_ENV"
  sed -i.bak \
    -e "s#^DATABASE_URL=.*#DATABASE_URL=postgres://medusa:medusa@localhost:5432/medusa#" \
    -e "s#^AUTH_CORS=.*#AUTH_CORS=http://localhost:5173,http://localhost:9000,http://localhost:8000,https://docs.medusajs.com#" \
    "$BACKEND_ENV"
  rm -f "$BACKEND_ENV.bak"
  ok "created, pointed at the compose Postgres instance"
fi

step "Running database migrations (also seeds demo data on first run)"
(cd "$BACKEND_APP_DIR" && npx medusa db:migrate)

step "Ensuring a dev admin user exists ($ADMIN_EMAIL)"
USER_OUTPUT="$(mktemp)"
if (cd "$BACKEND_APP_DIR" && npx medusa user -e "$ADMIN_EMAIL" -p "$ADMIN_PASSWORD") >"$USER_OUTPUT" 2>&1; then
  ok "created ($ADMIN_EMAIL / $ADMIN_PASSWORD)"
elif grep -qi "already exists" "$USER_OUTPUT"; then
  ok "already exists, skipping"
else
  cat "$USER_OUTPUT" >&2
  rm -f "$USER_OUTPUT"
  exit 1
fi
rm -f "$USER_OUTPUT"

step "Writing backend/apps/storefront/.env.local"
if [ -f "$STOREFRONT_ENV" ]; then
  ok "already exists, skipping"
else
  PUBLISHABLE_KEY="$(cd "$BACKEND_APP_DIR" && npx medusa exec ./src/scripts/print-publishable-key.ts | grep -o 'PUBLISHABLE_KEY=.*' | tail -1 | cut -d= -f2-)"
  if [ -z "$PUBLISHABLE_KEY" ]; then
    echo "Could not determine the publishable API key — check the backend logs above." >&2
    exit 1
  fi
  cat >"$STOREFRONT_ENV" <<EOF
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$PUBLISHABLE_KEY
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_DEFAULT_REGION=dk
NEXT_PUBLIC_BASE_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_KEY=
NODE_ENV=development
EOF
  ok "created with the seeded publishable key"
fi

step "Setup complete"
cat <<EOF
    Run 'make dev' to start the backend (:9000) and storefront (:8000).
    Admin dashboard: http://localhost:9000/app  (login: $ADMIN_EMAIL / $ADMIN_PASSWORD)
EOF
