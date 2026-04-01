# codex-e2b

Codex CLI running in E2B sandboxes, streamed to the browser via xterm.js.

## Stack

- **Codex CLI** — `@openai/codex` with `--dangerously-bypass-approvals-and-sandbox --search --no-alt-screen`
- **E2B** — Firecracker micro-VM per user, PTY for terminal I/O
- **Next.js** — frontend (React, shadcn, Tailwind)
- **Elysia** — WebSocket server bridging browser ↔ E2B PTY
- **xterm.js** — terminal renderer in browser
- **better-auth** — authentication (Google OAuth, email/password)
- **Drizzle + TimescaleDB** — sessions, user data
- **t3-env** — validated env vars

## Validated

- [x] Codex CLI installs in E2B sandbox
- [x] OAuth auth via `~/.codex/auth.json` works in E2B
- [x] Trust prompt bypassed via `config.toml` trust_level
- [x] `--search` enables native GPT web search
- [x] `--dangerously-bypass-approvals-and-sandbox` skips approvals (E2B is the sandbox)
- [x] `--no-alt-screen` streams inline TUI (poc.ts)
- [x] `codex exec --json` streams structured JSONL events (poc-exec.ts)
- [x] PTY streams 743KB of TUI output
- [x] File creation works in sandbox
- [x] GPT 5.4 via OpenAI Pro subscription

## Build Order

### Phase 1 — Exec events in browser (MVP)

1. Elysia WS server: spawn E2B sandbox, install Codex, stream exec JSONL events
2. Next.js page with chat UI rendering agent messages + file changes
3. e2e test: connect → prompt → verify file created
4. PTY live feed (xterm.js) as optional “watch mode” later

### Phase 2 — Auth + persistence

6. better-auth (Google OAuth + email/password)
7. Drizzle schema: users, sessions, sandbox mappings
8. One sandbox per user, resume on reconnect
9. E2B volumes for persistent workspace

### Phase 3 — Polish

10. Sandbox lifecycle (pause on disconnect, resume on reconnect)
11. Multiple sessions per user
12. idecn file explorer for sandbox filesystem
13. Mobile responsive (PWA)

## Constraints

- bun only
- lintmax strict linting
- lib/ui from noboil (shadcn, zero radix)
- Single .env at root, t3-env validation
- Arrow functions, exports at end
- No comments, no any, no as
- Test before ship
