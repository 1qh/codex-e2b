import type { Sandbox } from 'e2b'
import { Sandbox as SandboxClass } from 'e2b'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { env } from './env'
const codexAuth = readFileSync(`${homedir()}/.codex/auth.json`, 'utf8'),
  createSandbox = async () => {
    const sandbox = await SandboxClass.create({
        apiKey: env.E2B_API_KEY,
        timeoutMs: 300_000
      }),
      { stdout } = await sandbox.commands.run('echo $HOME'),
      home = stdout.trim()
    await sandbox.commands.run(`mkdir -p ${home}/.codex`)
    await sandbox.files.write(`${home}/.codex/auth.json`, codexAuth)
    await sandbox.files.write(`${home}/.codex/config.toml`, `[projects."${home}"]\ntrust_level = "trusted"\n`)
    await sandbox.commands.run(`cd ${home} && git init && git config user.email u@claw.dev && git config user.name claw`)
    await sandbox.commands.run('npm install -g @openai/codex', {
      timeoutMs: 120_000
    })
    return { home, sandbox }
  },
  runCodex = async (opts: { home: string; onEvent: (event: unknown) => void; prompt: string; sandbox: Sandbox }) => {
    const handle = await opts.sandbox.commands.run(
      `cd ${opts.home} && codex exec --dangerously-bypass-approvals-and-sandbox --json "${opts.prompt.replaceAll('"', String.raw`\"`)}"`,
      {
        background: true,
        onStdout: data => {
          for (const line of data.split('\n').filter(Boolean))
            try {
              opts.onEvent(JSON.parse(line))
            } catch {
              // Incomplete JSONL line
            }
        },
        timeoutMs: 300_000
      }
    )
    return handle
  }
export { createSandbox, runCodex }
