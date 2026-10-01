'use client'

import { useMemo, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import type { GroundedAnswer } from '@/lib/where-was-i'
import type { WhereWasISession } from '@/services/where-was-i'
import { ArrowRightIcon, EyeIcon, LockIcon, SearchIcon } from '@/components/icons'

type SupportedClaim = WhereWasISession['shortRecap'][number]

function EvidenceDetails({ claim }: { claim: SupportedClaim }) {
  return (
    <details className="mt-3 group">
      <summary className="cursor-pointer list-none text-[10px] font-heading font-semibold uppercase tracking-[0.15em] text-ns-secondary-readable hover:text-white">
        {claim.references.length} evidence {claim.references.length === 1 ? 'reference' : 'references'} <span className="group-open:hidden">＋</span><span className="hidden group-open:inline">−</span>
      </summary>
      <div className="mt-2 space-y-2 border-l border-ns-secondary/30 pl-3">
        {claim.references.map(reference => (
          <div key={reference.id} className="text-xs leading-5 text-ns-muted">
            <p className="font-semibold text-ns-text">{reference.sourceRef}</p>
            <p>“{reference.excerpt}”</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-ns-muted/75">
              Earliest valid: {reference.earliestCheckpoint}
            </p>
          </div>
        ))}
      </div>
    </details>
  )
}

function ClaimList({ claims }: { claims: SupportedClaim[] }) {
  return (
    <div className="space-y-3">
      {claims.map((claim, index) => (
        <article key={`${claim.text}-${index}`} className="rounded-xl border border-white/[0.06] bg-black/15 px-4 py-3">
          <p className="text-sm leading-6 text-ns-text">{claim.text}</p>
          <EvidenceDetails claim={claim} />
        </article>
      ))}
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
    <main className="min-h-screen overflow-hidden pb-24">
      <section className="relative border-b border-ns-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(104,13,209,0.28),transparent_35%),radial-gradient(circle_at_78%_5%,rgba(96,165,250,0.12),transparent_27%),linear-gradient(180deg,rgba(5,8,20,0.2),rgb(5,8,20))]" />
        <div className="absolute left-[12%] top-10 h-64 w-px bg-gradient-to-b from-transparent via-violet-400/30 to-transparent" />
        <div className="absolute right-[20%] top-0 h-80 w-px rotate-12 bg-gradient-to-b from-transparent via-blue-300/20 to-transparent" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-ns-secondary/35 bg-ns-secondary/10 px-3 py-1.5 text-[11px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-secondary-readable">
              <EyeIcon size={13} /> Where Was I?
            </div>
            <h1 className="max-w-3xl font-display text-5xl leading-[0.92] tracking-wide text-white sm:text-7xl">
              REMEMBER THE STORY.<br /><span className="text-ns-secondary-readable">NOT THE FUTURE.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-ns-muted sm:text-base">
              A source-backed memory refresh that stops exactly at the episode you confirm. Opening this page never advances your Plot Passport.
            </p>
          </div>
          <aside className="rounded-2xl border border-white/10 bg-ns-surface/80 p-5 shadow-2xl shadow-violet-950/30 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-secondary-readable">Original demo mystery</p>
                <h2 className="mt-2 font-heading text-xl font-semibold text-white">{data.title.name}</h2>
              </div>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Source v{data.title.sourceVersion}</span>
            </div>
            <p className="mt-3 text-xs leading-6 text-ns-muted">{data.title.premise}</p>
            <p className="mt-4 border-t border-white/[0.07] pt-4 text-[10px] leading-5 text-ns-muted/80">{data.title.rightsNote}</p>
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
        <section className="grid gap-5 rounded-2xl border border-ns-secondary/25 bg-gradient-to-br from-violet-950/35 to-ns-surface p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[10px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-secondary-readable">1 · Confirm your boundary</p>
            <label htmlFor="resume-checkpoint" className="mt-3 block font-heading text-lg font-semibold text-white">
              Where did you stop?
            </label>
            <p className="mt-1 text-xs leading-5 text-ns-muted">
              {data.title.format === 'series'
                ? 'Choose the last episode you completely finished. This is an episode boundary, not a guessed scene timestamp.'
                : 'Choose a supported film checkpoint. NoSpoilers will not imply scene-level precision it does not have.'}
            </p>
            <select
              id="resume-checkpoint"
              value={draftCheckpointId}
              onChange={event => setDraftCheckpointId(event.target.value)}
              className="mt-4 w-full max-w-md rounded-xl border border-ns-border bg-ns-bg px-4 py-3 text-sm text-white"
            >
              {data.checkpoints.map(checkpoint => (
                <option key={checkpoint.id} value={checkpoint.id}>{checkpoint.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void confirmProgress()}
            disabled={!draftCheckpoint || saving || !boundaryChanged}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ns-secondary px-5 text-sm font-heading font-semibold text-white transition hover:bg-ns-secondary/85 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <LockIcon size={16} />
            {saving ? 'Confirming…' : boundaryChanged ? `Confirm ${draftCheckpoint?.label.toLowerCase()}` : 'Boundary confirmed'}
          </button>
          {boundaryChanged && data.authorizedCheckpoint ? (
            <p className="lg:col-span-2 text-xs text-amber-300">This is only a draft. Your authorized boundary remains {data.authorizedCheckpoint.label.toLowerCase()} until you confirm.</p>
          ) : null}
        </section>

        {error ? (
          <div role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>
        ) : null}

        {!data.authorizedCheckpoint ? (
          <section className="rounded-2xl border border-dashed border-ns-border px-6 py-14 text-center">
            <LockIcon size={38} className="mx-auto text-ns-secondary-readable/50" />
            <h2 className="mt-4 font-heading text-xl font-semibold text-white">No story material has been authorized</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ns-muted">Confirm a completed episode above. Until then, no recap, character facts, or question evidence is retrieved.</p>
          </section>
        ) : (
          <>
            <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-ns-border bg-ns-surface/70 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-secondary-readable">2 · Memory refresh</p>
                    <h2 className="mt-2 font-heading text-xl font-semibold text-white">Up through {data.authorizedCheckpoint.label.toLowerCase()}</h2>
                  </div>
                  <div className="flex rounded-xl border border-ns-border bg-ns-bg p-1 text-xs">
                    <button type="button" onClick={() => setRecapLength('short')} className={`rounded-lg px-3 py-2 ${recapLength === 'short' ? 'bg-ns-secondary text-white' : 'text-ns-muted hover:text-white'}`}>30 seconds</button>
                    <button type="button" onClick={() => setRecapLength('long')} className={`rounded-lg px-3 py-2 ${recapLength === 'long' ? 'bg-ns-secondary text-white' : 'text-ns-muted hover:text-white'}`}>2 minutes</button>
                  </div>
                </div>
                <div className="mt-5"><ClaimList claims={recap} /></div>
              </div>

              <div className="rounded-2xl border border-ns-border bg-[linear-gradient(145deg,rgba(16,21,46,0.95),rgba(11,15,36,0.7))] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-secondary-readable">3 · Ask within the boundary</p>
                    <h2 className="mt-2 font-heading text-xl font-semibold text-white">What are you trying to remember?</h2>
                  </div>
                  <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-2.5 py-1 text-[10px] text-blue-200">{data.modelConfigured ? 'AI evidence selection on' : 'Extractive mode'}</span>
                </div>
                <form onSubmit={submitQuestion} className="mt-5 space-y-3">
                  <div className="flex rounded-xl border border-ns-border bg-ns-bg focus-within:border-ns-secondary-readable/60">
                    <SearchIcon size={18} className="ml-4 mt-3.5 flex-shrink-0 text-ns-muted" />
                    <input
                      value={question}
                      maxLength={500}
                      onChange={event => { setQuestion(event.target.value); setCharacterId('') }}
                      placeholder="Who is this person? What do they know?"
                      className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-ns-muted/60"
                    />
                    <button disabled={asking || !question.trim()} className="m-1 rounded-lg bg-ns-secondary px-4 text-xs font-heading font-semibold text-white disabled:opacity-50">
                      {asking ? 'Checking…' : 'Ask'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.suggestedQuestions.map(suggestion => (
                      <button
                        key={`${suggestion.question}-${suggestion.characterId}`}
                        type="button"
                        onClick={() => void askQuestion(suggestion.question, suggestion.characterId)}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-ns-muted hover:border-ns-secondary/35 hover:text-white"
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                </form>

                {answer ? (
                  <div aria-live="polite" className={`mt-5 rounded-xl border p-4 ${answer.status === 'supported' ? 'border-emerald-400/20 bg-emerald-400/[0.06]' : 'border-amber-400/20 bg-amber-400/[0.06]'}`}>
                    <p className="text-sm leading-6 text-white">{answer.text}</p>
                    {answer.references.length ? (
                      <details className="mt-4 group">
                        <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-300">Why this answer is allowed ＋</summary>
                        <div className="mt-3 space-y-3 border-l border-emerald-400/25 pl-3">
                          {answer.references.map(reference => (
                            <div key={reference.id} className="text-xs leading-5 text-ns-muted">
                              <p className="font-semibold text-ns-text">{reference.sourceRef}</p>
                              <p>“{reference.excerpt}”</p>
                              <p className="text-[10px] uppercase tracking-wider">Available from {reference.earliestCheckpoint}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : null}
                    <p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-ns-muted/70">
                      {answer.cached ? 'Cached for your account · ' : ''}{answer.method === 'model-selected' ? `Model selected evidence${answer.model ? ` · ${answer.model}` : ''}` : 'Deterministic extractive fallback'}
                      {answer.latencyMs !== undefined ? ` · ${answer.latencyMs} ms` : ''}
                      {answer.estimatedCostMicros !== undefined ? ` · $${(answer.estimatedCostMicros / 1_000_000).toFixed(6)}` : ''}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            <section>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-secondary-readable">4 · Character state</p>
                  <h2 className="mt-2 font-heading text-2xl font-semibold text-white">Who everyone is — and what they know</h2>
                </div>
                <p className="max-w-md text-xs leading-5 text-ns-muted">Viewer-established context is kept separate from each character’s knowledge. Every line below is checkpoint-specific.</p>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {data.characters.map(character => (
                  <article key={character.id} className="rounded-2xl border border-ns-border bg-ns-surface/65 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-heading text-lg font-semibold text-white">{character.displayName}</h3>
                      <button type="button" onClick={() => void askQuestion('Who is this person?', character.id)} className="text-[10px] font-semibold uppercase tracking-wider text-ns-secondary-readable hover:text-white">Ask who this is →</button>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-200">Viewer-established</p>
                        <div className="mt-2"><ClaimList claims={[...character.viewerContext, ...character.relationships]} /></div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-300">What this character knows</p>
                        <div className="mt-2"><ClaimList claims={character.characterKnowledge} /></div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        <section className="flex flex-col gap-4 rounded-2xl border border-ns-border bg-ns-surface/45 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <LockIcon size={20} className="mt-0.5 flex-shrink-0 text-ns-secondary-readable" />
            <div>
              <h2 className="font-heading text-sm font-semibold text-white">One Passport, two privacy boundaries</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-ns-muted">Where Was I? reads your authenticated server record. NoSpoilers Shield keeps its existing on-device promise: only protected title names are sent when you explicitly sync, never recap evidence, questions, or character data.</p>
            </div>
          </div>
          <Link href="/plot-passport" className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-ns-secondary-readable hover:text-white">Open Plot Passport <ArrowRightIcon size={13} /></Link>
        </section>
      </div>
    </main>
  )
}
