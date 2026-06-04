.PHONY: dev setup install build clean test help check-prereqs

# Load .env if it exists
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

# ─── Main commands ───────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

setup: check-prereqs install build ## Install deps + build server + extension
	@echo ""
	@echo "  ✓ Setup complete — load dist/ in chrome://extensions"

check-prereqs: ## Validate required tools are installed
	@echo "  Checking prerequisites..."
	@command -v node >/dev/null 2>&1 || { echo "  ✗ Node.js not found. Install Node 18+: https://nodejs.org/"; exit 1; }
	@NODE_MAJOR=$$(node -e "console.log(process.versions.node.split('.')[0])"); \
	if [ "$$NODE_MAJOR" -lt 18 ] 2>/dev/null; then \
		echo "  ✗ Node.js $$(node --version) is too old. Need 18+: https://nodejs.org/"; exit 1; \
	fi
	@echo "  ✓ Node $$(node --version)"

install: ## Install all dependencies (extension + server)
	@echo "  Installing dependencies..."
	@npm install --silent 2>/dev/null || true
	@cd server && npm install --silent 2>/dev/null || true
	@echo "  ✓ Dependencies installed"

build: ## Build server (MCP/CLI/relay) + extension
	@echo "  Building server..."
	@cd server && npm run build 2>&1 | tail -1
	@echo "  Building extension..."
	@npm run build 2>&1 | tail -1
	@echo "  ✓ Build complete — load dist/ in chrome://extensions"

dev: ## Rebuild the server on change (tsc --watch)
	@cd server && npm run dev

test: ## Run server tests
	@cd server && npx vitest run

clean: ## Remove build artifacts
	@rm -rf server/dist
	@echo "  ✓ Cleaned build artifacts"
