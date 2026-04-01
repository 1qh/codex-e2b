import type { Sandbox } from 'e2b'
import { Sandbox as SandboxClass } from 'e2b'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { env } from './env'
const codexAuth = readFileSync(`${homedir()}/.codex/auth.json`, 'utf8'),
  createSandbox = async () => {
    const sandbox = await SandboxClass.create('codex-sandbox', {
        apiKey: env.E2B_API_KEY,
        timeoutMs: 300_000
      }),
      { stdout } = await sandbox.commands.run('echo $HOME'),
      home = stdout.trim()
    await sandbox.commands.run(`mkdir -p ${home}/.codex`)
    await sandbox.files.write(`${home}/.codex/auth.json`, codexAuth)
    await sandbox.files.write(`${home}/.codex/config.toml`, `[projects."${home}"]\ntrust_level = "trusted"\n`)
    return { home, sandbox }
  },
  runCodex = async (opts: { home: string; onEvent: (event: unknown) => void; prompt: string; sandbox: Sandbox }) => {
    const handle = await opts.sandbox.commands.run(
      `PATH=${opts.home}/.bun/bin:$PATH codex exec --dangerously-bypass-approvals-and-sandbox --json "${opts.prompt.replaceAll('"', String.raw`\"`)}"`,
      {
        background: true,
        cwd: opts.home,
        onStdout: data => {
          for (const line of data.split('\n').filter(Boolean))
            try {
              opts.onEvent(JSON.parse(line))
            } catch {
              // biome-ignore lint/suspicious/noEmptyBlockStatements: incomplete JSONL
            }
        },
        timeoutMs: 300_000
      }
    )
    return handle
  }
export { createSandbox, runCodex }
