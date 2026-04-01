# codex-e2b

Codex CLI (`@openai/codex`) running in E2B sandboxes (`e2b`), streamed to the browser via xterm.js (`@xterm/xterm`).

## Working directory

`~/claw/codex-e2b` — this is the active repo. Other experiments are archived at `~/claw/claw-exp` and `~/claw/pi-exp`.

## Key insight

PTY streaming gives full observability — every tool call, result, and thinking block is visible in the terminal output. No middleware, no event parsing, no black boxes.

## Codex CLI flags

```
codex --dangerously-bypass-approvals-and-sandbox --search --no-alt-screen "prompt"
```

- `--dangerously-bypass-approvals-and-sandbox` — skip all approvals (E2B IS the sandbox)
- `--search` — enable native GPT web search via OpenAI Responses API
- `--no-alt-screen` — inline TUI mode, preserves scrollback

## E2B sandbox setup sequence

1. `Sandbox.create({ apiKey, timeoutMs: 300_000 })`
2. `sandbox.commands.run('npm install -g @openai/codex', { timeoutMs: 120_000 })`
3. Copy `~/.codex/auth.json` via `sandbox.files.write()`
4. `sandbox.commands.run('git init && git config ...')` (Codex requires git)
5. `sandbox.pty.create({ cols, rows, onData, envs: { TERM: 'xterm-256color' } })`
6. `sandbox.pty.sendInput(pid, 'codex --flags "prompt"\n')`
7. Auto-accept trust prompt: detect “Press enter to continue” in onData, send `\r`

## Auth

- Codex uses OAuth stored in `~/.codex/auth.json` (from `bunx @openai/codex login`)
- Token refreshes needed — access tokens expire
- In E2B: copy the auth.json file into sandbox via `sandbox.files.write()`

## Stack

- **bun** runtime, no npm/yarn
- **Next.js 16** frontend (React 19, Turbopack)
- **Elysia** WebSocket server for PTY bridge (separate port 3001)
- **@xterm/xterm 6** terminal renderer
- **@xterm/addon-fit** auto-resize
- **better-auth** authentication
- **Drizzle + TimescaleDB** persistence
- **t3-env** validated env vars
- **lintmax** strict linting
- **lib/ui** from noboil (shadcn, @a/ui workspace package)
- **Tailwind v4** with OKLCH dark theme

## Constraints

- Arrow functions only, exports at end of file
- No comments, no `any`, no `as`, no `!`
- Single `.env` at root, fail fast via t3-env
- `bun clean` on pre-commit hook
- Test before ship — real e2e tests with E2B
- Never hardcode values, use env vars
- lib/ui is read-only (synced from noboil)

## Commit rules

- NEVER mention AI tooling, Claude, or AI SDK in commit messages
- No Co-Authored-By lines
- Commit messages describe what changed, not how

## Build plan

See PLAN.md for phases. Phase 1 = terminal in browser (MVP).

## Brainstorm docs

Applicable docs from experiments preserved in `brainstorm/`:

- `vision.md` — fire-and-forget agent-native SaaS concept
- `boundaries.md` — what this is and is NOT good for
- `lessons-learned.md` — what we learned from previous experiments and why we chose this stack
