# v0.2.69 (2026-02-12)

## Fixes
- Enhanced error handling and failover mechanism based on sub2api design
  - Added temporary unschedule for retryable errors (Google 400, timeout, etc.)
  - Added retry mechanism with exponential backoff on same account (max 3 retries)
  - Enhanced accountFallback.js with checkRetryableError function
  - Added tempUnschedulableUntil field for temporary account state
  - Updated auth.js to support temporary unschedule and retry logic
  - Updated chat.js to retry on same account before falling back
  - Added getRetryBackoffDelay for retry timing (1s, 2s, 4s... max 10s)
  - Preserved sticky session bindings during temporary unschedule

# v0.2.68 (2026-02-12)

## Features
- Implemented sticky session system based on sub2api design
  - Added open-sse/services/stickySession.js with session hash generation
  - Support for explicit session binding via metadata.user_id (session_xxx pattern)
  - Support for cache_control ephemeral content-based session tracking
  - Fallback to full content hash with request context for session isolation
  - In-memory session cache with 1-hour TTL
  - Automatic session cleanup and cache size management (1000 sessions max)
  - Session binding cleared when account becomes unavailable
- Enhanced proxy system with caching and health monitoring
  - Added open-sse/utils/proxyUtils.js for proxy URL parsing
  - Added open-sse/utils/proxyFetch.js with latency tracking
  - Support for HTTP/HTTPS/SOCKS4/SOCKS5 proxy protocols
  - Proxy health status caching with 60-second TTL
  - Proxy statistics and environment variable exposure
  - NO_PROXY bypass pattern support

## Fixes
- Updated auth.js to integrate sticky session selection
  - Added getProviderCredentialsWithSession for session-aware account selection
  - Added bindSession to bind successful requests to accounts
  - Modified markAccountUnavailable to clear session bindings
- Updated chat.js to use sticky session on first request attempt
  - Session binding occurs after successful response
  - First attempt checks for existing session binding

# v0.2.67 (2026-02-12)

## Features
- Added GLM 5 model support for iFlow provider
  - Added glm-5 model to iFlow (if) provider with thinking support
  - Added glm-5 model to GLM (glm/glm-cn) providers
  - Added pricing configuration for glm-5 model

## Fixes
- Fixed Gemini/Antigravity tool schema compatibility
  - Added prefill and enumTitles to unsupported schema constraints
  - Added logic to rename parametersJsonSchema to parameters
  - Added logic to remove root-level $id while preserving $id as property name
  - Prevents Gemini INVALID_ARGUMENT 400 errors from incompatible tool metadata

# v0.2.66 (2026-02-06)

## Features
- Added Cursor provider end-to-end support, including OAuth import flow and translator/executor integration (`137f315`, `0a026c7`).
- Enhanced auth/settings flow with `requireLogin` control and `hasPassword` state handling in dashboard/login APIs (`249fc28`).
- Improved usage/quota UX with richer provider limit cards, new quota table, and clearer reset/countdown display (`32aefe5`).
- Added model support for custom providers in UI/combos/model selection (`a7a52be`).
- Expanded model/provider catalog:
  - Codex updates: GPT-5.3 support, translation fixes, thinking levels (`127475d`)
  - Added Claude Opus 4.6 model (`e8aa3e2`)
  - Added MiniMax Coding (CN) provider (`7c609d7`)
  - Added iFlow Kimi K2.5 model (`9e357a7`)
  - Updated CLI tools with Droid/OpenClaw cards and base URL visibility improvements (`a2122e3`)
- Added auto-validation for provider API keys when saving settings (`b275dfd`).
- Added Docker/runtime deployment docs and architecture documentation updates (`5e4a15b`).

## Fixes
- Improved local-network compatibility by allowing auth cookie flow over HTTP deployments (`0a394d0`).
- Improved Antigravity quota/stream handling and Droid CLI compatibility behavior (`3c65e0c`, `c612741`, `8c6e3b8`).
- Fixed GitHub Copilot model mapping/selection issues (`95fd950`).
- Hardened local DB behavior with corrupt JSON recovery and schema-shape migration safeguards (`e6ef852`).
- Fixed logout/login edge cases:
  - Prevent unintended auto-login after logout (`49df3dc`)
  - Avoid infinite loading on failed `/api/settings` responses (`01c9410`)

# v0.2.56 (2026-02-04)

## Features
- Added Anthropic-compatible provider support across providers API/UI flow (`da5bdef`).
- Added provider icons to dashboard provider pages/lists (`60bd686`, `8ceb8f2`).
- Enhanced usage tracking pipeline across response handlers/streams with buffered accounting improvements (`a33924b`, `df0e1d6`, `7881db8`).

## Fixes
- Fixed usage conversion and related provider limits presentation issues (`e6e44ac`).

# v0.2.52 (2026-02-02)

## Features
- Implemented Codex Cursor compatibility and Next.js 16 proxy migration updates (`e9b0a73`, `7b864a9`, `1c6dd6d`).
- Added OpenAI-compatible provider nodes with CRUD/validation/test coverage in API and UI (`0a28f9f`).
- Added token expiration and key-validity checks in provider test flow (`686585d`).
- Added Kiro token refresh support in shared token refresh service (`f2ca6f0`).
- Added non-streaming response translation support for multiple formats (`63f2da8`).
- Updated Kiro OAuth wiring and auth-related UI assets/components (`31cc79a`).

## Fixes
- Fixed cloud translation/request compatibility path (`c7219d0`).
- Fixed Kiro auth modal/flow issues (`85b7bb9`).
- Included Antigravity stability fixes in translator/executor flow (`2393771`, `8c37b39`).

# v0.2.43 (2026-01-27)

## Fixes
- Fixed CLI tools model selection behavior (`a015266`).
- Fixed Kiro translator request handling (`d3dd868`).

# v0.2.36 (2026-01-19)

## Features
- Added the Usage dashboard page and related usage stats components (`3804357`).
- Integrated outbound proxy support in Open SSE fetch pipeline (`0943387`).
- Improved OpenAI compatibility and build stability across endpoint/profile/providers flows (`d9b8e48`).

## Fixes
- Fixed combo fallback behavior (`e6ca119`).
- Resolved SonarQube findings, Next.js image warnings, and build/lint cleanups (`7058b06`, `0848dd5`).

# v0.2.31 (2026-01-18)

## Fixes
- Fixed Kiro token refresh and executor behavior (`6b22b1f`, `1d481c2`).
- Fixed Kiro request translation handling (`eff52f7`, `da15660`).

# v0.2.27 (2026-01-15)

## Features
- Added Kiro provider support with OAuth flow (`26b61e5`).

## Fixes
- Fixed Codex provider behavior (`26b61e5`).

# v0.2.21 (2026-01-12)

## Changes
- README updates.
- Antigravity bug fixes.

# v0.2.32 (2025-02-12)

## Features
- Completed Chinese localization for Usage and Combos dashboard pages
  - Added missing translation keys for usage overview, tables, and all UI elements
  - Fixed ComboFormModal and ComboCard components to use useI18n hook properly
  - Updated time formatting to support parameter interpolation (e.g., "{minutes}m ago", "{hours}h ago")
  - Updated i18n locales.js with new translation keys

## Fixes
- Fixed socks5 protocol detection in proxyFetch for socks5:// URLs
  - In getAgent function, new URL().protocol returns "socks5:" with trailing colon
  - Changed protocol check from "socks5:" to "socks5" for correct matching
  - Added .replace(/:$/, "") to strip trailing colon from protocol

## Changes
- Updated i18n locales.js with new keys:
  - usage: overviewTitle, usageByModel, usageByAccount, usageByApiKey, unknownModel, unknownAccount, unknownKey, accountPlaceholder
  - combos: nameRequired, comboPlaceholder, noModelsAddedYet, failedToCreate, failedToUpdate
  - common: copyCombo
  - settings: proxyEnabled, proxyDisabled (for toggle display)

## Files Changed
- src/app/(dashboard)/dashboard/usage/page.js
- src/app/(dashboard)/dashboard/combos/page.js
- src/shared/i18n/locales.js
- open-sse/utils/proxyFetch.js
