.PHONY: help up down restart rebuild pull-rebuild logs dev build-web test clean

# Default target
.DEFAULT_GOAL := help

help: ## Tampilkan daftar perintah Makefile yang tersedia
	@echo ""
	@echo "Callcraft Workspace Management Commands"
	@echo "======================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

pull-rebuild: ## Pull git terbaru (origin main), rebuild Docker & restart service
	git fetch origin main
	git reset --hard origin/main
	docker builder prune -f || true
	docker image prune -f || true
	docker compose build
	docker compose up -d --force-recreate

rebuild: ## Bersihkan cache docker lama, rebuild Docker containers & restart service
	docker builder prune -f || true
	docker image prune -f || true
	docker compose build
	docker compose up -d --force-recreate

up: ## Jalankan Docker containers di background
	docker compose up -d

down: ## Hentikan semua Docker containers
	docker compose down

restart: ## Restart semua Docker containers
	docker compose restart

logs: ## Stream logs dari seluruh Docker containers
	docker compose logs -f

dev: ## Jalankan local dev server (API & Web secara bersamaan)
	bun run dev

build-web: ## Bersihkan cache .next & build Next.js production bundle
	rm -rf apps/web/.next
	bun run build:web

test: ## Jalankan seluruh test suite backend API
	.venv/bin/pytest apps/api/tests

clean: ## Bersihkan cache Next.js dan temporary files Python (__pycache__)
	rm -rf apps/web/.next
	rm -rf apps/web/out
	find . -type d -name "__pycache__" -exec rm -rf {} +
