import type { Sandbox } from 'e2b'
import { Elysia, t } from 'elysia'
import { env } from './env'
import { createSandbox, runCodex } from './sandbox'
const sessions = new Map<string, Sandbox>(),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app = new Elysia()
    .ws('/ws', {
      body: t.Union([
        t.Object({ credential: t.String(), type: t.Literal('init') }),
        t.Object({ prompt: t.String(), type: t.Literal('prompt') })
      ]),
      close: async ws => {
        const sandbox = sessions.get(ws.id)
        if (sandbox) {
          await sandbox.kill()
          sessions.delete(ws.id)
        }
      },
      message: async (ws, msg) => {
        if (msg.type === 'init') {
          ws.send({ message: 'preparing sandbox...', type: 'status' })
          const sandbox = await createSandbox(msg.credential)
          sessions.set(ws.id, sandbox)
          ws.send({ message: 'sandbox ready', type: 'status' })
          return
        }
        const sandbox = sessions.get(ws.id)
        if (!sandbox) {
          ws.send({ message: 'send init first', type: 'error' })
          return
        }
        const handle = await runCodex({
          onEvent: event => {
            ws.send({ event, type: 'event' })
          },
          prompt: msg.prompt,
          sandbox
        })
        await handle.wait()
        ws.send({ type: 'done' })
      }
    })
    .listen(env.PORT)
// eslint-disable-next-line no-console
console.log(`Server running on :${env.PORT}`)
export type App = typeof app
