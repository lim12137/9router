# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

9Router is a local AI routing gateway built with Next.js. It acts as a smart middleware between CLI tools (Claude Code, Codex, Cursor, etc.) and multiple AI providers, providing automatic fallback, format translation, and usage tracking.

## Development Commands

```bash
# Install dependencies
npm install

# Development (with webpack, port 20128)
npm run dev

# Production build
npm run build

# Production start
npm run start

# Docker build
docker build -t 9router .

# Docker run (example)
docker run -d --name 9router -p 20128:20128 --env-file .env -v 9router-data:/app/data -v 9router-usage:/root/.9router 9router
```

## Architecture Overview

The codebase is split into two main directories:

- **`src/`** - Next.js app routes, dashboard UI, and high-level request handling
- **`open-sse/`** - Provider-agnostic SSE routing, translation, and execution core

### Request Flow

```
CLI Client → /v1/chat/completions (Next.js route)
    → src/sse/handlers/chat.js (model/combo resolution, account selection)
    → open-sse/handlers/chatCore.js (format detection, translation, executor dispatch)
    → open-sse/executors/[provider].js (provider-specific API calls)
    → open-sse/translator/ (response stream translation back to client format)
    → src/lib/usageDb.js (usage tracking)
```

### Key Directories and Responsibilities

**`src/app/api/`** - Next.js API routes
- `v1/*`, `v1beta/*` - OpenAI-compatible endpoints for CLI tools
- `providers*`, `provider-nodes*` - Provider/connection management
- `oauth/*` - OAuth/device-code flows for providers
- `combos*`, `keys*`, `models/alias` - Routing configuration
- `usage/*` - Usage stats and logs

**`src/sse/`** - SSE request orchestration
- `handlers/chat.js` - Combo handling, account selection loop
- `services/auth.js` - Credential selection from local DB
- `services/model.js` - Model string parsing (alias/combo resolution)

**`open-sse/`** - Provider-agnostic core (shared library)
- `handlers/chatCore.js` - Main request orchestration, format detection, translation dispatch
- `executors/*` - Provider-specific executors (antigravity, codex, cursor, gemini-cli, github, kiro, iflow, default)
- `translator/` - Request/response translation between formats (openai, claude, gemini, cursor, kiro)
- `services/provider.js` - Provider config, format detection
- `services/accountFallback.js` - Fallback logic based on status codes/errors
- `utils/stream.js`, `utils/streamHandler.js` - SSE stream handling and transformation

**`src/lib/`** - Persistence layer
- `localDb.js` - Main state DB (`${DATA_DIR}/db.json`) - providers, combos, aliases, keys, settings
- `usageDb.js` - Usage tracking (`~/.9router/usage.json`, `~/.9router/log.txt`)

## Important Patterns

### Model Resolution

Models are specified as `{provider}/{model}` (e.g., `cc/claude-opus-4-6`, `glm/glm-4.7`). The model string can also be:
- A combo name (resolved to sequence of models)
- An alias (resolved to target model)
- Direct provider model

Resolution happens in `src/sse/services/model.js` and `open-sse/services/model.js`.

### Fallback Hierarchy

Two levels of fallback:
1. **Account-level**: Multiple accounts per provider round-robin on failure
2. **Combo-level**: Multiple models in sequence; fails to next model on error

Fallback logic in `open-sse/services/accountFallback.js`.

### Format Translation

Source format is auto-detected from request body shape (OpenAI, Claude, Gemini). Target format is determined by provider config. Translation happens in `open-sse/translator/` with separate request/response translators.

### Provider Executors

- **Specialized**: `antigravity`, `codex`, `cursor`, `gemini-cli`, `github`, `kiro`, `iflow`
- **Default**: All others use `open-sse/executors/default.js`

Executors extend `open-sse/executors/base.js` and implement `execute()`, `refreshCredentials()`.

### Storage

- Main config: `${DATA_DIR}/db.json` (default `~/.9router/db.json`)
- Usage data: `~/.9router/usage.json`, `~/.9router/log.txt` (independent of DATA_DIR)
- Optional deep logs: `<repo>/logs/` when `ENABLE_REQUEST_LOGS=true`

## Environment Variables

Key variables (see `.env.example`):
- `JWT_SECRET` - Dashboard auth cookie signing
- `INITIAL_PASSWORD` - First login password (default: `123456`)
- `DATA_DIR` - Main DB location
- `PORT` - Service port (default: `20128`)
- `BASE_URL` / `CLOUD_URL` - Server-side URLs for cloud sync
- `API_KEY_SECRET` - HMAC secret for generated API keys
- `REQUIRE_API_KEY` - Enforce Bearer auth on `/v1/*` routes
- `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` - Outbound proxy for upstream calls

## Important Notes

1. The `open-sse/` directory is designed as a reusable library.
2. Usage DB (`usageDb.js`) uses `~/.9router` path, not `DATA_DIR`.
3. OAuth tokens auto-refresh via executor `refreshCredentials()`.
4. Next rewrites in `next.config.mjs` map `/v1/*` → `/api/v1/*`.
5. Stream format differences are handled in translator layer (SSE vs JSON).
