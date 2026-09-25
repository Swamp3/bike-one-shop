SHELL := /bin/bash
COMPOSE := docker compose -f docker-compose.yml

.PHONY: help setup install up down dev start backend storefront build migrate logs status reset-db clean

help: ## Show this help
	@echo "bike-one-shop — common commands:"
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[1;36m%-12s\033[0m %s\n", $$1, $$2}'

setup: ## One-time dev setup: infra, deps, env files, DB migrate/seed, admin user
	@bash scripts/setup.sh

install: ## Install npm workspace dependencies
	cd backend && npm install

up: ## Start Postgres + Redis in the background
	$(COMPOSE) up -d postgres redis

down: ## Stop Postgres + Redis (keeps data)
	$(COMPOSE) down

dev: up ## Start infra, then run backend (:9000) + storefront (:8000) together
	cd backend && npm run dev

start: dev ## Alias for 'make dev'

backend: up ## Run only the Medusa backend (:9000)
	cd backend && npm run backend:dev

storefront: up ## Run only the Next.js storefront (:8000)
	cd backend && npm run storefront:dev

build: ## Production build of backend + storefront
	cd backend && npm run build

migrate: ## Run pending Medusa DB migrations
	cd backend/apps/backend && npx medusa db:migrate

logs: ## Tail Postgres/Redis container logs
	$(COMPOSE) logs -f

status: ## Show container status
	$(COMPOSE) ps

reset-db: ## Wipe local Postgres/Redis data and re-run setup (DESTRUCTIVE)
	$(COMPOSE) down -v
	@$(MAKE) setup

clean: down ## Stop infra and remove node_modules
	rm -rf backend/node_modules backend/apps/backend/node_modules backend/apps/storefront/node_modules
