import type { Sandbox } from 'e2b'
import { Sandbox as SandboxClass } from 'e2b'
import { env } from './env'
const HOME = '/home/user',
  AUTH_PATH = `${HOME}/.codex/auth.json`,
  toAuthJson = (credential: string) =>
    credential.startsWith('sk-') ? JSON.stringify({ OPENAI_API_KEY: credential, auth_mode: 'api-key' }) : credential,
  createSandbox = async (credential: string) => {
    const sandbox = await SandboxClass.create('codex-sandbox', {
      apiKey: env.E2B_API_KEY,
      timeoutMs: 300_000
    })
    await sandbox.files.write(AUTH_PATH, toAuthJson(credential))
    return sandbox
  },
  updateCredential = async (sandbox: Sandbox, credential: string) => {
    await sandbox.files.write(AUTH_PATH, toAuthJson(credential))
  },
  runCodex = async (opts: { onEvent: (event: unknown) => void; prompt: string; sandbox: Sandbox }) => {
    const handle = await opts.sandbox.commands.run(
      `PATH=${HOME}/.bun/bin:$PATH codex exec --dangerously-bypass-approvals-and-sandbox --json "${opts.prompt.replaceAll('"', String.raw`\"`)}"`,
      {
        background: true,
        cwd: HOME,
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
export { createSandbox, runCodex, updateCredential }
