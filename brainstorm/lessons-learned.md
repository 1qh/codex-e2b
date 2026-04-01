# Lessons Learned from Experiments

## claw-exp: OpenClaw Gateway

**What we tried:** OpenClaw as the agent runtime, HTTP `/v1/chat/completions` for chat, WS operator connection for events, TigerFS for filesystem persistence.

**What we learned:**
- OpenClaw's HTTP endpoint doesn't emit tool events — only the final text response
- WS operator connection gets `session.tool` events but without tool result content (only name + meta)
- JSONL transcripts only store assistant responses, not tool calls or results
- TigerFS v0.6.0 moved to `tigerfs` schema, broke FUSE writes, required `--insecure-no-ssl`
- The full audit chain (user → tools → results → reasoning → response) is impossible through the gateway
- OpenClaw is a wrapper around `pi-agent-core` + `pi-ai` — the engine is independent

**Key insight:** The gateway was the bottleneck, not the engine. The observability we needed existed in `pi-agent-core` but OpenClaw's gateway filtered it out.

## pi-exp: pi-coding-agent Direct

**What we tried:** `pi-coding-agent` and `pi-agent-core` directly, bypassing OpenClaw.

**What we learned:**
- `pi-agent-core` has full event system (`tool_execution_start/end` with actual result content)
- `pi-coding-agent` provides bash/read/write/edit tools out of the box
- Anthropic OAuth works for Claude subscription (no API key needed)
- Qwen3.5 thinking tokens break `pi-ai`'s openai-completions provider (pi-ai bug)
- `createAgentSession`'s tool calling with Anthropic — second turn after tool results returns empty
- React 19 strict mode broke dockview API (`stateRef.current` reset on remount cleanup)
- E2B sandbox works with `pi-coding-agent` — file creation verified

**Key insight:** Pre-1.0 library (6 minor versions in 13 days), zero third-party adoption. Tool calling integration was fragile.

## Decision: Codex CLI + E2B

**Why Codex over pi:**
- OpenAI backing = trust, stability, model quality (GPT 5.4)
- Native `--search` flag for web search (no custom tool needed)
- `--dangerously-bypass-approvals-and-sandbox` designed for externally sandboxed environments
- `--no-alt-screen` for inline TUI streaming
- MCP support for custom tools if needed
- Session resume/fork built in
- Pro subscription = no API costs

**Why E2B:**
- Firecracker micro-VMs = full Linux per user with hardware isolation
- Per-second billing (~$0.10/hr), pause when idle
- Volumes for persistent storage across sessions
- Open source, self-hostable
- Used by Perplexity, Hugging Face, Manus, Groq

**Why PTY streaming (not library API or structured events):**
- The TUI IS the observability — every tool call, result, thinking block is visible
- No parsing, no middleware, no event translation
- xterm.js renders it exactly as the terminal shows it
- Agent-agnostic — swap Codex for any other CLI agent
- Bidirectional — user types in browser, agent sees it in the sandbox
