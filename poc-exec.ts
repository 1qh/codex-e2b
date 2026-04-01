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
console.log('Setting up auth + git + config...')
await sandbox.commands.run(`mkdir -p ${home}/.codex`)
await sandbox.files.write(`${home}/.codex/auth.json`, CODEX_AUTH)
await sandbox.files.write(`${home}/.codex/config.toml`, `[projects."${home}"]\ntrust_level = "trusted"\n`)
await sandbox.commands.run(`cd ${home} && git init && git config user.email u@claw.dev && git config user.name claw`)
console.log('Running codex exec --json...')
const result = await sandbox.commands.run(
  `cd ${home} && codex exec --dangerously-bypass-approvals-and-sandbox --json "say hello and create a file called hello.txt with Hello World"`,
  { timeoutMs: 300_000 }
)
console.log('\n=== STDOUT (JSONL events) ===')
for (const line of result.stdout.split('\n').filter(Boolean))
  try {
    const event: unknown = JSON.parse(line)
    console.log(JSON.stringify(event, null, 2))
  } catch {
    console.log('RAW:', line)
  }
if (result.stderr) {
  console.log('\n=== STDERR ===')
  console.log(result.stderr)
}
console.log('\n=== Files ===')
const ls = await sandbox.commands.run(`ls -la ${home}/`)
console.log(ls.stdout)
await sandbox.kill()
console.log('Done')
