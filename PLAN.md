# codex-e2b

Codex CLI running in E2B sandboxes, streamed to the browser.

## Stack

- **Codex CLI** — `@openai/codex` via `codex exec --json` (structured JSONL events)
- **E2B** — Firecracker micro-VM per user, custom template `codex-sandbox`
- **Next.js 16** — frontend (React 19, shadcn, Tailwind v4)
- **Elysia** — WebSocket server bridging browser ↔ E2B sandbox
- **t3-env** — validated env vars

## Validated

- [x] Codex CLI installs in E2B sandbox
- [x] OAuth auth via `~/.codex/auth.json` works in E2B
- [x] Trust prompt bypassed via `config.toml` trust_level (no workaround needed)
- [x] `codex exec --json` streams structured JSONL events (thread, turn, item, usage)
- [x] PTY streams raw TUI output via `--no-alt-screen` (poc.ts, kept as fallback)
- [x] Custom E2B template with bun + codex pre-baked (~1.2s boot)
- [x] Hot-swap credentials across all live sandboxes via POST /credential
- [x] Concurrent multi-session support
- [x] File creation verified end-to-end
- [x] GPT 5.4 via OpenAI Pro subscription

## Phase 1 — Exec events in browser (MVP)

- [x] Elysia WS server with structured message protocol (init/prompt)
- [x] Custom E2B template: bun + codex + git + trust config pre-baked
- [x] Sandbox ready in ~1.2s (was 90s before template)
- [x] Chat UI: agent messages, file changes, command executions
- [x] User-provided credentials: API key (sk-...) or OAuth auth.json
- [x] Admin credential hot-swap: POST /credential with Bearer auth
- [x] 8 e2e tests passing: boot, prompt, events, auth, hot-swap, concurrency
- [ ] PTY live feed (xterm.js) as optional “watch mode”

## Phase 2 — Auth + persistence

- [ ] better-auth (Google OAuth + email/password)
- [ ] Drizzle schema: users, sessions, sandbox mappings
- [ ] One sandbox per user, resume on reconnect
- [ ] E2B volumes for persistent workspace

## Phase 3 — Polish

- [ ] Sandbox lifecycle (pause on disconnect, resume on reconnect)
- [ ] Multiple sessions per user
- [ ] File explorer for sandbox filesystem
- [ ] Mobile responsive (PWA)

## Lessons learned

### exec > PTY for MVP

`codex exec --json` gives structured events (agent_message, file_change, command_execution, turn usage). PTY gives raw ANSI — great for a terminal viewer, useless for building UI on top. Exec covers chat, notifications, and usage tracking. PTY is additive for “watch mode” later.

### Trust prompt bypass

`config.toml` with `trust_level = "trusted"` for the home directory eliminates the interactive trust prompt entirely. No need for PTY detection + `\r` workaround.

### Custom template eliminates cold start

Pre-baking bun + codex + git into an E2B template dropped sandbox boot from 90s (npm install on every connect) to ~1.2s (just VM boot + single file write). No warm pool complexity needed.

### Hardcode /home/user

E2B base image always uses `/home/user`. Skipping the `echo $HOME` round-trip saves ~500ms per sandbox create.

### bun > npm in sandbox

`bun install -g @openai/codex` = 1.8s vs `npm install -g` = 4s. 2x faster, and bun is already the project runtime.

### Credential architecture

- `OPENAI_API_KEY` env var works but leaks in `ps aux` — use `files.write` to auth.json instead
- `codex exec` reads auth.json fresh per invocation — hot-swap just rewrites the file
- Support both API key (auto-wrapped) and OAuth auth.json (pass-through)
- Admin endpoint with Bearer auth for fleet-wide credential rotation

### Pre-commit = bun clean && bun i && bun fix

Catches sort-package-json, biome, oxlint, eslint, prettier, tsc, and turbo build in one gate. Tracked via `.githooks/` + `prepare` script.

## Constraints

- bun only (runtime, package manager, test runner)
- lintmax strict linting (biome + oxlint + eslint + prettier)
- lib/ui from noboil (shadcn, @a/ui workspace package, read-only)
- Single .env at root, t3-env validation, fail fast
- Arrow functions, exports at end of file
- No comments, no any, no as
- Test before ship — real e2e tests with E2B sandboxes
