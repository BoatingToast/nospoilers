'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'
import type {
  CharacterAccessory,
  CharacterConfig,
  CharacterEnergy,
  CharacterSilhouette,
} from '@/components/pro/ProCharacterScene'

const ProCharacterScene = dynamic(() => import('@/components/pro/ProCharacterScene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[470px] place-items-center">
      <p className="font-body text-sm text-ns-muted">Initializing 3D identity</p>
    </div>
  ),
})

type ConsoleMode = 'forge' | 'lumi' | 'shield'
type ConnectionMode = 'preview' | 'connecting' | 'live'

interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
}

const DEFAULT_CHARACTER: CharacterConfig = {
  skin: '#b76e52',
  suit: '#151d46',
  accent: '#9d7cff',
  silhouette: 'classic',
  accessory: 'visor',
  energy: 'orbit',
}

const SKIN_TONES = [
  { label: 'Deep', value: '#5d3528' },
  { label: 'Umber', value: '#85523f' },
  { label: 'Warm', value: '#b76e52' },
  { label: 'Golden', value: '#d89a72' },
  { label: 'Light', value: '#efc3a7' },
  { label: 'Cosmic', value: '#8b83c7' },
]

const SUIT_COLORS = [
  { label: 'Midnight', value: '#151d46' },
  { label: 'Obsidian', value: '#090c19' },
  { label: 'Mulberry', value: '#3a174f' },
  { label: 'Abyss', value: '#0c3b4b' },
]

const ACCENT_COLORS = [
  { label: 'Ultraviolet', value: '#9d7cff' },
  { label: 'Aurora', value: '#26e6cd' },
  { label: 'Solar', value: '#ffbc4b' },
  { label: 'Nova', value: '#ff648a' },
]

const SILHOUETTES: Array<{ value: CharacterSilhouette; label: string }> = [
  { value: 'sleek', label: 'Sleek' },
  { value: 'classic', label: 'Classic' },
  { value: 'cosmic', label: 'Cosmic' },
]

const ACCESSORIES: Array<{ value: CharacterAccessory; label: string }> = [
  { value: 'visor', label: 'Visor' },
  { value: 'headphones', label: 'Audio halo' },
  { value: 'halo', label: 'Orbit ring' },
  { value: 'none', label: 'None' },
]

const ENERGIES: Array<{ value: CharacterEnergy; label: string }> = [
  { value: 'calm', label: 'Calm' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'orbit', label: 'Orbit' },
]

const QUICK_PROMPTS = [
  'Pick the energy for my movie tonight',
  'Build a spoiler-free double feature',
  'What does my Movie DNA say about me?',
]

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content: 'I’m Lumi. Give me your time, mood, and who’s watching—I’ll make one confident call without touching the plot.',
  },
]

function optionLabel<T extends string>(items: Array<{ value: T; label: string }>, value: T) {
  return items.find(item => item.value === value)?.label ?? value
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function localLumiReply(prompt: string, avatarName: string): string {
  const normalized = prompt.toLowerCase()
  if (normalized.includes('double')) {
    return 'Build the night as an arc: start with something propulsive under two hours, then land on a warmer, more reflective film. I’ll keep both picks inside your saved queue and explain the pairing through pace, craft, and mood only.'
  }
  if (normalized.includes('dna') || normalized.includes('taste')) {
    return `${avatarName} reads as a high-curiosity viewer: strong appetite for atmosphere, clean momentum, and bold visual choices. Rate three recent watches and I can separate a real pattern from a passing mood.`
  }
  if (normalized.includes('pick') || normalized.includes('tonight') || normalized.includes('energy')) {
    return 'Tonight’s energy: magnetic, not exhausting. Aim for roughly two hours, medium intensity, and a strong visual identity. Tell me who is watching and I’ll narrow that to one decisive, spoiler-free pick.'
  }
  return 'I can turn that into a spoiler-safe decision using mood, runtime, company, craft signals, and your own ratings. Add one constraint and I’ll make the call instead of handing you another endless list.'
}

const LEGEND = 'text-[11px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-muted'

function choiceClass(selected: boolean) {
  return `min-h-10 rounded border px-3 font-heading text-sm transition-colors ${
    selected
      ? 'border-ns-text bg-ns-surface-2 text-ns-text'
      : 'border-ns-border text-ns-muted hover:border-ns-text hover:text-ns-text'
  }`
}

function ColorRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ label: string; value: string }>
  onChange: (value: string) => void
}) {
  return (
    <fieldset className="min-w-0">
      <legend className={LEGEND}>{label}</legend>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-label={`${label}: ${option.label}`}
            aria-pressed={value === option.value}
            className={`h-10 w-10 rounded-full border-2 p-1 ${value === option.value ? 'border-ns-text' : 'border-ns-border hover:border-ns-muted'}`}
          >
            <span className="block h-full w-full rounded-full" style={{ backgroundColor: option.value }} />
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function SegmentedRow<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 'grid-cols-3',
}: {
  label: string
  value: T
  options: Array<{ label: string; value: T }>
  onChange: (value: T) => void
  columns?: string
}) {
  return (
    <fieldset className="min-w-0">
      <legend className={LEGEND}>{label}</legend>
      <div className={`mt-2.5 grid gap-2 ${columns}`}>
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={choiceClass(value === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export default function ProCommandCenter({ mode, userId }: { mode: ConsoleMode; userId: string }) {
  const [config, setConfig] = useState<CharacterConfig>(DEFAULT_CHARACTER)
  const [avatarName, setAvatarName] = useState('NOVA-07')
  const [saveLabel, setSaveLabel] = useState('Save identity')
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const [connection, setConnection] = useState<ConnectionMode>('preview')
  const [progress, setProgress] = useState(28)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const shellRef = useRef<HTMLDivElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const messageIdRef = useRef(1)
  const sessionKey = `nospoilers-pro-session-${userId}`

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('nospoilers-pro-character')
      if (!saved) return
      const parsed = JSON.parse(saved) as { config?: CharacterConfig; name?: string }
      if (parsed.config) setConfig(parsed.config)
      if (parsed.name) setAvatarName(parsed.name)
    } catch {
      // A malformed local preview should never stop the studio from loading.
    }
  }, [])

  useEffect(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(sessionKey) ?? '{}') as { messages?: ChatMessage[]; progress?: number; connection?: ConnectionMode }
      if (Array.isArray(saved.messages) && saved.messages.length && saved.messages.every(message => message && typeof message.id === 'string' && typeof message.content === 'string' && (message.role === 'user' || message.role === 'assistant'))) {
        setMessages(saved.messages)
        messageIdRef.current = saved.messages.length + 1
      }
      if (typeof saved.progress === 'number' && saved.progress >= 0 && saved.progress <= 100) setProgress(saved.progress)
      if (saved.connection === 'live' || saved.connection === 'preview') setConnection(saved.connection)
    } catch {
      // Storage is optional; the tools also work in private browsing.
    }
    setSessionLoaded(true)
  }, [sessionKey])

  useEffect(() => {
    if (!sessionLoaded) return
    try {
      window.sessionStorage.setItem(sessionKey, JSON.stringify({ messages, progress, connection }))
    } catch {
      // Keep the current conversation usable when storage is unavailable.
    }
  }, [messages, progress, connection, sessionLoaded, sessionKey])

  useEffect(() => {
    if (messages.length > 1 || sending) chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, sending])

  const activeLayers = useMemo(() => {
    return [
      { name: 'Mood & intensity', threshold: 0, detail: 'Atmosphere, pace, and emotional temperature' },
      { name: 'Craft & performance', threshold: 20, detail: 'Direction, sound, acting, and visual language' },
      { name: 'Themes & structure', threshold: 55, detail: 'High-level ideas with plot-sensitive details filtered' },
      { name: 'Full discussion', threshold: 100, detail: 'Everything opens only after you finish' },
    ].map(layer => ({ ...layer, open: progress >= layer.threshold }))
  }, [progress])

  function updateConfig<Key extends keyof CharacterConfig>(key: Key, value: CharacterConfig[Key]) {
    setConfig(current => ({ ...current, [key]: value }))
    setSaveLabel('Save identity')
  }

  function randomizeCharacter() {
    setConfig({
      skin: randomItem(SKIN_TONES).value,
      suit: randomItem(SUIT_COLORS).value,
      accent: randomItem(ACCENT_COLORS).value,
      silhouette: randomItem(SILHOUETTES).value,
      accessory: randomItem(ACCESSORIES).value,
      energy: randomItem(ENERGIES).value,
    })
    setAvatarName(`NOVA-${Math.floor(10 + Math.random() * 89)}`)
    setSaveLabel('Save identity')
  }

  function saveCharacter() {
    window.localStorage.setItem('nospoilers-pro-character', JSON.stringify({ config, name: avatarName }))
    setSaveLabel('Identity saved')
    window.setTimeout(() => setSaveLabel('Save identity'), 1800)
  }

  async function toggleFullscreen() {
    if (!shellRef.current) return
    if (document.fullscreenElement) await document.exitFullscreen()
    else await shellRef.current.requestFullscreen()
  }

  async function sendMessage(prompt: string) {
    const trimmed = prompt.trim()
    if (!trimmed || sending) return

    const userMessage: ChatMessage = { id: `user-${messageIdRef.current++}`, role: 'user', content: trimmed }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setChatInput('')
    setSending(true)
    setConnection('connecting')

    try {
      const response = await fetch('/api/pro/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          context: {
            avatarName,
            silhouette: optionLabel(SILHOUETTES, config.silhouette),
            energy: optionLabel(ENERGIES, config.energy),
            watchProgress: progress,
          },
        }),
      })
      const payload = await response.json() as { message?: string; code?: string }

      if (!response.ok) {
        if (payload.code === 'AI_NOT_CONFIGURED') {
          await new Promise(resolve => window.setTimeout(resolve, 520))
          setConnection('preview')
          setMessages(current => [...current, {
            id: `assistant-${messageIdRef.current++}`,
            role: 'assistant',
            content: localLumiReply(trimmed, avatarName),
          }])
          return
        }
        throw new Error(payload.message ?? 'Lumi could not answer')
      }

      setConnection('live')
      setMessages(current => [...current, {
        id: `assistant-${messageIdRef.current++}`,
        role: 'assistant',
        content: payload.message ?? 'I’m ready for the next constraint.',
      }])
    } catch {
      setConnection('preview')
      setMessages(current => [...current, {
        id: `assistant-${messageIdRef.current++}`,
        role: 'assistant',
        content: `${localLumiReply(trimmed, avatarName)} (Preview response—live AI is currently unavailable.)`,
      }])
    } finally {
      setSending(false)
    }
  }

  function onChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(chatInput)
  }

  return (
    <div ref={shellRef} className="min-w-0 bg-ns-bg [&:fullscreen]:overflow-y-auto [&:fullscreen]:p-4 sm:[&:fullscreen]:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="font-body text-sm text-ns-muted">{mode === 'forge' ? 'Your identity studio' : mode === 'lumi' ? 'A conversation with Lumi' : 'Interactive boundary preview'}</p>
        <Button variant="outline" size="sm" className="min-h-10" onClick={() => void toggleFullscreen()}>Full screen</Button>
      </div>

      {mode === 'forge' && (
        <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0 border-t-2 border-ns-text pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <p className="min-w-0 break-words font-display text-3xl leading-none tracking-wide text-ns-text sm:text-4xl">{avatarName || 'UNNAMED'}</p>
              <p className="font-body text-sm text-ns-muted">Live taste twin · Drag to orbit</p>
            </div>
            <div className="relative mt-5 h-[470px] min-w-0 overflow-hidden rounded border border-ns-border bg-ns-bg sm:h-[560px]">
              <ProCharacterScene config={config} />
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-ns-border pt-4">
              {[
                ['Form', optionLabel(SILHOUETTES, config.silhouette)],
                ['Motion', optionLabel(ENERGIES, config.energy)],
                ['Signal', '98%'],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className={LEGEND}>{label}</dt>
                  <dd className="mt-1 truncate font-heading text-sm font-semibold text-ns-text">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <Section
            title="Make your Movie DNA visible."
            note="Your identity is saved on this device."
            action={<Button variant="outline" size="sm" className="min-h-10" onClick={randomizeCharacter}>Randomize</Button>}
          >
            <label className="block">
              <span className={LEGEND}>Identity name</span>
              <input
                value={avatarName}
                onChange={event => { setAvatarName(event.target.value.slice(0, 18).toUpperCase()); setSaveLabel('Save identity') }}
                className="mt-2 w-full min-w-0 rounded border border-ns-border bg-ns-surface px-4 py-3 font-display text-xl tracking-[0.14em] text-ns-text outline-none placeholder:text-ns-muted focus:border-ns-text"
                aria-label="Character name"
              />
            </label>

            <div className="mt-6 grid gap-5">
              <ColorRow label="Skin tone" value={config.skin} options={SKIN_TONES} onChange={value => updateConfig('skin', value)} />
              <ColorRow label="Cinema suit" value={config.suit} options={SUIT_COLORS} onChange={value => updateConfig('suit', value)} />
              <ColorRow label="Aura color" value={config.accent} options={ACCENT_COLORS} onChange={value => updateConfig('accent', value)} />
              <SegmentedRow label="Silhouette" value={config.silhouette} options={SILHOUETTES} onChange={value => updateConfig('silhouette', value)} />
              <SegmentedRow label="Energy" value={config.energy} options={ENERGIES} onChange={value => updateConfig('energy', value)} />
              <SegmentedRow label="Headwear" value={config.accessory} options={ACCESSORIES} onChange={value => updateConfig('accessory', value)} columns="grid-cols-2" />
            </div>

            <Button variant="primary" size="lg" className="mt-7 w-full" onClick={saveCharacter}>{saveLabel}</Button>
          </Section>
        </div>
      )}

      {mode === 'lumi' && (
        <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section className="flex h-[min(680px,80svh)] min-h-[520px] min-w-0 flex-col border-t-2 border-ns-text pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 pb-4">
              <h2 className="font-display text-3xl leading-none tracking-wide text-ns-text sm:text-4xl">Lumi, your cinema companion</h2>
              <Badge variant={connection === 'live' ? 'success' : connection === 'connecting' ? 'warning' : 'muted'} size="md">
                {connection === 'live' ? 'Live AI' : connection === 'connecting' ? 'Connecting' : 'Preview brain'}
              </Badge>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto border-b border-ns-border" aria-live="polite">
              {messages.map(message => (
                <div key={message.id} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 border-t border-ns-border py-4">
                  <span className={`font-heading text-sm font-semibold ${message.role === 'user' ? 'text-ns-muted' : 'text-ns-secondary-readable'}`}>{message.role === 'user' ? 'You' : 'Lumi'}</span>
                  <p className={`min-w-0 whitespace-pre-wrap break-words font-body text-sm leading-relaxed ${message.role === 'user' ? 'text-ns-muted' : 'text-ns-text'}`}>{message.content}</p>
                </div>
              ))}
              {sending && (
                <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 border-t border-ns-border py-4">
                  <span className="font-heading text-sm font-semibold text-ns-secondary-readable">Lumi</span>
                  <p className="font-body text-sm text-ns-muted">Thinking…</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={onChatSubmit} className="flex items-end gap-3 pt-4">
              <label className="sr-only" htmlFor="lumi-message">Message Lumi</label>
              <textarea
                id="lumi-message"
                value={chatInput}
                onChange={event => setChatInput(event.target.value.slice(0, 900))}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void sendMessage(chatInput)
                  }
                }}
                rows={2}
                placeholder="Ask for one great decision…"
                className="min-h-11 min-w-0 flex-1 resize-none rounded border border-ns-border bg-ns-surface px-3 py-2 font-body text-sm leading-relaxed text-ns-text outline-none placeholder:text-ns-muted focus:border-ns-text"
              />
              <Button type="submit" variant="primary" disabled={!chatInput.trim() || sending} className="min-h-11 flex-shrink-0" aria-label="Send message">Send</Button>
            </form>
          </section>

          <aside className="min-w-0 border-t-2 border-ns-text pt-4">
            <p className="font-body text-base leading-relaxed text-ns-text">Taste-aware. Decisive. Plot-blind by design.</p>
            <dl className="mt-5 border-b border-ns-border">
              <div className="flex items-baseline justify-between gap-4 border-t border-ns-border py-3">
                <dt className="font-body text-sm text-ns-muted">Context read</dt>
                <dd className="text-right font-heading text-sm text-ns-text">Movie DNA + Passport</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-ns-border py-3">
                <dt className="font-body text-sm text-ns-muted">Plot details</dt>
                <dd className="text-right font-heading text-sm text-ns-success">Blocked by default</dd>
              </div>
            </dl>
            <ul className="mt-6 border-b border-ns-border">
              {QUICK_PROMPTS.map(prompt => (
                <li key={prompt} className="border-t border-ns-border">
                  <button type="button" onClick={() => void sendMessage(prompt)} disabled={sending} className="flex min-h-11 w-full items-center py-2 text-left font-heading text-sm text-ns-secondary-readable underline-offset-4 hover:text-ns-text hover:underline disabled:opacity-50">
                    {prompt}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-body text-xs leading-relaxed text-ns-muted">Lumi may use preview replies when live AI is unavailable. Your conversation stays spoiler-free.</p>
          </aside>
        </div>
      )}

      {mode === 'shield' && (
        <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <Section
            title="See how your boundaries open up."
            note="Try the preview slider to explore each layer. Manage progress for your actual movies in Plot Passport."
          >
            <p className="font-display text-7xl leading-none tracking-wide text-ns-text">{progress}%</p>
            <p className={`${LEGEND} mt-2`}>Story progress</p>
            <label className="mt-6 block">
              <input type="range" min="0" max="100" value={progress} onChange={event => setProgress(Number(event.target.value))} className="pro-range w-full" aria-label="Movie progress percentage" />
              <span className="mt-3 flex justify-between font-body text-xs text-ns-muted"><span>Just started</span><span>Finished</span></span>
            </label>
            <div className="mt-8 border-t border-ns-border pt-4">
              <p className="font-heading text-sm font-semibold text-ns-text">Your real movie progress</p>
              <p className="mt-2 font-body text-sm leading-relaxed text-ns-muted">This preview does not update your movies. Set each title’s progress in Plot Passport to manage your spoiler boundaries.</p>
              <Link href="/plot-passport" className="mt-2 inline-flex min-h-10 items-center font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text">Open Plot Passport →</Link>
            </div>
          </Section>

          <Section title={`What is safe at ${progress}%`} action={<Badge variant="success" size="md">Boundary preview</Badge>}>
            <ol className="border-b border-ns-border">
              {activeLayers.map((layer, index) => (
                <li key={layer.name} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-3 border-t border-ns-border py-4">
                  <span className={`font-display text-2xl leading-none ${layer.open ? 'text-ns-success' : 'text-ns-muted'}`}>{String(index + 1).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <p className={`font-heading text-base font-semibold ${layer.open ? 'text-ns-text' : 'text-ns-muted'}`}>{layer.name}</p>
                    <p className="mt-1 font-body text-sm leading-relaxed text-ns-muted">{layer.detail}</p>
                  </div>
                  <Badge variant={layer.open ? 'success' : 'muted'} size="md">{layer.open ? 'Open' : `At ${layer.threshold}%`}</Badge>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      )}
    </div>
  )
}
