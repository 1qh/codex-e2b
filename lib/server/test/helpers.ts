import type { Subprocess } from 'bun'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
const PORT = 3099,
  WS_URL = `ws://localhost:${PORT}/ws`,
  HTTP_URL = `http://localhost:${PORT}`,
  ADMIN_SECRET = 'test-secret',
  credential = readFileSync(`${homedir()}/.codex/auth.json`, 'utf8')
let server: null | Subprocess = null
const waitForServer = async () => {
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      await Bun.sleep(200)
      try {
        // eslint-disable-next-line no-await-in-loop
        await fetch(HTTP_URL)
        return
      } catch {
        // biome-ignore lint/suspicious/noEmptyBlockStatements: polling
      }
    }
  },
  startServer = async () => {
    server = Bun.spawn(['bun', 'run', 'src/index.ts'], {
      cwd: `${import.meta.dir}/..`,
      env: {
        ...process.env,
        ADMIN_SECRET,
        PORT: String(PORT)
      },
      stderr: 'inherit',
      stdout: 'inherit'
    })
    await Promise.race([
      waitForServer(),
      Bun.sleep(10_000).then(() => {
        throw new Error('Server did not start')
      })
    ])
  },
  stopServer = () => {
    server?.kill()
    server = null
  },
  connectWs = async (cred: string) =>
    new Promise<WebSocket>((resolve, reject) => {
      const ws = new WebSocket(WS_URL)
      ws.addEventListener('open', () => {
        ws.send(JSON.stringify({ credential: cred, type: 'init' }))
      })
      ws.addEventListener('message', e => {
        if (String(e.data).includes('ready')) resolve(ws)
      })
      ws.addEventListener('error', reject)
      setTimeout(() => {
        reject(new Error('WS connect timeout'))
      }, 120_000)
    }),
  collectUntilDone = async (ws: WebSocket) =>
    new Promise<unknown[]>((resolve, reject) => {
      const events: unknown[] = [],
        handler = (e: MessageEvent) => {
          const d = JSON.parse(String(e.data)) as { type: string }
          events.push(d)
          if (d.type === 'done') {
            ws.removeEventListener('message', handler)
            resolve(events)
          }
        }
      ws.addEventListener('message', handler)
      setTimeout(() => {
        reject(new Error('collect timeout'))
      }, 300_000)
    })
export { ADMIN_SECRET, collectUntilDone, connectWs, credential, HTTP_URL, startServer, stopServer }
