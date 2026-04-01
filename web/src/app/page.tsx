'use client'
import { Badge } from '@a/ui/components/badge'
import { Button } from '@a/ui/components/button'
import { Input } from '@a/ui/components/input'
import { ScrollArea } from '@a/ui/components/scroll-area'
import { useCallback, useEffect, useRef, useState } from 'react'
interface CodexEvent {
  item?: {
    aggregated_output?: string
    changes?: { kind: string; path: string }[]
    command?: string
    text?: string
    type: string
  }
  type: string
}
interface Message {
  content: string
  id: string
  role: 'agent' | 'command' | 'file' | 'status' | 'user'
}
const WS_URL = 'ws://localhost:3001/ws'
let msgId = 0
const nextId = () => {
    msgId += 1
    return String(msgId)
  },
  MessageBubble = ({ message }: { message: Message }) => {
    if (message.role === 'user')
      return <p className='self-end rounded-lg bg-primary px-3 py-2 text-primary-foreground'>{message.content}</p>
    if (message.role === 'status') return <p className='text-center text-xs text-muted-foreground'>{message.content}</p>
    if (message.role === 'file')
      return (
        <p className='text-sm'>
          <Badge variant='outline'>file</Badge> {message.content}
        </p>
      )
    if (message.role === 'command')
      return <pre className='overflow-x-auto rounded bg-muted p-2 text-xs'>{message.content}</pre>
    return <p className='rounded-lg bg-muted px-3 py-2 text-sm'>{message.content}</p>
  },
  parseEvent = (evt: CodexEvent): Message[] => {
    if (evt.type === 'item.completed' && evt.item?.type === 'agent_message' && evt.item.text)
      return [{ content: evt.item.text, id: nextId(), role: 'agent' }]
    if (evt.type === 'item.completed' && evt.item?.type === 'file_change' && evt.item.changes)
      return evt.item.changes.map(c => ({ content: `${c.kind}: ${c.path}`, id: nextId(), role: 'file' as const }))
    if (evt.type === 'item.completed' && evt.item?.type === 'command_execution')
      return [
        {
          content: `$ ${evt.item.command ?? ''}\n${evt.item.aggregated_output ?? ''}`.trim(),
          id: nextId(),
          role: 'command'
        }
      ]
    return []
  }
type Status = 'closed' | 'init' | 'ready' | 'running'
const useSocket = (credential: string) => {
    const [messages, setMessages] = useState<Message[]>([]),
      [status, setStatus] = useState<Status>(credential ? 'init' : 'closed'),
      wsRef = useRef<null | WebSocket>(null),
      scrollRef = useRef<HTMLDivElement>(null),
      addMessages = useCallback((...msgs: Message[]) => {
        setMessages(prev => [...prev, ...msgs])
        queueMicrotask(() => {
          scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
        })
      }, [])
    useEffect(() => {
      if (!credential) return
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      const onOpen = () => {
          ws.send(JSON.stringify({ credential, type: 'init' }))
          addMessages({ content: 'Preparing sandbox...', id: nextId(), role: 'status' })
        },
        onMessage = (e: MessageEvent) => {
          const data = JSON.parse(String(e.data)) as { event?: CodexEvent; message?: string; type: string }
          if (data.type === 'status' && data.message?.includes('ready')) {
            setStatus('ready')
            addMessages({ content: 'Ready.', id: nextId(), role: 'status' })
          }
          if (data.type === 'event' && data.event) addMessages(...parseEvent(data.event))
          if (data.type === 'done') setStatus('ready')
        },
        onClose = () => {
          setStatus('closed')
        }
      ws.addEventListener('open', onOpen)
      ws.addEventListener('message', onMessage)
      ws.addEventListener('close', onClose)
      return () => {
        ws.removeEventListener('open', onOpen)
        ws.removeEventListener('message', onMessage)
        ws.removeEventListener('close', onClose)
        ws.close()
      }
    }, [addMessages, credential])
    const send = useCallback(
      (prompt: string) => {
        addMessages({ content: prompt, id: nextId(), role: 'user' })
        wsRef.current?.send(JSON.stringify({ prompt, type: 'prompt' }))
        setStatus('running')
      },
      [addMessages]
    )
    return { messages, scrollRef, send, status }
  },
  Page = () => {
    const [credential, setCredential] = useState(''),
      [started, setStarted] = useState(false),
      active = started ? credential : '',
      { messages, scrollRef, send, status } = useSocket(active),
      [input, setInput] = useState(''),
      handleSubmit = () => {
        if (!input.trim() || status !== 'ready') return
        send(input)
        setInput('')
      }
    if (!started)
      return (
        <main className='flex h-screen items-center justify-center'>
          <form
            className='flex w-80 flex-col gap-3'
            onSubmit={e => {
              e.preventDefault()
              if (credential.trim()) setStarted(true)
            }}>
            <h1 className='text-xl font-bold'>Claw</h1>
            <p className='text-sm text-muted-foreground'>
              Paste your OpenAI API key or the contents of ~/.codex/auth.json
            </p>
            <Input
              onChange={e => setCredential(e.target.value)}
              placeholder='sk-... or {"auth_mode":...}'
              type='password'
              value={credential}
            />
            <Button disabled={!credential.trim()} type='submit'>
              Start
            </Button>
          </form>
        </main>
      )
    return (
      <main className='mx-auto flex h-screen max-w-2xl flex-col gap-4 p-4'>
        <header className='flex items-center gap-2'>
          <h1 className='text-xl font-bold'>Claw</h1>
          <Badge variant={status === 'ready' ? 'default' : status === 'running' ? 'secondary' : 'outline'}>{status}</Badge>
        </header>
        <ScrollArea className='flex-1'>
          <div className='flex flex-col gap-2 pr-4'>
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
        <form
          className='flex gap-2'
          onSubmit={e => {
            e.preventDefault()
            handleSubmit()
          }}>
          <Input
            disabled={status !== 'ready'}
            onChange={e => setInput(e.target.value)}
            placeholder={status === 'ready' ? 'Ask the agent...' : 'Waiting...'}
            value={input}
          />
          <Button disabled={status !== 'ready' || !input.trim()} type='submit'>
            Send
          </Button>
        </form>
      </main>
    )
  }
export default Page
