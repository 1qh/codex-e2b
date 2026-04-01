# codex-e2b

Codex CLI (`@openai/codex`) running in E2B sandboxes, streamed to the browser via structured JSONL events.

## Working directory

`~/claw/codex-e2b` — this is the active repo. Other experiments are archived at `~/claw/claw-exp` and `~/claw/pi-exp`.

## Key insight

`codex exec --json` gives structured events (agent_message, file_change, command_execution, usage) over JSONL. PTY streaming is kept as a fallback for raw terminal view but exec is the primary mode.

## Codex CLI

```
codex exec --dangerously-bypass-approvals-and-sandbox --json "prompt"
```

- `exec` — non-interactive, JSONL event stream
- `--dangerously-bypass-approvals-and-sandbox` — skip all approvals (E2B IS the sandbox)
- `--json` — structured events instead of TUI
- Trust prompt bypassed via `config.toml` with `trust_level = "trusted"`

## E2B sandbox

Custom template `codex-sandbox` with bun + codex + git pre-baked. Boots in ~1.2s.

Setup at runtime is just one `files.write` for auth.json. Everything else is in the template:

- bun at `/home/user/.bun/bin/`
- codex globally installed
- git initialized at `/home/user`
- `config.toml` with trust_level = “trusted”

Home is always `/home/user` — hardcoded, no lookup needed.

## Auth

- User provides credential on WS init: API key (`sk-...`) or OAuth auth.json content
- API keys get wrapped: `{"OPENAI_API_KEY": "sk-...", "auth_mode": "api-key"}`
- OAuth auth.json passed through directly
- Written to `/home/user/.codex/auth.json` via `sandbox.files.write()`
- Hot-swap via `POST /credential` with Bearer auth — rewrites auth.json in all live sandboxes
- Each `codex exec` reads auth.json fresh — swap is invisible to users

## WS protocol

```
→ { type: "init", credential: "sk-..." }     // or auth.json content
← { type: "status", message: "preparing..." }
← { type: "status", message: "sandbox ready" }
→ { type: "prompt", prompt: "create hello.txt" }
← { type: "event", event: { type: "item.completed", item: {...} } }
← { type: "done" }
```

## Stack

- **bun** runtime, no npm/yarn
- **Next.js 16** frontend (React 19, Turbopack)
- **Elysia** WebSocket server (port 3001)
- **E2B** Firecracker micro-VMs with custom template
- **t3-env** validated env vars (E2B_API_KEY, ADMIN_SECRET, PORT)
- **lintmax** strict linting (biome + oxlint + eslint + prettier)
- **lib/ui** from noboil (shadcn, @a/ui workspace package, read-only)
- **Tailwind v4** with OKLCH dark theme

## Constraints

- Arrow functions only, exports at end of file
- No comments, no `any`, no `as`, no `!`
- Single `.env` at root, fail fast via t3-env
- Pre-commit hook: `bun clean && bun i && bun fix`
- Test before ship — real e2e tests with E2B sandboxes
- Never hardcode values, use env vars
- lib/ui is read-only (synced from noboil)
- Minimal DOM — no redundant wrappers, no nested divs, semantic elements

## Working rule

Never report code as done without testing it yourself first. Run it, verify the output, fix any issues. Only then report what works, what the user can run to see it in action, and how to interpret the results. No blind coding — proof before progress.

## Commit rules

- NEVER mention AI tooling, Claude, or AI SDK in commit messages
- No Co-Authored-By lines
- Commit messages describe what changed, not how

## Build plan

See PLAN.md for phases and lessons learned. Phase 1 MVP is complete.

## Brainstorm docs

Applicable docs from experiments preserved in `brainstorm/`:

- `vision.md` — fire-and-forget agent-native SaaS concept
- `boundaries.md` — what this is and is NOT good for
- `lessons-learned.md` — what we learned from previous experiments and why we chose this stack
