'use client'

import dynamic from 'next/dynamic'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import {
  ArrowRightIcon,
  CheckIcon,
  LockIcon,
} from '@/components/icons'
import type {
  CharacterAccessory,
  CharacterConfig,
  CharacterEnergy,
  CharacterSilhouette,
} from '@/components/pro/ProCharacterScene'

const ProCharacterScene = dynamic(() => import('@/components/pro/ProCharacterScene'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center text-sm text-ns-muted">
      Loading your character…
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

// Character colors are the viewer's saved data and feed WebGL, so they stay as hex.
const DEFAULT_CHARACTER: CharacterConfig = {
  skin: '#b76e52',
  suit: '#151d46',
  accent: '#f2665f',
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
  { label: 'Coral', value: '#f2665f' },
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
    <fieldset>
      <legend className="text-sm font-semibold text-ns-text">{label}</legend>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map(option => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-label={`${label}: ${option.label}`}
              aria-pressed={selected}
              className={`grid h-11 w-11 place-items-center rounded-full transition-colors duration-150 ${selected ? 'bg-ns-text' : 'bg-ns-surface-2 hover:bg-ns-surface-3'}`}
            >
              <span className="block h-8 w-8 rounded-full" style={{ backgroundColor: option.value }} />
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function SegmentedRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{ label: string; value: T }>
  onChange: (value: T) => void
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ns-text">{label}</legend>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-colors duration-150 ${
              value === option.value
                ? 'bg-ns-text text-ns-bg'
                : 'bg-ns-surface-2 text-ns-muted hover:bg-ns-surface-3 hover:text-ns-text'
            }`}
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
  const [scenePaused, setScenePaused] = useState(false)
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

  const fullscreenButton = (
    <Button variant="ghost" size="sm" className="flex-shrink-0" onClick={() => void toggleFullscreen()}>Full screen</Button>
  )

  return (
    <div ref={shellRef} className="overflow-hidden rounded-3xl bg-ns-surface [&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:overflow-auto [&:fullscreen]:rounded-none [&:fullscreen]:bg-ns-bg">
      {mode === 'forge' && (
        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <div className="relative h-[480px] overflow-hidden bg-ns-surface-2 sm:h-[560px] lg:h-auto lg:min-h-[780px]">
            <ProCharacterScene config={config} paused={scenePaused} />
            <div className="pointer-events-none absolute left-5 top-5 z-10 max-w-[calc(100%-9rem)] sm:left-7 sm:top-7">
              <p className="truncate font-display text-3xl text-ns-text sm:text-4xl">{avatarName || 'Unnamed'}</p>
              <p className="mt-1.5 flex items-center gap-2 text-sm text-ns-muted">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: config.accent }} />
                Live taste twin
              </p>
            </div>
            <div className="absolute right-3 top-3 z-10 sm:right-5 sm:top-5">{fullscreenButton}</div>
            <div className="pointer-events-none absolute inset-x-5 bottom-4 z-10 flex items-center justify-between gap-3 sm:inset-x-7 sm:bottom-6">
              <p className="min-w-0 truncate text-sm text-ns-muted">
                <span className="hidden sm:inline">{optionLabel(SILHOUETTES, config.silhouette)} · {optionLabel(ENERGIES, config.energy)} · </span>Drag to rotate
              </p>
              <button
                type="button"
                onClick={() => setScenePaused(value => !value)}
                className="pointer-events-auto inline-flex min-h-11 flex-shrink-0 items-center rounded-full bg-ns-surface px-4 text-sm font-semibold text-ns-text transition-colors hover:bg-ns-surface-3"
              >
                {scenePaused ? 'Play rotation' : 'Pause rotation'}
              </button>
            </div>
          </div>

          <aside className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-3xl text-ns-text">Make your Movie DNA visible.</h2>
              <Button variant="outline" size="sm" className="flex-shrink-0" onClick={randomizeCharacter}>Randomize</Button>
            </div>

            <div className="mt-7">
              <Input
                id="pro-identity-name"
                label="Identity name"
                value={avatarName}
                onChange={event => { setAvatarName(event.target.value.slice(0, 18).toUpperCase()); setSaveLabel('Save identity') }}
                className="font-heading text-lg font-bold"
                aria-label="Character name"
              />
            </div>

            <div className="mt-7 grid gap-6">
              <ColorRow label="Skin tone" value={config.skin} options={SKIN_TONES} onChange={value => updateConfig('skin', value)} />
              <ColorRow label="Cinema suit" value={config.suit} options={SUIT_COLORS} onChange={value => updateConfig('suit', value)} />
              <ColorRow label="Aura color" value={config.accent} options={ACCENT_COLORS} onChange={value => updateConfig('accent', value)} />
              <SegmentedRow label="Silhouette" value={config.silhouette} options={SILHOUETTES} onChange={value => updateConfig('silhouette', value)} />
              <SegmentedRow label="Energy" value={config.energy} options={ENERGIES} onChange={value => updateConfig('energy', value)} />
              <SegmentedRow label="Headwear" value={config.accessory} options={ACCESSORIES} onChange={value => updateConfig('accessory', value)} />
            </div>

            <Button size="lg" className="mt-8 w-full" onClick={saveCharacter}>
              <CheckIcon size={16} /> {saveLabel}
            </Button>
            <p className="mt-3 text-center text-sm text-ns-muted">Your identity is saved on this device.</p>
          </aside>
        </div>
      )}

      {mode === 'lumi' && (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex h-[min(720px,calc(100svh-6rem))] min-h-[560px] min-w-0 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ns-border px-5 py-4 sm:px-8 sm:py-5">
              <div className="min-w-0">
                <h2 className="font-heading text-xl font-bold text-ns-text">Lumi, your cinema companion</h2>
                <p className="mt-0.5 text-sm text-ns-muted">Taste-aware. Decisive. Plot-blind by design.</p>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant={connection === 'live' ? 'success' : connection === 'connecting' ? 'warning' : 'muted'} size="md">
                  {connection === 'live' ? 'Live AI' : connection === 'connecting' ? 'Connecting' : 'Preview brain'}
                </Badge>
                {fullscreenButton}
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-8" aria-live="polite">
              {messages.map(message => (
                <div key={message.id} className={`flex animate-fade-up ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] whitespace-pre-wrap break-words text-base leading-relaxed text-ns-text sm:max-w-[75%] ${message.role === 'user' ? 'rounded-2xl rounded-br-md bg-ns-surface-3 px-4 py-3' : ''}`}>
                    {message.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex w-fit animate-fade-up items-center gap-1.5 rounded-2xl bg-ns-surface-2 px-4 py-4" role="status" aria-label="Lumi is thinking">
                  {[0, 1, 2].map(index => <span key={index} className="h-1.5 w-1.5 animate-pulse rounded-full bg-ns-muted" style={{ animationDelay: `${index * 140}ms` }} />)}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="border-t border-ns-border p-4 sm:px-8 sm:py-5">
              <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide sm:mx-0 sm:px-0">
                {QUICK_PROMPTS.map(prompt => (
                  <button key={prompt} type="button" onClick={() => void sendMessage(prompt)} disabled={sending} className="min-h-11 flex-shrink-0 rounded-full bg-ns-surface-2 px-4 text-sm font-medium text-ns-muted transition-colors hover:bg-ns-surface-3 hover:text-ns-text disabled:cursor-not-allowed disabled:opacity-50">
                    {prompt}
                  </button>
                ))}
              </div>
              <form onSubmit={onChatSubmit} className="flex items-end gap-2 rounded-2xl border border-ns-border-strong bg-ns-bg p-2 transition-colors focus-within:border-ns-text">
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
                  className="min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-base leading-6 text-ns-text outline-none placeholder:text-ns-subtle"
                />
                <button type="submit" disabled={!chatInput.trim() || sending} className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-ns-secondary text-ns-secondary-foreground transition-colors hover:bg-ns-secondary-readable disabled:cursor-not-allowed disabled:bg-ns-surface-3 disabled:text-ns-muted" aria-label="Send message">
                  <ArrowRightIcon size={18} className="-rotate-90" />
                </button>
              </form>
              <p className="mt-2 text-center text-xs leading-5 text-ns-muted">Lumi may use preview replies when live AI is unavailable. Your conversation stays spoiler-free.</p>
            </div>
          </div>

          <aside className="hidden border-l border-ns-border p-8 lg:block">
            <h3 className="font-heading text-lg font-bold text-ns-text">What Lumi works from</h3>
            <dl className="mt-4 divide-y divide-ns-border">
              <div className="py-4">
                <dt className="text-sm text-ns-muted">Context read</dt>
                <dd className="mt-1 font-semibold text-ns-text">Movie DNA + Passport</dd>
              </div>
              <div className="py-4">
                <dt className="text-sm text-ns-muted">Plot details</dt>
                <dd className="mt-1 inline-flex items-center gap-2 font-semibold text-ns-success"><LockIcon size={15} /> Blocked by default</dd>
              </div>
            </dl>
          </aside>
        </div>
      )}

      {mode === 'shield' && (
        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col justify-between gap-10 bg-ns-surface-2 p-6 sm:p-10">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-3xl text-ns-text">See how your boundaries open up.</h2>
                {fullscreenButton}
              </div>
              <p className="mt-3 max-w-md text-base leading-relaxed text-ns-muted">Try the preview slider to explore each layer. Manage progress for your actual movies in Plot Passport.</p>
            </div>

            <div>
              <p className="font-display text-[clamp(5rem,14vw,9rem)] leading-none tabular-nums text-ns-text">{progress}%</p>
              <p className="mt-2 text-sm font-semibold text-ns-muted">Story progress</p>
              <div className="relative mt-5 h-11">
                <div aria-hidden="true" className="absolute inset-x-3 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-ns-surface-3">
                  <div className="h-full origin-left bg-ns-secondary" style={{ transform: `scaleX(${progress / 100})` }} />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={event => setProgress(Number(event.target.value))}
                  aria-label="Movie progress percentage"
                  className="absolute inset-0 h-11 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-ns-text [&::-moz-range-track]:bg-transparent [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ns-text"
                />
              </div>
              <p className="flex justify-between text-sm text-ns-muted"><span>Just started</span><span>Finished</span></p>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <h2 className="font-display text-3xl text-ns-text sm:text-4xl">What is safe at {progress}%</h2>

            <ul className="mt-6 divide-y divide-ns-border">
              {activeLayers.map(layer => (
                <li key={layer.name} className="flex items-center gap-4 py-5">
                  <span className={`flex-shrink-0 transition-colors duration-300 ${layer.open ? 'text-ns-success' : 'text-ns-subtle'}`}>
                    {layer.open ? <CheckIcon size={20} /> : <LockIcon size={20} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-lg font-bold text-ns-text">{layer.name}</p>
                    <p className="mt-1 text-sm leading-6 text-ns-muted">
                      <span aria-hidden={!layer.open || undefined} data-open={layer.open} className="ns-redact">{layer.detail}</span>
                      {!layer.open && <span className="sr-only">Hidden until {layer.threshold}%</span>}
                    </p>
                  </div>
                  <Badge variant={layer.open ? 'success' : 'muted'} size="md" className="flex-shrink-0">
                    {layer.open ? 'Open' : `At ${layer.threshold}%`}
                  </Badge>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-4 border-t border-ns-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-heading text-lg font-bold text-ns-text">Your real movie progress</h3>
                <p className="mt-1 max-w-md text-sm leading-6 text-ns-muted">This preview does not update your movies. Set each title’s progress in Plot Passport to manage your spoiler boundaries.</p>
              </div>
              <Button href="/plot-passport" variant="outline" className="flex-shrink-0">Open Plot Passport <ArrowRightIcon size={15} /></Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
