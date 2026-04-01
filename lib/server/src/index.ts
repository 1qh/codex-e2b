import type { Sandbox } from 'e2b'
import { Elysia, t } from 'elysia'
import { env } from './env'
import { createSandbox, runCodex } from './sandbox'
interface WsData {
  home: string
  sandbox: Sandbox
}
// eslint-disable-next-line no-console
console.log('Pre-warming sandbox...')
const warmPool: WsData[] = [],
  waiters: ((data: WsData) => void)[] = [],
  replenish = () => {
    ;(async () => {
      try {
        const data = await createSandbox(),
          waiter = waiters.shift()
        if (waiter) waiter(data)
        else warmPool.push(data)
        // eslint-disable-next-line no-console
        console.log('Sandbox warm and ready')
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
      }
    })()
  },
  acquire = (): Promise<WsData> | WsData => {
    const warm = warmPool.pop()
    if (warm) {
      replenish()
      return warm
    }
    return new Promise<WsData>(resolve => {
      waiters.push(resolve)
    })
  }
replenish()
const sandboxes = new Map<string, WsData>(),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app = new Elysia()
    .ws('/ws', {
      body: t.Object({
        prompt: t.String()
      }),
      close: async ws => {
        const data = sandboxes.get(ws.id)
        if (data) {
          await data.sandbox.kill()
          sandboxes.delete(ws.id)
        }
      },
      message: async (ws, { prompt }) => {
        const data = sandboxes.get(ws.id)
        if (!data) {
          ws.send({ message: 'sandbox not ready', type: 'error' })
          return
        }
        const handle = await runCodex({
          home: data.home,
          onEvent: event => {
            ws.send({ event, type: 'event' })
          },
          prompt,
          sandbox: data.sandbox
        })
        await handle.wait()
        ws.send({ type: 'done' })
      },
      open: async ws => {
        ws.send({ message: 'preparing sandbox...', type: 'status' })
        const data = await acquire()
        sandboxes.set(ws.id, data)
        ws.send({ message: 'sandbox ready', type: 'status' })
      }
    })
    .listen(env.PORT)
// eslint-disable-next-line no-console
console.log(`Server running on :${env.PORT}`)
export type App = typeof app
