'use client'

import dynamic from 'next/dynamic'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckIcon,
  FriendsIcon,
  LockIcon,
  MovieDnaIcon,
  RecsIcon,
  WatchlistIcon,
  type IconProps,
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
    <div className="grid h-full min-h-[470px] place-items-center">
      <div className="flex items-center gap-3 text-[10px] font-heading uppercase tracking-[0.2em] text-ns-muted">
        <span className="h-2 w-2 animate-pulse rounded-full bg-ns-secondary-readable" />
        Initializing 3D identity
      </div>
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

const MODE_TABS: Array<{
  id: ConsoleMode
  index: string
  label: string
  caption: string
  Icon: React.ComponentType<IconProps>
}> = [
  { id: 'forge', index: '01', label: 'Identity Forge', caption: 'Build your 3D self', Icon: MovieDnaIcon },
  { id: 'lumi', index: '02', label: 'Lumi AI', caption: 'Talk to your taste', Icon: RecsIcon },
  { id: 'shield', index: '03', label: 'Spoiler Field', caption: 'Control every reveal', Icon: LockIcon },
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
      <legend className="text-[9px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-muted">{label}</legend>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-label={`${label}: ${option.label}`}
            aria-pressed={value === option.value}
            className={`relative h-8 w-8 rounded-full border p-1 transition-transform hover:scale-110 ${value === option.value ? 'border-white' : 'border-white/10'}`}
          >
            <span className="block h-full w-full rounded-full" style={{ backgroundColor: option.value }} />
            {value === option.value && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-ns-surface-2 bg-ns-success" />}
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
}: {
  label: string
  value: T
  options: Array<{ label: string; value: T }>
  onChange: (value: T) => void
}) {
  return (
    <fieldset>
      <legend className="text-[9px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-muted">{label}</legend>
      <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl border border-ns-border bg-ns-bg/55 p-1">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`min-h-9 rounded-lg px-2 text-[9px] font-heading font-semibold transition-colors ${
              value === option.value
                ? 'bg-ns-secondary text-white shadow-lg shadow-ns-secondary/20'
                : 'text-ns-muted hover:bg-white/5 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export default function ProCommandCenter() {
  const [mode, setMode] = useState<ConsoleMode>('forge')
  const [config, setConfig] = useState<CharacterConfig>(DEFAULT_CHARACTER)
  const [avatarName, setAvatarName] = useState('NOVA-07')
  const [saveLabel, setSaveLabel] = useState('Save identity')
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const [connection, setConnection] = useState<ConnectionMode>('preview')
  const [progress, setProgress] = useState(28)
  const shellRef = useRef<HTMLDivElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const messageIdRef = useRef(1)

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
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
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
    <section id="cinema-os" className="scroll-mt-24 px-3 py-14 sm:px-6 sm:py-20" aria-labelledby="cinema-os-title">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.26em] text-ns-secondary-readable">Interactive launch preview</p>
            <h2 id="cinema-os-title" className="mt-2 max-w-3xl font-heading text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Enter your personal cinema universe.
            </h2>
          </div>
          <p className="max-w-lg text-sm leading-6 text-ns-muted">
            Build your on-screen identity, talk to a spoiler-locked taste companion, and control exactly what the internet is allowed to reveal.
          </p>
        </div>

        <div ref={shellRef} className="pro-command-shell overflow-hidden rounded-[28px] border border-white/10 bg-ns-surface shadow-2xl shadow-black/50">
          <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-ns-bg/65 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="relative grid h-9 w-9 place-items-center rounded-full border border-ns-secondary-readable/35 bg-ns-secondary/15 text-ns-secondary-readable">
                <span className="absolute inset-1 animate-pulse rounded-full border border-ns-secondary-readable/20" />
                <MovieDnaIcon size={16} />
              </span>
              <div>
                <p className="font-display text-xl tracking-[0.16em] text-white">CINEMA OS</p>
                <p className="text-[8px] uppercase tracking-[0.22em] text-ns-muted">NoSpoilers Pro / Build 01</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-full border border-ns-success/20 bg-ns-success/10 px-3 py-1.5 text-[9px] font-heading uppercase tracking-[0.12em] text-ns-success sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-ns-success" /> All systems ready
              </span>
              <button type="button" onClick={() => void toggleFullscreen()} className="rounded-lg border border-ns-border px-3 py-2 text-[9px] font-heading uppercase tracking-[0.12em] text-ns-muted transition-colors hover:border-ns-secondary/50 hover:text-white">
                Full screen
              </button>
            </div>
          </header>

          <nav className="grid border-b border-white/10 bg-ns-bg/35 md:grid-cols-3" aria-label="Cinema OS modes">
            {MODE_TABS.map(({ id, index, label, caption, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                aria-pressed={mode === id}
                className={`group flex min-h-[76px] items-center gap-3 border-b border-white/10 px-4 text-left transition-colors last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 ${mode === id ? 'bg-ns-secondary/12' : 'hover:bg-white/[0.035]'}`}
              >
                <span className={`font-display text-xl tracking-wider ${mode === id ? 'text-ns-secondary-readable' : 'text-ns-muted/55'}`}>{index}</span>
                <span className={`grid h-9 w-9 place-items-center rounded-xl border ${mode === id ? 'border-ns-secondary/40 bg-ns-secondary/15 text-ns-secondary-readable' : 'border-ns-border text-ns-muted'}`}>
                  <Icon size={16} />
                </span>
                <span>
                  <span className={`block font-heading text-xs font-semibold ${mode === id ? 'text-white' : 'text-ns-muted group-hover:text-white'}`}>{label}</span>
                  <span className="mt-0.5 block text-[9px] text-ns-muted/70">{caption}</span>
                </span>
              </button>
            ))}
          </nav>

          {mode === 'forge' && (
            <div className="grid min-h-[680px] lg:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.65fr)]">
              <div className="pro-viewport relative min-h-[520px] overflow-hidden border-b border-white/10 lg:border-b-0 lg:border-r">
                <div aria-hidden="true" className="pro-horizon-grid absolute inset-x-0 bottom-0 h-2/3" />
                <div className="absolute left-5 top-5 z-10">
                  <p className="font-display text-2xl tracking-[0.12em] text-white">{avatarName || 'UNNAMED'}</p>
                  <div className="mt-2 flex items-center gap-2 text-[8px] uppercase tracking-[0.17em] text-ns-muted">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: config.accent }} />
                    Live taste twin
                  </div>
                </div>
                <div className="absolute right-5 top-5 z-10 rounded-full border border-white/10 bg-ns-bg/45 px-3 py-1.5 text-[8px] uppercase tracking-[0.15em] text-ns-muted backdrop-blur">
                  Drag to orbit
                </div>
                <ProCharacterScene config={config} />
                <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 grid grid-cols-3 gap-2 sm:inset-x-5">
                  {[
                    ['Form', optionLabel(SILHOUETTES, config.silhouette)],
                    ['Motion', optionLabel(ENERGIES, config.energy)],
                    ['Signal', '98%'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-ns-bg/55 px-3 py-2.5 backdrop-blur-md">
                      <p className="text-[7px] uppercase tracking-[0.18em] text-ns-muted">{label}</p>
                      <p className="mt-1 truncate font-heading text-[10px] font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="bg-ns-surface-2/35 p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-heading font-semibold uppercase tracking-[0.2em] text-ns-secondary-readable">Character protocol</p>
                    <h3 className="mt-1 font-heading text-xl font-semibold text-white">Make your Movie DNA visible.</h3>
                  </div>
                  <button type="button" onClick={randomizeCharacter} className="rounded-lg border border-ns-border px-3 py-2 text-[9px] font-heading font-semibold text-ns-muted transition-colors hover:border-ns-secondary/50 hover:text-white">
                    Randomize
                  </button>
                </div>

                <label className="mt-6 block">
                  <span className="text-[9px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-muted">Identity name</span>
                  <input
                    value={avatarName}
                    onChange={event => { setAvatarName(event.target.value.slice(0, 18).toUpperCase()); setSaveLabel('Save identity') }}
                    className="mt-2 w-full rounded-xl border border-ns-border bg-ns-bg/55 px-4 py-3 font-display text-xl tracking-[0.14em] text-white outline-none transition-colors placeholder:text-ns-muted focus:border-ns-secondary/60"
                    aria-label="Character name"
                  />
                </label>

                <div className="mt-6 grid gap-6">
                  <ColorRow label="Skin tone" value={config.skin} options={SKIN_TONES} onChange={value => updateConfig('skin', value)} />
                  <ColorRow label="Cinema suit" value={config.suit} options={SUIT_COLORS} onChange={value => updateConfig('suit', value)} />
                  <ColorRow label="Aura color" value={config.accent} options={ACCENT_COLORS} onChange={value => updateConfig('accent', value)} />
                  <SegmentedRow label="Silhouette" value={config.silhouette} options={SILHOUETTES} onChange={value => updateConfig('silhouette', value)} />
                  <SegmentedRow label="Energy" value={config.energy} options={ENERGIES} onChange={value => updateConfig('energy', value)} />
                  <fieldset>
                    <legend className="text-[9px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-muted">Headwear</legend>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {ACCESSORIES.map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateConfig('accessory', option.value)}
                          aria-pressed={config.accessory === option.value}
                          className={`rounded-lg border px-3 py-2.5 text-[9px] font-heading font-semibold transition-colors ${config.accessory === option.value ? 'border-ns-secondary/60 bg-ns-secondary/15 text-white' : 'border-ns-border text-ns-muted hover:text-white'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>

                <button type="button" onClick={saveCharacter} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-ns-secondary px-5 text-xs font-heading font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-ns-secondary/90">
                  <CheckIcon size={15} /> {saveLabel}
                </button>
                <p className="mt-3 text-center text-[9px] leading-4 text-ns-muted/70">Saved to this device for the preview. Account sync can be connected at launch.</p>
              </aside>
            </div>
          )}

          {mode === 'lumi' && (
            <div className="grid min-h-[680px] lg:grid-cols-[0.72fr_1.28fr]">
              <div className="relative hidden overflow-hidden border-r border-white/10 bg-ns-bg/45 lg:block">
                <div aria-hidden="true" className="pro-horizon-grid absolute inset-0" />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="pro-ai-orbit relative grid h-72 w-72 place-items-center rounded-full border border-ns-secondary-readable/15">
                    <div className="absolute inset-8 rounded-full border border-dashed border-ns-secondary-readable/25" />
                    <div className="absolute inset-[5.5rem] rounded-full border border-ns-secondary-readable/20 bg-ns-secondary/10 blur-sm" />
                    <div className="pro-ai-core relative grid h-24 w-24 place-items-center rounded-full border border-ns-secondary-readable/50 bg-ns-surface-2 shadow-2xl shadow-ns-secondary/50">
                      <RecsIcon size={32} className="text-ns-secondary-readable" strokeWidth={1.25} />
                    </div>
                    <span className="pro-orbit-dot absolute left-1/2 top-0 h-3 w-3 rounded-full bg-ns-success shadow-lg shadow-ns-success" />
                  </div>
                </div>
                <div className="absolute inset-x-6 bottom-7 grid grid-cols-2 gap-2">
                  <div className="pro-floating-card rounded-xl border border-white/10 bg-ns-surface/70 p-3 backdrop-blur">
                    <p className="text-[7px] uppercase tracking-[0.16em] text-ns-muted">Context read</p>
                    <p className="mt-1 font-heading text-[10px] text-white">Movie DNA + Passport</p>
                  </div>
                  <div className="pro-floating-card pro-floating-card-delay rounded-xl border border-white/10 bg-ns-surface/70 p-3 backdrop-blur">
                    <p className="text-[7px] uppercase tracking-[0.16em] text-ns-muted">Plot details</p>
                    <p className="mt-1 font-heading text-[10px] text-ns-success">Blocked by default</p>
                  </div>
                </div>
              </div>

              <div className="flex min-h-[680px] flex-col bg-ns-surface-2/25">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-7">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-base font-semibold text-white">Lumi, your cinema companion</h3>
                      <span className="rounded-full border border-ns-secondary/35 bg-ns-secondary/10 px-2 py-1 text-[7px] font-heading uppercase tracking-[0.13em] text-ns-secondary-readable">GPT-4o mini</span>
                    </div>
                    <p className="mt-1 text-[9px] text-ns-muted">Taste-aware. Decisive. Plot-blind by design.</p>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[8px] uppercase tracking-[0.14em] ${connection === 'live' ? 'border-ns-success/25 bg-ns-success/10 text-ns-success' : connection === 'connecting' ? 'border-ns-warning/25 bg-ns-warning/10 text-ns-warning' : 'border-ns-border text-ns-muted'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${connection === 'live' ? 'bg-ns-success' : connection === 'connecting' ? 'animate-pulse bg-ns-warning' : 'bg-ns-muted'}`} />
                    {connection === 'live' ? 'Live AI' : connection === 'connecting' ? 'Connecting' : 'Preview brain'}
                  </span>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-7" aria-live="polite">
                  {messages.map(message => (
                    <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {message.role === 'assistant' && (
                        <span className="mt-1 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-ns-secondary/35 bg-ns-secondary/15 text-ns-secondary-readable">
                          <RecsIcon size={14} />
                        </span>
                      )}
                      <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs leading-6 ${message.role === 'user' ? 'rounded-br-md bg-ns-secondary text-white' : 'rounded-bl-md border border-ns-border bg-ns-bg/50 text-ns-text'}`}>
                        {message.content}
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full border border-ns-secondary/35 bg-ns-secondary/15 text-ns-secondary-readable"><RecsIcon size={14} /></span>
                      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-ns-border bg-ns-bg/50 px-4 py-4">
                        {[0, 1, 2].map(index => <span key={index} className="h-1.5 w-1.5 animate-pulse rounded-full bg-ns-secondary-readable" style={{ animationDelay: `${index * 140}ms` }} />)}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="border-t border-white/10 p-4 sm:p-5">
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {QUICK_PROMPTS.map(prompt => (
                      <button key={prompt} type="button" onClick={() => void sendMessage(prompt)} disabled={sending} className="flex-shrink-0 rounded-full border border-ns-border px-3 py-2 text-[8px] font-heading text-ns-muted transition-colors hover:border-ns-secondary/50 hover:text-white disabled:opacity-50">
                        {prompt}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={onChatSubmit} className="flex items-end gap-2 rounded-2xl border border-ns-border bg-ns-bg/60 p-2 focus-within:border-ns-secondary/50">
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
                      className="min-h-11 flex-1 resize-none bg-transparent px-3 py-2 text-xs leading-5 text-white outline-none placeholder:text-ns-muted/60"
                    />
                    <button type="submit" disabled={!chatInput.trim() || sending} className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-ns-secondary text-white transition-colors hover:bg-ns-secondary/90 disabled:cursor-not-allowed disabled:bg-ns-secondary-dim disabled:text-ns-muted" aria-label="Send message">
                      <span aria-hidden="true" className="translate-x-px text-base">↗</span>
                    </button>
                  </form>
                  <p className="mt-2 text-center text-[8px] leading-4 text-ns-muted/65">Add OPENAI_API_KEY to activate live replies. Preview mode stays functional without a key.</p>
                </div>
              </div>
            </div>
          )}

          {mode === 'shield' && (
            <div className="grid min-h-[680px] lg:grid-cols-[0.78fr_1.22fr]">
              <div className="relative flex min-h-[460px] flex-col justify-between overflow-hidden border-b border-white/10 bg-ns-bg/50 p-6 lg:border-b-0 lg:border-r sm:p-9">
                <div aria-hidden="true" className="pro-horizon-grid absolute inset-0 opacity-60" />
                <div className="relative z-10">
                  <p className="text-[9px] font-heading font-semibold uppercase tracking-[0.2em] text-ns-secondary-readable">Adaptive Spoiler Field</p>
                  <h3 className="mt-2 max-w-md font-heading text-2xl font-semibold text-white sm:text-3xl">The internet changes with your progress.</h3>
                  <p className="mt-3 max-w-md text-xs leading-6 text-ns-muted">One slider becomes a universal permission layer across reviews, search, friends, and Lumi.</p>
                </div>

                <div className="relative z-10 my-8 grid place-items-center">
                  <div className="pro-shield-sphere relative grid h-60 w-60 place-items-center rounded-full border border-ns-secondary-readable/25 sm:h-72 sm:w-72">
                    <div className="absolute inset-5 rounded-full border border-dashed border-ns-secondary-readable/20" />
                    <div className="absolute inset-12 rounded-full border border-ns-secondary-readable/15 bg-ns-secondary/10 shadow-[inset_0_0_60px_rgb(var(--ns-secondary)/0.22)]" />
                    <div className="relative text-center">
                      <p className="font-display text-7xl tracking-wide text-white">{progress}%</p>
                      <p className="text-[8px] uppercase tracking-[0.2em] text-ns-secondary-readable">Story progress</p>
                    </div>
                  </div>
                </div>

                <label className="relative z-10 block">
                  <span className="flex justify-between text-[8px] uppercase tracking-[0.16em] text-ns-muted"><span>Just started</span><span>Finished</span></span>
                  <input type="range" min="0" max="100" value={progress} onChange={event => setProgress(Number(event.target.value))} className="pro-range mt-3 w-full" aria-label="Movie progress percentage" />
                </label>
              </div>

              <div className="bg-ns-surface-2/25 p-5 sm:p-8 lg:p-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-muted">Live boundary map</p>
                    <h3 className="mt-1 font-heading text-xl font-semibold text-white">What is safe at {progress}%</h3>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-ns-success/25 bg-ns-success/10 px-3 py-2 text-[8px] font-heading uppercase tracking-[0.12em] text-ns-success">
                    <LockIcon size={11} /> Zero leaks detected
                  </span>
                </div>

                <div className="mt-7 space-y-3">
                  {activeLayers.map((layer, index) => (
                    <div key={layer.name} className={`group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border p-4 transition-all ${layer.open ? 'border-ns-success/20 bg-ns-success/[0.045]' : 'border-ns-border bg-ns-bg/35'}`}>
                      <span className={`grid h-10 w-10 place-items-center rounded-xl border font-display text-lg ${layer.open ? 'border-ns-success/25 bg-ns-success/10 text-ns-success' : 'border-ns-border bg-ns-surface text-ns-muted'}`}>{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <p className={`font-heading text-xs font-semibold ${layer.open ? 'text-white' : 'text-ns-muted'}`}>{layer.name}</p>
                        <p className="mt-1 text-[9px] leading-4 text-ns-muted/75">{layer.detail}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[7px] font-heading uppercase tracking-[0.13em] ${layer.open ? 'bg-ns-success/10 text-ns-success' : 'bg-ns-surface text-ns-muted'}`}>{layer.open ? 'Open' : `At ${layer.threshold}%`}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-ns-secondary/25 bg-ns-secondary/10 p-5">
                  <div className="flex gap-3">
                    <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-ns-secondary/15 text-ns-secondary-readable"><WatchlistIcon size={17} /></span>
                    <div>
                      <p className="text-[8px] font-heading uppercase tracking-[0.17em] text-ns-secondary-readable">Everywhere, automatically</p>
                      <p className="mt-2 text-xs leading-6 text-ns-text">Your current boundary follows you into reviews, friend activity, search results, conversations, and browser protection.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <footer className="grid gap-px border-t border-white/10 bg-white/10 sm:grid-cols-3">
            {[
              { label: 'Privacy', value: 'Local-first identity', Icon: LockIcon },
              { label: 'Social layer', value: 'Presence-ready rooms', Icon: FriendsIcon },
              { label: 'Taste engine', value: 'Continuously learning', Icon: MovieDnaIcon },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="flex items-center gap-3 bg-ns-bg/70 px-5 py-4">
                <Icon size={14} className="text-ns-secondary-readable" />
                <div><p className="text-[7px] uppercase tracking-[0.16em] text-ns-muted">{label}</p><p className="mt-1 font-heading text-[9px] font-semibold text-white">{value}</p></div>
              </div>
            ))}
          </footer>
        </div>
      </div>
    </section>
  )
}
