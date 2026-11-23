'use client'

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import type { EvidenceReference, GroundedAnswer } from '@/lib/where-was-i'
import type { WhereWasICheckpoint, WhereWasISession } from '@/services/where-was-i'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { ArrowRightIcon, ChevronIcon, EyeIcon, EyeOffIcon, LockIcon, SearchIcon } from '@/components/icons'
import { PillTabs } from '@/components/watchlist/LibraryControls'
import { cn } from '@/lib/utils'

type SupportedClaim = WhereWasISession['shortRecap'][number]

/**
 * Source excerpts stay out of the DOM until the viewer asks for them. Once
 * opened, each excerpt mounts under a redaction bar and wipes into view.
 */
function EvidenceReferences({
  references,
  label,
  availabilityPrefix,
}: {
  references: EvidenceReference[]
  label: string
  availabilityPrefix: string
}) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [uncovered, setUncovered] = useState(false)

  useEffect(() => {
    if (!open) {
      setUncovered(false)
      return
    }
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setUncovered(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [open])

  return (
    <div className="mt-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen(value => !value)}
        className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-sm font-semibold text-ns-secondary-readable transition-colors duration-150 hover:text-ns-text"
      >
        {open ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
        {label}
        <ChevronIcon
          direction="down"
          size={14}
          className={cn('transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div id={panelId} className="mt-1 space-y-3 border-l-2 border-ns-border-strong pb-1 pl-3">
          {references.map(reference => (
            <div key={reference.id} className="text-sm leading-relaxed text-ns-muted">
              <p className="font-semibold text-ns-text">{reference.sourceRef}</p>
              <p>
                <span className="ns-redact" data-open={uncovered ? 'true' : 'false'}>
                  &ldquo;{reference.excerpt}&rdquo;
                </span>
              </p>
              <p className="mt-0.5 text-xs">{availabilityPrefix} {reference.earliestCheckpoint}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ClaimList({ claims, dense = false }: { claims: SupportedClaim[]; dense?: boolean }) {
  return (
    <ul className="divide-y divide-ns-border">
      {claims.map((claim, index) => (
        <li key={`${claim.text}-${index}`} className={cn('first:pt-0 last:pb-0', dense ? 'py-3' : 'py-4')}>
          <p className={cn('leading-relaxed text-ns-text', dense ? 'text-sm' : 'text-base')}>{claim.text}</p>
          <EvidenceReferences
            references={claim.references}
            label={`${claim.references.length} evidence ${claim.references.length === 1 ? 'reference' : 'references'}`}
            availabilityPrefix="Earliest valid:"
          />
        </li>
      ))}
    </ul>
  )
}

function shortCheckpointLabel(checkpoint: WhereWasICheckpoint) {
  if (checkpoint.season !== null && checkpoint.episode !== null) {
    return checkpoint.season === 1 ? `Ep ${checkpoint.episode}` : `S${checkpoint.season} E${checkpoint.episode}`
  }
  if (checkpoint.filmProgressPercent !== null) return `${checkpoint.filmProgressPercent}%`
  return String(checkpoint.ordinal)
}

/**
 * The story as a row of redaction bars, one per checkpoint. Confirmed episodes
 * are uncovered, a draft shows amber, and everything later stays coral.
 */
function CheckpointRail({
  checkpoints,
  draftId,
  authorizedId,
  onSelect,
}: {
  checkpoints: WhereWasICheckpoint[]
  draftId: string
  authorizedId: string | null
  onSelect: (id: string) => void
}) {
  const draftIndex = checkpoints.findIndex(checkpoint => checkpoint.id === draftId)
  const authorizedIndex = checkpoints.findIndex(checkpoint => checkpoint.id === authorizedId)
  const count = Math.max(1, checkpoints.length)
  const markerOffset = draftIndex >= 0 ? ((draftIndex + 1) / count) * 100 : 0

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="relative px-3.5 pt-3" style={{ minWidth: `${count * 3.25 + 1.75}rem` }}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-3 z-10 h-7 overflow-hidden px-3.5">
          <div
            style={{ transform: `translateX(${markerOffset}%)` }}
            className={cn(
              'h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
              draftIndex < 0 && 'opacity-0',
            )}
          >
            <span className="absolute left-0 top-1/2 block h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-ns-text bg-ns-bg shadow-2xl" />
          </div>
        </div>

        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
          {checkpoints.map((checkpoint, index) => {
            const confirmed = authorizedIndex >= 0 && index <= authorizedIndex
            const drafted = !confirmed && draftIndex >= 0 && index <= draftIndex
            const selected = checkpoint.id === draftId
            return (
              <label key={checkpoint.id} className="group flex cursor-pointer flex-col items-center">
                <input
                  type="radio"
                  name="resume-checkpoint"
                  value={checkpoint.id}
                  checked={selected}
                  onChange={() => onSelect(checkpoint.id)}
                  aria-label={checkpoint.label}
                  className="peer sr-only"
                />
                <span className="flex h-7 w-full items-center">
                  <span className="relative block h-3 w-full overflow-hidden rounded-full bg-ns-secondary">
                    <span
                      style={{ transitionDelay: `${index * 30}ms` }}
                      className={cn(
                        'absolute inset-0 origin-left transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]',
                        confirmed ? 'bg-ns-text' : 'bg-ns-warning',
                        confirmed || drafted ? 'scale-x-100' : 'scale-x-0',
                      )}
                    />
                  </span>
                </span>
                <span className={cn(
                  'mt-1 flex min-h-11 w-full items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-ns-text',
                  selected ? 'text-ns-text' : 'text-ns-muted group-hover:text-ns-text',
                )}>
                  {shortCheckpointLabel(checkpoint)}
                </span>
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function WhereWasIClient({ initialData }: { initialData: WhereWasISession }) {
  const [data, setData] = useState(initialData)
  const defaultCheckpoint = data.authorizedCheckpoint?.id ??
    data.checkpoints[Math.min(3, data.checkpoints.length - 1)]?.id ?? ''
  const [draftCheckpointId, setDraftCheckpointId] = useState(defaultCheckpoint)
  const [recapLength, setRecapLength] = useState<'short' | 'long'>('short')
  const [saving, setSaving] = useState(false)
  const [question, setQuestion] = useState('Who is this person?')
  const [characterId, setCharacterId] = useState('')
  const [asking, setAsking] = useState(false)
  const [answer, setAnswer] = useState<GroundedAnswer | null>(null)
  const [error, setError] = useState('')
  const requestVersion = useRef(0)

  const draftCheckpoint = useMemo(
    () => data.checkpoints.find(checkpoint => checkpoint.id === draftCheckpointId) ?? null,
    [data.checkpoints, draftCheckpointId],
  )
  const boundaryChanged = data.authorizedCheckpoint?.id !== draftCheckpointId
  const recap = recapLength === 'short' ? data.shortRecap : data.longRecap

  async function confirmProgress() {
    if (!draftCheckpointId) return
    requestVersion.current += 1
    setSaving(true)
    setAsking(false)
    setAnswer(null)
    setError('')
    try {
      const response = await fetch('/api/where-was-i/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titleSlug: data.title.slug, checkpointId: draftCheckpointId }),
      })
      const body = await response.json() as WhereWasISession & { error?: string }
      if (!response.ok) throw new Error(body.error || 'Could not update progress.')
      setData(body)
      setAnswer(null)
      setCharacterId('')
      setQuestion('Who is this person?')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update progress.')
    } finally {
      setSaving(false)
    }
  }

  async function askQuestion(questionOverride?: string, characterOverride?: string) {
    const nextQuestion = (questionOverride ?? question).trim()
    const nextCharacterId = characterOverride ?? characterId
    if (!nextQuestion || !data.authorizedCheckpoint) return
    const requestId = ++requestVersion.current
    setQuestion(nextQuestion)
    setCharacterId(nextCharacterId)
    setAsking(true)
    setError('')
    try {
      const response = await fetch('/api/where-was-i/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleSlug: data.title.slug,
          question: nextQuestion,
          ...(nextCharacterId ? { characterId: nextCharacterId } : {}),
        }),
      })
      const body = await response.json() as { answer?: GroundedAnswer; error?: string }
      if (!response.ok || !body.answer) throw new Error(body.error || 'Could not answer that question.')
      if (requestId === requestVersion.current) setAnswer(body.answer)
    } catch (reason) {
      if (requestId === requestVersion.current) {
        setError(reason instanceof Error ? reason.message : 'Could not answer that question.')
      }
    } finally {
      if (requestId === requestVersion.current) setAsking(false)
    }
  }

  function submitQuestion(event: FormEvent) {
    event.preventDefault()
    void askQuestion()
  }

  return (
    <div className="mx-auto min-h-dvh max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:pt-16">
      <header className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
        <div>
          <h1 className="font-display text-5xl text-ns-text lg:text-7xl">
            Remember the story. <span className="ns-unredact" style={{ animationDelay: '420ms' }}>Not the future.</span>
          </h1>
          <p className="ns-rise mt-5 max-w-2xl text-lg leading-relaxed text-ns-muted" style={{ animationDelay: '80ms' }}>
            A source-backed memory refresh that stops exactly at the episode you confirm. Opening this page never advances your Plot Passport.
          </p>
        </div>
        <aside className="ns-rise rounded-2xl bg-ns-surface p-6" style={{ animationDelay: '160ms' }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-xl font-bold text-ns-text">{data.title.name}</h2>
            <Badge variant="success">Source v{data.title.sourceVersion}</Badge>
          </div>
          <p className="mt-1 text-sm text-ns-muted">Original demo mystery</p>
          <p className="mt-3 text-sm leading-relaxed text-ns-muted">{data.title.premise}</p>
          <p className="mt-3 border-t border-ns-border pt-3 text-xs leading-relaxed text-ns-muted">{data.title.rightsNote}</p>
        </aside>
      </header>

      <div className="mt-10 space-y-6 lg:mt-14">
        <section aria-labelledby="resume-checkpoint-label" className="rounded-3xl bg-ns-surface p-6 sm:p-10">
          <fieldset>
            <legend id="resume-checkpoint-label" className="font-display text-3xl text-ns-text sm:text-4xl">
              Where did you stop?
            </legend>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-ns-muted">
              {data.title.format === 'series'
                ? 'Choose the last episode you completely finished. This is an episode boundary, not a guessed scene timestamp.'
                : 'Choose a supported film checkpoint. NoSpoilers will not imply scene-level precision it does not have.'}
            </p>
            <div className="mt-6">
              <CheckpointRail
                checkpoints={data.checkpoints}
                draftId={draftCheckpointId}
                authorizedId={data.authorizedCheckpoint?.id ?? null}
                onSelect={setDraftCheckpointId}
              />
            </div>
          </fieldset>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p key={`${draftCheckpointId}-${boundaryChanged}`} className={cn('min-w-0 animate-fade-up text-sm leading-relaxed', boundaryChanged && data.authorizedCheckpoint ? 'text-ns-warning' : 'text-ns-muted')}>
              {boundaryChanged && data.authorizedCheckpoint
                ? `This is only a draft. Your authorized boundary remains ${data.authorizedCheckpoint.label.toLowerCase()} until you confirm.`
                : data.authorizedCheckpoint
                  ? `Everything below stops at ${data.authorizedCheckpoint.label.toLowerCase()}.`
                  : draftCheckpoint?.label}
            </p>
            <Button
              size="lg"
              onClick={() => void confirmProgress()}
              disabled={!draftCheckpoint || !boundaryChanged}
              loading={saving}
              className="flex-shrink-0"
            >
              {!saving && <LockIcon size={18} />}
              {saving ? 'Confirming…' : boundaryChanged ? `Confirm ${draftCheckpoint?.label.toLowerCase()}` : 'Boundary confirmed'}
            </Button>
          </div>
        </section>

        {error ? (
          <div role="alert" className="rounded-xl bg-ns-danger/10 px-4 py-3 text-sm text-ns-danger">{error}</div>
        ) : null}

        {!data.authorizedCheckpoint ? (
          <section className="rounded-2xl bg-ns-surface px-6 py-14 text-center">
            <h2 className="font-heading text-2xl font-bold text-ns-text">No story material has been authorized</h2>
            <p className="mx-auto mt-2 max-w-lg text-base leading-relaxed text-ns-muted">
              Confirm a completed episode above. Until then, no recap, character facts, or question evidence is retrieved.
            </p>
          </section>
        ) : (
          <div key={data.authorizedCheckpoint.id} className="animate-fade-up space-y-6">
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl bg-ns-surface p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-heading text-2xl font-bold text-ns-text">
                    Up through {data.authorizedCheckpoint.label.toLowerCase()}
                  </h2>
                  <PillTabs
                    label="Recap length"
                    value={recapLength}
                    onChange={setRecapLength}
                    options={[
                      { value: 'short', label: '30 seconds' },
                      { value: 'long', label: '2 minutes' },
                    ]}
                  />
                </div>
                <div key={recapLength} className="mt-5 animate-fade-up"><ClaimList claims={recap} /></div>
              </div>

              <div className="rounded-3xl bg-ns-surface p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="font-heading text-2xl font-bold text-ns-text">What are you trying to remember?</h2>
                  <Badge variant="info">{data.modelConfigured ? 'AI evidence selection on' : 'Extractive mode'}</Badge>
                </div>
                <form onSubmit={submitQuestion} className="mt-5 space-y-3">
                  <div className="relative">
                    <SearchIcon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ns-muted" />
                    <input
                      value={question}
                      maxLength={500}
                      aria-label="Ask about the story so far"
                      onChange={event => { setQuestion(event.target.value); setCharacterId('') }}
                      placeholder="Who is this person? What do they know?"
                      className="min-h-14 w-full rounded-xl border border-ns-border-strong bg-ns-bg py-2 pl-11 pr-28 text-base text-ns-text transition-colors duration-150 placeholder:text-ns-subtle focus:border-ns-text focus:outline-none focus:ring-1 focus:ring-ns-text"
                    />
                    <button
                      type="submit"
                      disabled={asking || !question.trim()}
                      className="absolute right-1.5 top-1/2 min-h-11 -translate-y-1/2 rounded-full bg-ns-text px-5 text-sm font-semibold text-ns-bg transition-colors duration-150 hover:bg-ns-muted disabled:cursor-not-allowed disabled:bg-ns-surface-3 disabled:text-ns-muted"
                    >
                      {asking ? 'Checking…' : 'Ask'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.suggestedQuestions.map(suggestion => (
                      <button
                        key={`${suggestion.question}-${suggestion.characterId}`}
                        type="button"
                        onClick={() => void askQuestion(suggestion.question, suggestion.characterId)}
                        className="min-h-11 rounded-full bg-ns-surface-2 px-4 text-sm font-semibold text-ns-muted transition-colors duration-150 hover:bg-ns-surface-3 hover:text-ns-text"
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                </form>

                {answer ? (
                  <div
                    key={`${answer.text}-${answer.evidenceIds.join('|')}`}
                    aria-live="polite"
                    className={cn(
                      'mt-5 animate-fade-up rounded-xl p-4',
                      answer.status === 'supported' ? 'bg-ns-success/10' : 'bg-ns-warning/10',
                    )}
                  >
                    <p className="text-base leading-relaxed text-ns-text">{answer.text}</p>
                    {answer.references.length ? (
                      <div className="mt-2">
                        <EvidenceReferences
                          references={answer.references}
                          label="Why this answer is allowed"
                          availabilityPrefix="Available from"
                        />
                      </div>
                    ) : null}
                    <p className="mt-3 text-xs leading-relaxed text-ns-muted">
                      {answer.cached ? 'Cached for your account · ' : ''}{answer.method === 'model-selected' ? `Model selected evidence${answer.model ? ` · ${answer.model}` : ''}` : 'Deterministic extractive fallback'}
                      {answer.latencyMs !== undefined ? ` · ${answer.latencyMs} ms` : ''}
                      {answer.estimatedCostMicros !== undefined ? ` · $${(answer.estimatedCostMicros / 1_000_000).toFixed(6)}` : ''}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="pt-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-display text-3xl text-ns-text sm:text-4xl">Who everyone is and what they know</h2>
                <p className="max-w-md text-sm leading-relaxed text-ns-muted">
                  Viewer-established context is kept separate from each character&rsquo;s knowledge. Every line below is checkpoint-specific.
                </p>
              </div>
              <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
                {data.characters.map((character, index) => (
                  <article key={character.id} className={cn('rounded-2xl bg-ns-surface p-6', index > 1 && 'ns-reveal')}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-heading text-xl font-bold text-ns-text">{character.displayName}</h3>
                      <button
                        type="button"
                        onClick={() => void askQuestion('Who is this person?', character.id)}
                        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ns-secondary-readable transition-colors duration-150 hover:text-ns-text"
                      >
                        Ask who this is <ArrowRightIcon size={14} />
                      </button>
                    </div>
                    <div className="mt-3 grid gap-5 sm:grid-cols-2">
                      <div>
                        <p className="mb-2 text-sm font-semibold text-ns-info">Viewer-established</p>
                        <ClaimList dense claims={[...character.viewerContext, ...character.relationships]} />
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-semibold text-ns-success">What this character knows</p>
                        <ClaimList dense claims={character.characterKnowledge} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        <section className="ns-reveal flex flex-col gap-4 rounded-2xl bg-ns-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <LockIcon size={20} className="mt-0.5 flex-shrink-0 text-ns-muted" />
            <div>
              <h2 className="font-heading text-lg font-bold text-ns-text">One Passport, two privacy boundaries</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ns-muted">
                Where Was I? reads your authenticated server record. NoSpoilers Shield keeps its existing on-device promise: only protected title names are sent when you explicitly sync, never recap evidence, questions, or character data.
              </p>
            </div>
          </div>
          <Button href="/plot-passport" variant="outline" className="flex-shrink-0">Open Plot Passport</Button>
        </section>
      </div>
    </div>
  )
}
