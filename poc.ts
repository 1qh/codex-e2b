/* eslint-disable no-console */
// biome-ignore-all lint/style/noProcessEnv: poc script
import { Sandbox } from 'e2b'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
const E2B_KEY = process.env.E2B_API_KEY ?? '',
  CODEX_AUTH = readFileSync(`${homedir()}/.codex/auth.json`, 'utf8'),
  sandbox = await Sandbox.create({ apiKey: E2B_KEY, timeoutMs: 300_000 }),
  homeResult = await sandbox.commands.run('echo $HOME'),
  home = homeResult.stdout.trim()
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
    onData: (data: Uint8Array) => {
      const text = decoder.decode(data)
      process.stdout.write(text)
      if (!trustHandled && text.includes('Press enter to continue')) {
        trustHandled = true
        setTimeout(() => {
          sandbox.pty.sendInput(handle.pid, new TextEncoder().encode('\r')).catch(console.error)
        }, 500)
      }
    },
    rows: 40,
    timeoutMs: 300_000
  }),
  prompt = process.argv[2] ?? 'say hello and create a file called hello.txt with Hello World'
await sandbox.pty.sendInput(
  handle.pid,
  new TextEncoder().encode(`codex --dangerously-bypass-approvals-and-sandbox --search --no-alt-screen "${prompt}"\n`)
)
await new Promise<void>(resolve => {
  setTimeout(resolve, 120_000)
})
console.log('\n\n=== Checking results ===')
const lsResult = await sandbox.commands.run(`ls -la ${home}/`)
console.log(lsResult.stdout)
await sandbox.kill()
console.log('Done')
