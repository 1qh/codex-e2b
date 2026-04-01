import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { ADMIN_SECRET, collectUntilDone, connectWs, credential, HTTP_URL, startServer, stopServer } from './helpers'
describe('e2e', () => {
  beforeAll(startServer)
  afterAll(stopServer)
  test('sandbox boots and accepts prompt', async () => {
    const ws = await connectWs(credential)
    ws.send(JSON.stringify({ prompt: 'create hello.txt with Hello World', type: 'prompt' }))
    const events = await collectUntilDone(ws),
      types = (events as { type: string }[]).map(e => e.type)
    expect(types).toContain('event')
    expect(types).toContain('done')
    ws.close()
  })
  test('prompt without init returns error', async () => {
    const ws = new WebSocket('ws://localhost:3099/ws')
    await new Promise<void>(resolve => {
      ws.addEventListener('open', () => {
        resolve()
      })
    })
    ws.send(JSON.stringify({ prompt: 'hello', type: 'prompt' }))
    const msg = await new Promise<string>(resolve => {
        ws.addEventListener('message', e => {
          resolve(String(e.data))
        })
      }),
      data = JSON.parse(msg) as { message: string; type: string }
    expect(data.type).toBe('error')
    expect(data.message).toBe('send init first')
    ws.close()
  })
  test('agent produces events for file task', async () => {
    const ws = await connectWs(credential)
    ws.send(JSON.stringify({ prompt: 'create test-verify.txt with exact content VERIFY_OK', type: 'prompt' }))
    const events = await collectUntilDone(ws),
      types = (events as { type: string }[]).map(e => e.type)
    expect(types).toContain('event')
    expect(types).toContain('done')
    expect(events.length).toBeGreaterThan(2)
    ws.close()
  })
  test('credential endpoint rejects without auth', async () => {
    const resp = await fetch(`${HTTP_URL}/credential`, {
      body: JSON.stringify({ credential: 'sk-test' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST'
    })
    expect(resp.status).toBe(401)
  })
  test('credential endpoint rejects wrong auth', async () => {
    const resp = await fetch(`${HTTP_URL}/credential`, {
      body: JSON.stringify({ credential: 'sk-test' }),
      headers: { Authorization: 'Bearer wrong', 'Content-Type': 'application/json' },
      method: 'POST'
    })
    expect(resp.status).toBe(401)
  })
  test('credential endpoint accepts correct auth', async () => {
    const resp = await fetch(`${HTTP_URL}/credential`, {
      body: JSON.stringify({ credential }),
      headers: { Authorization: `Bearer ${ADMIN_SECRET}`, 'Content-Type': 'application/json' },
      method: 'POST'
    })
    expect(resp.status).toBe(200)
    const body = (await resp.json()) as { updated: number }
    expect(body.updated).toBeGreaterThanOrEqual(0)
  })
  test('hot-swap credential and prompt still works', async () => {
    const ws = await connectWs(credential),
      resp = await fetch(`${HTTP_URL}/credential`, {
        body: JSON.stringify({ credential }),
        headers: { Authorization: `Bearer ${ADMIN_SECRET}`, 'Content-Type': 'application/json' },
        method: 'POST'
      }),
      body = (await resp.json()) as { updated: number }
    expect(body.updated).toBeGreaterThan(0)
    ws.send(JSON.stringify({ prompt: 'echo post-swap-ok', type: 'prompt' }))
    const events = await collectUntilDone(ws),
      types = (events as { type: string }[]).map(e => e.type)
    expect(types).toContain('done')
    ws.close()
  })
  test('multiple sessions can run concurrently', async () => {
    const [ws1, ws2] = await Promise.all([connectWs(credential), connectWs(credential)])
    ws1.send(JSON.stringify({ prompt: 'echo session1', type: 'prompt' }))
    ws2.send(JSON.stringify({ prompt: 'echo session2', type: 'prompt' }))
    const [events1, events2] = await Promise.all([collectUntilDone(ws1), collectUntilDone(ws2)])
    expect((events1 as { type: string }[]).map(e => e.type)).toContain('done')
    expect((events2 as { type: string }[]).map(e => e.type)).toContain('done')
    ws1.close()
    ws2.close()
  })
})
