/**
 * Working POC: Codex CLI in E2B sandbox with PTY streaming
 *
 * Prerequisites:
 *   - E2B_API_KEY in .env
 *   - ~/.codex/auth.json from `bunx @openai/codex login`
 *
 * Run: bun poc.ts
 */
import Sandbox from 'e2b'
import { readFileSync } from 'fs'
import { homedir } from 'os'

const E2B_KEY = process.env.E2B_API_KEY ?? ''
const CODEX_AUTH = readFileSync(`${homedir()}/.codex/auth.json`, 'utf8')

const sandbox = await Sandbox.create({ apiKey: E2B_KEY, timeoutMs: 300_000 })
const home = (await sandbox.commands.run('echo $HOME')).stdout.trim()

console.log('Sandbox:', sandbox.sandboxId)
console.log('Installing codex...')
await sandbox.commands.run('npm install -g @openai/codex', { timeoutMs: 120_000 })

console.log('Setting up auth + git...')
await sandbox.commands.run(`mkdir -p ${home}/.codex`)
await sandbox.files.write(`${home}/.codex/auth.json`, CODEX_AUTH)
await sandbox.commands.run(`cd ${home} && git init && git config user.email u@claw.dev && git config user.name claw`)

console.log('Spawning PTY...')
const decoder = new TextDecoder()
let trustHandled = false

const handle = await sandbox.pty.create({
  cols: 120,
  cwd: home,
  envs: { TERM: 'xterm-256color' },
  onData: async (data) => {
    const text = decoder.decode(data)
    process.stdout.write(text)
    if (!trustHandled && text.includes('Press enter to continue')) {
      trustHandled = true
      setTimeout(async () => {
        await sandbox.pty.sendInput(handle.pid, new TextEncoder().encode('\r'))
      }, 500)
    }
  },
  rows: 40,
  timeoutMs: 300_000,
})

const prompt = process.argv[2] ?? 'say hello and create a file called hello.txt with Hello World'
await sandbox.pty.sendInput(
  handle.pid,
  new TextEncoder().encode(
    `codex --dangerously-bypass-approvals-and-sandbox --search --no-alt-screen "${prompt}"\n`
  )
)

await new Promise(r => setTimeout(r, 120_000))

console.log('\n\n=== Checking results ===')
const ls = (await sandbox.commands.run(`ls -la ${home}/`)).stdout
console.log(ls)

await sandbox.kill()
console.log('Done')
process.exit(0)
