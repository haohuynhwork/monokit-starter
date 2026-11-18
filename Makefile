# Thin wrapper around pnpm scripts and docker compose. Run `make` for the list.
# Values from .env are exported to every command (create it with `make env`).
# A variable already in the shell wins: `SEED_PASSWORD=x make seed`. Plain
# `include .env` would override it, so .env is rewritten to `?=` first.
.make.env: $(wildcard .env)
	@if [ -f .env ]; then sed -E 's/^([A-Za-z_][A-Za-z0-9_]*)=/\1 ?= /' .env > $@; else : > $@; fi
-include .make.env
export

DB      := pnpm --filter @packages/db
COMPOSE := docker compose
PROD    := docker compose -f compose.prod.yaml
# Runs a database command inside the dev stack (uses the container's DATABASE_URL)
DB_RUN  := $(COMPOSE) run --rm migrate $(DB)

.DEFAULT_GOAL := help
.PHONY: hash-password help env install dev dev\:api dev\:web dev\:api.sh dev\:web.sh dev\:db.sh db.sh api.sh web.sh \
	dev.api dev.web dev.api.sh dev.web.sh dev.db.sh api-sh web-sh db-sh content-css content-css-watch build lint check fix \
	up down restart logs ps exec-api exec-migrate debug \
	migrate migrate-debug migration-plan migration-status contract seed psql \
	prod-up prod-down prod-logs prod-migrate clean

# Lines starting with `## ---` become section titles in `make help`.
help: ## Show this help
	@awk '/^## --- / { t = $$0; gsub(/^## --- | ---$$/, "", t); printf "\n\033[1m%s\033[0m\n", t; next } \
	  match($$0, /^([a-zA-Z0-9_.-]|\\:)+:.*## /) { \
	  match($$0, /^([a-zA-Z0-9_.-]|\\:)+/); n = substr($$0, 1, RLENGTH); \
	  gsub(/\\:/, ":", n); d = $$0; sub(/.*## /, "", d); printf "  \033[36m%-18s\033[0m %s\n", n, d }' $(MAKEFILE_LIST)

## --- Setup ---
env: ## Create .env from .env.example (never overwrites)
	@if [ -f .env ]; then echo ".env already exists"; else cp .env.example .env && echo "Created .env, edit it"; fi

install: ## Install dependencies and build the shared packages
	pnpm install
	pnpm --filter "./packages/*" build

## --- Local (pnpm) ---
# Apps run on the host; make/api.sh and make/web.sh set their env
# (DATABASE_URL via the published db port, PORT, API_URL, ...).

dev: ## Run packages (watch) + api + web locally (needs the db: make up or docker compose up -d db)
	@./make/dev.sh

dev\:api: ## Run the api locally
	@./make/api.sh pnpm start:dev

dev\:web: ## Run the web app locally (site + /admin, WEB_PORT or 3002; proxies /api)
	@./make/web.sh pnpm dev

content-css: ## Build the rich-text content styles (packages/editor/styles/) into apps/web
	pnpm --filter @apps/web content-css

content-css-watch: ## Rebuild the content styles on every save (needs @parcel/watcher approved)
	pnpm --filter @apps/web content-css:watch

## --- Shells (local env; c="..." runs a command) ---
api.sh: ## Shell in apps/api (c="pnpm test")
	@./make/api.sh $(c)

web.sh: ## Shell in apps/web (c="pnpm lint")
	@./make/web.sh $(c)

db.sh: ## Shell in packages/db (c="prisma db verify")
	@./make/db.sh $(c)

dev\:api.sh: api.sh ## Same as api.sh
dev\:web.sh: web.sh ## Same as web.sh
dev\:db.sh: db.sh ## Same as db.sh

# Old names, kept working (not listed in help or completion).
dev.api: dev\:api
dev.web: dev\:web
dev.api.sh api-sh: api.sh
dev.web.sh web-sh: web.sh
dev.db.sh db-sh: db.sh

## --- Code ---
build: ## Build every package
	pnpm build

lint: ## Lint every package
	pnpm lint

check: ## Biome check
	pnpm check

fix: ## Biome check and fix
	pnpm check:fix

## --- Docker dev stack ---
up: env ## Start the dev stack (migrates first)
	pnpm docker:up

down: ## Stop the dev stack
	pnpm docker:down

restart: down up ## Restart the dev stack

debug: env ## Start the dev stack with debuggers (attach from VS Code)
	pnpm docker:debug

ps: ## List containers
	$(COMPOSE) ps

logs: ## Follow logs (make logs s=api)
	$(COMPOSE) logs -f $(s)

exec-api: ## Open a shell in the running api container
	$(COMPOSE) exec api bash

exec-migrate: ## Open a shell in a one-off migrate container (it exits after migrating)
	$(COMPOSE) run --rm migrate bash

clean: ## Remove containers and volumes (DELETES the dev database)
	@read -p "Delete containers and volumes, including the dev database? [y/N] " a && [ "$$a" = y ]
	$(COMPOSE) down -v

## --- Database ---
contract: ## Regenerate contract.json and contract.d.ts after editing contract.prisma
	$(DB_RUN) contract:emit

migration-plan: ## Create a migration from contract changes
	$(DB_RUN) migration:plan

migration-status: ## Show applied and pending migrations
	$(DB_RUN) migration:status

migrate: ## Apply migrations
	$(COMPOSE) up migrate

migrate-debug: ## Apply migrations, paused until VS Code attaches on 9232
	pnpm docker:debug:migrate

seed: ## Seed example users (needs SEED_PASSWORD in .env and a migrated db)
	@./make/api.sh pnpm seed

hash-password: ## Print an argon2 hash for a password (prompts, or reads stdin)
	@./make/api.sh pnpm --silent hash-password

psql: ## Open psql in the dev database
	$(COMPOSE) exec db psql -U $${POSTGRES_USER:-app} -d $${POSTGRES_DB:-app}

## --- Production ---
prod-up: ## Build and start production (migrates first)
	$(PROD) up -d --build

prod-down: ## Stop production
	$(PROD) down

prod-logs: ## Follow production logs (make prod-logs s=api)
	$(PROD) logs -f $(s)

prod-migrate: ## Apply migrations in production
	$(PROD) up --build migrate
