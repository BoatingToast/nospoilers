'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRightIcon, CheckIcon, LockIcon } from '@/components/icons'
import {
  FACET_IDS,
  QUESTION_LIMIT,
  computeView,
  emptyState,
  evidenceForAnswer,
  evidenceForCorrection,
  evidenceForHypothesis,
  evidenceForTweak,
  otherPresentFacets,
  ratingsPrior,
  sanitizeState,
  selectNextQuestion,
  summarizeChange,
  withTweak,
  type AnswerChoice,
  type HypothesisNote,
  type PreferenceExtraction,
  type TasteChange,
  type TasteEvidence,
  type TasteHypothesis,
  type TasteQuestion,
  type TasteState,
  type TasteTweak,
} from '@/lib/taste/engine'
import { FIXTURE_VIEWERS } from '@/lib/taste/fixtures'
import {
  FACET_COPY,
  answerNotes,
  extractPreferences,
  templateHypothesis,
  templateQuestion,
  type QuestionSpec,
  type WordedQuestion,
} from '@/lib/taste/language'
import type { TasteBootstrap } from '@/services/taste-reasons'
import {
  ChangePanel,
  Eyebrow,
  FilmPoster,
  HypothesisCard,
  PickCard,
  SpoilerModeControl,
  Tag,
  TasteLedger,
  facetList,
  type SpoilerMode,
} from './parts'
import styles from './taste.module.css'

type Stage = 'films' | 'questions' | 'results'
type Boot = TasteBootstrap & { ai: 'live' | 'fixture' }
type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; detail: string }
  | { kind: 'error'; detail: string }

const STAGES: Array<{ id: Stage; label: string }> = [
  { id: 'films', label: 'Your films' },
  { id: 'questions', label: 'Three questions' },
  { id: 'results', label: 'Reasons and picks' },
]

/** "Change one thing": temporary explorations, one at a time. */
const TWEAKS: TasteTweak[] = [
  { facet: 'momentum', direction: 1 },
  { facet: 'momentum', direction: -1 },
  { facet: 'intensity', direction: -1 },
  { facet: 'humor', direction: 1 },
  { facet: 'grounding', direction: 1 },
  { facet: 'spectacle', direction: -1 },
  { facet: 'atmosphere', direction: 1 },
  { facet: 'ideas', direction: 1 },
]

const PREFERENCE_NAMES: Record<string, string> = {
  pacingScale: 'pacing',
  toneScale: 'tone',
  violenceTolerance: 'violence tolerance',
  emotionalIntensity: 'emotional intensity',
  complexity: 'complexity',
  plotTwists: 'suspense',
  escapism: 'escapism',
}

/** Identifies the part of a session that an explicit save would write. */
function durableKey(evidence: TasteEvidence[], notes: Record<string, HypothesisNote>): string {
  return JSON.stringify([
    evidence.filter(item => item.scope !== 'tweak').map(item => [item.facet, item.value, item.weight, item.note]),
    notes,
  ])
}

function tweakLabel(tweak: TasteTweak): string {
  return tweak.direction === 1 ? FACET_COPY[tweak.facet].more : FACET_COPY[tweak.facet].less
}

export default function WhyDidILoveThat({ userId, demo }: { userId: string; demo: boolean }) {
  const [boot, setBoot] = useState<Boot | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>('films')
  const [state, setState] = useState<TasteState>(emptyState)
  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState<SpoilerMode>('safe')
  const [stories, setStories] = useState<Record<string, string>>({})
  const [lastChange, setLastChange] = useState<{ cause: string; change: TasteChange } | null>(null)
  const [freshRoles, setFreshRoles] = useState<string[]>([])
  const [worded, setWorded] = useState<{ id: string; text: WordedQuestion; source: 'live' | 'fixture' } | null>(null)
  const [hypothesisText, setHypothesisText] = useState<Record<string, string>>({})
  const [correction, setCorrection] = useState('')
  const [correctionNote, setCorrectionNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [keepTweak, setKeepTweak] = useState(false)
  const [save, setSave] = useState<SaveStatus>({ kind: 'idle' })
  const [savedKey, setSavedKey] = useState(() => durableKey([], {}))
  const headingRef = useRef<HTMLHeadingElement>(null)
  const railRef = useRef<HTMLOListElement>(null)
  const previousStage = useRef<Stage | null>(null)
  const freshTimer = useRef<number | null>(null)
  const storageKey = `nospoilers-taste-${userId}${demo ? '-demo' : ''}`

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setBoot(null)
    setLoadError(null)
    setReady(false)

    fetch(`/api/pro/taste-reasons${demo ? '?demo=1' : ''}`)
      .then(async response => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.message ?? 'Taste Lab could not load.')
        return payload as Boot
      })
      .then(payload => {
        if (cancelled) return
        const known = new Set(payload.rated.map(film => film.tmdbId))
        let restored: { state: TasteState; stage: Stage; mode: SpoilerMode } | null = null
        try {
          const raw = JSON.parse(window.sessionStorage.getItem(storageKey) ?? 'null') as { state?: unknown; stage?: Stage; mode?: SpoilerMode } | null
          if (raw?.state) {
            restored = {
              state: sanitizeState(raw.state),
              stage: raw.stage === 'questions' || raw.stage === 'results' ? raw.stage : 'films',
              mode: raw.mode === 'blind' || raw.mode === 'standard' ? raw.mode : 'safe',
            }
          }
        } catch {
          // Storage is optional; the experience also works in private browsing.
        }

        if (restored && restored.state.confirmedIds.some(id => known.has(id))) {
          setState({ ...restored.state, confirmedIds: restored.state.confirmedIds.filter(id => known.has(id)) })
          setStage(restored.stage)
          setMode(restored.mode)
        } else if (payload.saved && payload.saved.evidence.length > 0) {
          setState({
            ...emptyState(),
            confirmedIds: payload.saved.confirmedIds.filter(id => known.has(id)),
            evidence: payload.saved.evidence,
            notes: payload.saved.notes,
          })
          setStage('results')
        } else {
          setState(emptyState())
          setStage('films')
        }
        setSavedKey(durableKey(payload.saved?.evidence ?? [], payload.saved?.notes ?? {}))
        setBoot(payload)
        setReady(true)
      })
      .catch(error => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Taste Lab could not load.')
      })

    return () => { cancelled = true }
  }, [demo, storageKey])

  useEffect(() => {
    if (!ready) return
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify({ state, stage, mode }))
    } catch {
      // Keep the session usable when storage is unavailable.
    }
  }, [mode, ready, stage, state, storageKey])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const rated = useMemo(() => boot?.rated ?? [], [boot])
  const candidates = useMemo(() => boot?.candidates ?? [], [boot])
  const prior = useMemo(() => ratingsPrior(rated), [rated])
  const ratedById = useMemo(() => new Map(rated.map(film => [film.tmdbId, film])), [rated])
  const view = useMemo(
    () => computeView(rated, candidates, prior, state.evidence),
    [candidates, prior, rated, state.evidence],
  )
  // Hypotheses and the ledger describe what was learned. A temporary
  // "change one thing" only ever affects the picks.
  const learned = useMemo(() => state.evidence.filter(item => item.scope !== 'tweak'), [state.evidence])
  const baseView = useMemo(
    () => computeView(rated, candidates, prior, learned),
    [candidates, learned, prior, rated],
  )
  const liked = useMemo(() => rated.filter(film => film.affinity > 0.2).slice(0, 8), [rated])
  const question = useMemo<TasteQuestion | null>(() => {
    if (!boot || stage !== 'questions') return null
    return selectNextQuestion({
      rated, candidates, prior,
      confirmedIds: state.confirmedIds,
      evidence: state.evidence,
      asked: state.asked,
    })
  }, [boot, candidates, prior, rated, stage, state.asked, state.confirmedIds, state.evidence])
  const activeTweak = state.evidence.find(item => item.scope === 'tweak') ?? null
  const strongest = useMemo(
    () => [...FACET_IDS]
      .filter(facet => baseView.belief[facet].mean > 0.1)
      .sort((a, b) => baseView.belief[b].mean - baseView.belief[a].mean)
      .slice(0, 2),
    [baseView.belief],
  )
  const unsaved = durableKey(state.evidence, state.notes) !== savedKey

  const questionSpec = useCallback((item: TasteQuestion): QuestionSpec => ({
    kind: item.kind,
    titles: item.filmIds.map(id => ratedById.get(id)?.title ?? 'this film'),
    facetA: item.facetA,
    facetB: item.facetB,
  }), [ratedById])

  // ── Commit: every change to the profile goes through here ───────────────────
  const commit = useCallback((next: TasteState, cause: string) => {
    const after = computeView(rated, candidates, prior, next.evidence)
    const change = summarizeChange(view, after)
    setState(next)
    setLastChange({ cause, change })
    setSave({ kind: 'idle' })
    setFreshRoles(change.picks.map(item => item.role))
    if (freshTimer.current) window.clearTimeout(freshTimer.current)
    freshTimer.current = window.setTimeout(() => setFreshRoles([]), 2400)
  }, [candidates, prior, rated, view])

  useEffect(() => () => {
    if (freshTimer.current) window.clearTimeout(freshTimer.current)
  }, [])

  // No question worth asking means the questions are done.
  useEffect(() => {
    if (ready && stage === 'questions' && !question) setStage('results')
  }, [question, ready, stage])

  useEffect(() => {
    if (!ready) return
    headingRef.current?.focus({ preventScroll: true })
    if (previousStage.current !== null && previousStage.current !== stage) {
      railRef.current?.scrollIntoView({ block: 'start' })
    }
    previousStage.current = stage
  }, [ready, stage])

  // ── Wording ─────────────────────────────────────────────────────────────────
  const assist = useCallback(async <T,>(body: Record<string, unknown>): Promise<T | null> => {
    try {
      const response = await fetch('/api/pro/taste-reasons/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(14_000),
      })
      return response.ok ? await response.json() as T : null
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (!question || !boot || boot.ai !== 'live') return
    const spec = questionSpec(question)
    const fallback = { id: question.id, text: templateQuestion(spec), source: 'fixture' as const }
    let cancelled = false
    setWorded(null)
    assist<{ worded: WordedQuestion; source: 'live' | 'fixture' }>({ kind: 'question', question: spec })
      .then(result => {
        if (cancelled) return
        setWorded(result ? { id: question.id, text: result.worded, source: result.source } : fallback)
      })
    return () => { cancelled = true }
  }, [assist, boot, question, questionSpec])

  const hypothesisKeys = baseView.hypotheses.map(item => item.key).join('|')
  useEffect(() => {
    if (!boot || boot.ai !== 'live' || stage !== 'results') return
    const missing = baseView.hypotheses.filter(item => !hypothesisText[item.key])
    if (missing.length === 0) return
    let cancelled = false
    assist<{ items: Array<{ key: string; text: string }> }>({
      kind: 'hypotheses',
      hypotheses: missing.map(({ key, kind, facet, other }) => ({ key, kind, facet, other })),
    }).then(result => {
      if (cancelled || !result) return
      setHypothesisText(current => ({ ...current, ...Object.fromEntries(result.items.map(item => [item.key, item.text])) }))
    })
    return () => { cancelled = true }
    // Keys identify the hypotheses; rewording is only needed when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assist, boot, hypothesisKeys, stage])

  const readCorrection = useCallback(async (text: string): Promise<PreferenceExtraction[]> => {
    if (boot?.ai === 'live') {
      const result = await assist<{ extractions: PreferenceExtraction[] }>({ kind: 'correction', text })
      if (result) return result.extractions
    }
    return extractPreferences(text)
  }, [assist, boot])

  // ── Story text, only when the member's spoiler mode allows it ───────────────
  const pickIds = view.picks.map(pick => pick.film.tmdbId).join(',')
  useEffect(() => {
    if (mode === 'blind' || stage !== 'results' || !pickIds) return
    const missing = pickIds.split(',').filter(id => stories[`${mode}:${id}`] === undefined)
    if (missing.length === 0) return
    let cancelled = false
    fetch(`/api/pro/taste-reasons/story?ids=${missing.join(',')}&mode=${mode}${demo ? '&demo=1' : ''}`)
      .then(response => response.ok ? response.json() : { stories: {} })
      .then((payload: { stories: Record<string, string> }) => {
        if (cancelled) return
        setStories(current => ({
          ...current,
          ...Object.fromEntries(missing.map(id => [`${mode}:${id}`, payload.stories[id] ?? 'No premise is available for this film.'])),
        }))
      })
      .catch(() => undefined)
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, mode, pickIds, stage])

  // ── Actions ─────────────────────────────────────────────────────────────────
  function toggleFilm(id: number) {
    setState(current => ({
      ...current,
      confirmedIds: current.confirmedIds.includes(id)
        ? current.confirmedIds.filter(item => item !== id)
        : [...current.confirmedIds, id],
    }))
  }

  function answer(choice: AnswerChoice) {
    if (!question) return
    const spec = questionSpec(question)
    const now = new Date().toISOString()
    const items = evidenceForAnswer(
      question,
      choice,
      answerNotes(spec, choice),
      now,
      question.kind === 'contrast' ? otherPresentFacets(ratedById.get(question.filmIds[0]), question) : [],
    )
    const cause = choice === 'unsure'
      ? 'You were not sure, so nothing was assumed.'
      : choice === 'both' ? answerNotes(spec, choice).both
        : choice === 'neither' ? answerNotes(spec, choice).neither
          : answerNotes(spec, choice).chosen
    commit({
      ...state,
      asked: [...state.asked, {
        id: question.id, kind: question.kind, filmIds: question.filmIds,
        facetA: question.facetA, facetB: question.facetB, choice,
      }],
      evidence: [...state.evidence, ...items],
    }, `${cause}.`)
  }

  function verdict(hypothesis: TasteHypothesis, text: string, value: 'agree' | 'disagree') {
    if (state.notes[hypothesis.key]?.status === value) return
    const note = value === 'agree' ? `You agreed: “${text}”` : `You disagreed: “${text}”`
    // A second verdict on the same hypothesis replaces the first.
    const suffix = `@${hypothesis.key}`
    const items = evidenceForHypothesis(hypothesis, value, note, new Date().toISOString())
      .map(item => ({ ...item, id: `${item.id}${suffix}` }))
    commit({
      ...state,
      evidence: [...state.evidence.filter(item => !item.id.endsWith(suffix)), ...items],
      notes: { ...state.notes, [hypothesis.key]: { status: value, text: state.notes[hypothesis.key]?.text ?? null } },
    }, value === 'agree' ? 'You confirmed a hypothesis.' : 'You rejected a hypothesis.')
  }

  async function applyText(text: string, hypothesis: TasteHypothesis | null) {
    setBusy(true)
    setCorrectionNote(null)
    const extractions = await readCorrection(text)
    setBusy(false)
    const notes = hypothesis
      ? { ...state.notes, [hypothesis.key]: { status: 'refined' as const, text } }
      : state.notes
    if (extractions.length === 0) {
      setState({ ...state, notes })
      setCorrectionNote(hypothesis
        ? 'Kept your wording. It did not name a quality we rank by, so the picks are unchanged.'
        : 'That did not name a quality we rank by. Try naming what you liked or did not, such as the pace, the mood, or the violence.')
      return
    }
    const read = extractions
      .map(item => `${item.direction === 1 ? 'more' : 'less'} ${FACET_COPY[item.facet].label.toLowerCase()}`)
      .join(', ')
    commit({
      ...state,
      evidence: [...state.evidence, ...evidenceForCorrection(extractions, new Date().toISOString())],
      notes,
    }, `Read “${text}” as: ${read}.`)
    setCorrection('')
  }

  function onCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = correction.trim()
    if (text.length < 3 || busy) return
    void applyText(text, null)
  }

  function setTweak(tweak: TasteTweak | null) {
    const kept = strongest.length ? `Same ${facetList(strongest)}, ` : ''
    const item = tweak
      ? evidenceForTweak(tweak, `Change one thing: ${tweakLabel(tweak).toLowerCase()}`, new Date().toISOString())
      : null
    setKeepTweak(false)
    commit(
      { ...state, evidence: withTweak(state.evidence, item) },
      tweak ? `${kept}${tweakLabel(tweak).toLowerCase()}. Temporary.` : 'Temporary change cleared.',
    )
  }

  function removeEvidence(id: string) {
    const item = state.evidence.find(entry => entry.id === id)
    commit(
      { ...state, evidence: state.evidence.filter(entry => entry.id !== id) },
      `Removed: ${item?.note || 'one piece of evidence'}.`,
    )
  }

  function startOver() {
    setState(emptyState())
    setStage('films')
    setLastChange(null)
    setSave({ kind: 'idle' })
    setHypothesisText({})
    setCorrectionNote(null)
  }

  async function saveProfile() {
    setSave({ kind: 'saving' })
    try {
      const response = await fetch('/api/pro/taste-reasons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, keepTweak }),
      })
      const payload = await response.json() as {
        saved?: boolean; reason?: string; message?: string
        evidence?: TasteEvidence[]; updatedPreferences?: string[]; refreshed?: boolean
      }
      if (!response.ok || !payload.saved) {
        setSave({
          kind: 'error',
          detail: payload.reason === 'storage-unavailable'
            ? 'Saving is not set up on this server yet. What you taught it stays in this browser tab.'
            : payload.message ?? 'Could not save. Try again.',
        })
        return
      }
      // Saved items are now durable; an unsaved temporary change stays temporary.
      const tweak = keepTweak ? [] : state.evidence.filter(item => item.scope === 'tweak')
      setState(current => ({ ...current, evidence: [...(payload.evidence ?? []), ...tweak] }))
      setSavedKey(durableKey(payload.evidence ?? [], state.notes))
      setKeepTweak(false)
      const fields = (payload.updatedPreferences ?? []).map(field => PREFERENCE_NAMES[field] ?? field)
      setSave({
        kind: 'saved',
        detail: fields.length
          ? `Saved. Your ${fields.join(', ')} ${fields.length === 1 ? 'preference was' : 'preferences were'} updated${payload.refreshed ? ' and your recommendations were rebuilt' : ''}.`
          : 'Saved.',
      })
    } catch {
      setSave({ kind: 'error', detail: 'Could not save. Check your connection and try again.' })
    }
  }

  async function forgetProfile() {
    setSave({ kind: 'saving' })
    try {
      const response = await fetch('/api/pro/taste-reasons', { method: 'DELETE' })
      if (!response.ok) throw new Error('failed')
      startOver()
      setSave({ kind: 'saved', detail: 'Your saved taste reasons were removed and earlier preferences restored.' })
    } catch {
      setSave({ kind: 'error', detail: 'Could not remove the saved profile. Try again.' })
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const header = (
    <header className="border-b border-ns-border pb-5">
      <h2 className={`${styles.title} text-ns-text`}>Why did I love that<span>?</span></h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ns-muted sm:text-base">
        Two people can love the same film for different reasons. Confirm a few films, answer up to three questions, and correct what we get wrong.
      </p>
      {boot && (boot.catalog === 'fixture' || boot.ai === 'fixture') && (
        <div className="mt-4 flex flex-wrap gap-2">
          {boot.catalog === 'fixture' && <Tag tone="warning">Fixture mode: sample ratings, not yours</Tag>}
          {boot.ai === 'fixture' && <Tag>Built-in wording: live AI is not configured</Tag>}
        </div>
      )}
    </header>
  )

  if (loadError) {
    return (
      <section aria-label="Why did I love that?" className="mb-10">
        {header}
        <p className="mt-6 text-sm text-ns-danger" role="alert">{loadError}</p>
        <Link href="/pro/taste-lab?demo=1" className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ns-secondary-readable">
          Explore with sample ratings <ArrowRightIcon size={14} />
        </Link>
      </section>
    )
  }

  if (!boot || !ready) {
    return (
      <section aria-label="Why did I love that?" className="mb-10" aria-busy="true">
        {header}
        <p className="mt-6 text-sm text-ns-muted">Reading your ratings…</p>
      </section>
    )
  }

  if (boot.status !== 'ready') {
    return (
      <section aria-label="Why did I love that?" className="mb-10">
        {header}
        <div className="mt-6 max-w-xl">
          <h3 className="font-heading text-xl font-semibold text-ns-text">
            {boot.status === 'needs-ratings' ? 'A few more ratings first' : 'No candidates to rank right now'}
          </h3>
          <p className="mt-2 text-sm leading-6 text-ns-muted">
            {boot.status === 'needs-ratings'
              ? `This works from films you have rated, including at least one you rated highly. You have ${boot.ratingCount} usable ${boot.ratingCount === 1 ? 'rating' : 'ratings'}; four is the minimum.`
              : 'The film catalog did not return enough candidates for your ratings. Try again in a moment.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/ratings" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-ns-secondary px-4 text-sm font-heading font-semibold text-ns-secondary-foreground">
              Rate films <ArrowRightIcon size={14} />
            </Link>
            <Link href="/pro/taste-lab?demo=1" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-ns-border px-4 text-sm font-heading font-semibold text-ns-text">
              Explore with sample ratings
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const stageIndex = STAGES.findIndex(item => item.id === stage)
  // Built-in wording is available immediately; live wording arrives when ready.
  const wording = !question ? null
    : boot.ai === 'live'
      ? (worded?.id === question.id ? worded.text : null)
      : templateQuestion(questionSpec(question))

  return (
    <section aria-label="Why did I love that?" className="mb-12">
      {header}

      {boot.catalog === 'fixture' && (
        <div className="mt-5 border-l-2 border-ns-warning py-1 pl-4 text-sm leading-6 text-ns-muted">
          <p className="text-ns-text">Two sample viewers share this exact rating sheet.</p>
          <ul className="mt-1 space-y-0.5">
            {FIXTURE_VIEWERS.map(viewer => (
              <li key={viewer.id}><span className="text-ns-text">{viewer.name}.</span> {viewer.blurb}</li>
            ))}
          </ul>
          <p className="mt-1">Answer as one, note the picks, start over, then answer as the other. Nothing here is saved.</p>
        </div>
      )}

      <ol ref={railRef} className="mt-6 grid scroll-mt-28 grid-cols-3 border-b border-ns-border" aria-label="Progress">
        {STAGES.map((item, index) => {
          const reachable = index < stageIndex
          const current = item.id === stage
          return (
            <li key={item.id} className={`border-b-2 pb-3 ${current ? 'border-ns-secondary-readable' : 'border-transparent'}`}>
              <button
                type="button"
                disabled={!reachable}
                aria-current={current ? 'step' : undefined}
                onClick={() => setStage(item.id)}
                className={`flex min-h-11 w-full flex-col items-start gap-1 text-left sm:flex-row sm:items-baseline sm:gap-3 ${current ? 'text-ns-text' : 'text-ns-muted'} ${reachable ? 'hover:text-ns-text' : 'cursor-default'}`}
              >
                <span className={`${styles.numeral} text-2xl`}>0{index + 1}</span>
                <span className="font-heading text-xs font-semibold sm:text-sm">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ol>

      {/* ── 01 Your films ─────────────────────────────────────────────────── */}
      {stage === 'films' && (
        <div className={`${styles.settle} mt-8`}>
          <h3 ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-semibold text-ns-text outline-none">
            Which of these do you remember well?
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ns-muted">
            These are films you rated highly. Questions only use the ones you confirm, so you are never asked to compare something you have half forgotten.
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-8">
            {liked.map(film => {
              const selected = state.confirmedIds.includes(film.tmdbId)
              return (
                <li key={film.tmdbId}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${film.title}${selected ? ', confirmed' : ''}`}
                    onClick={() => toggleFilm(film.tmdbId)}
                    className={`block w-full rounded-lg border p-1.5 text-left transition-colors ${selected ? 'border-ns-success bg-ns-success/[0.06]' : 'border-ns-border hover:border-ns-muted'}`}
                  >
                    <FilmPoster film={film} sizes="(max-width: 640px) 45vw, 150px" />
                    <span className="mt-2 flex items-start justify-between gap-2 px-0.5">
                      <span className="min-w-0 text-xs font-semibold leading-4 text-ns-text">{film.title}</span>
                      <span className={`grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border ${selected ? 'border-ns-success bg-ns-success text-ns-bg' : 'border-ns-border text-transparent'}`}>
                        <CheckIcon size={11} strokeWidth={3} />
                      </span>
                    </span>
                    <span className="mt-0.5 block px-0.5 text-[11px] text-ns-muted">You rated it {film.score}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={state.confirmedIds.length < 2}
              onClick={() => setStage('questions')}
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-ns-secondary px-5 text-sm font-heading font-semibold text-ns-secondary-foreground transition-colors hover:bg-ns-secondary/90 disabled:cursor-not-allowed disabled:bg-ns-secondary-dim disabled:text-ns-muted"
            >
              Ask me about these <ArrowRightIcon size={15} />
            </button>
            <p className="text-xs text-ns-muted" aria-live="polite">
              {state.confirmedIds.length < 2
                ? `Confirm at least two. ${state.confirmedIds.length} so far.`
                : `${state.confirmedIds.length} confirmed.`}
            </p>
          </div>
        </div>
      )}

      {/* ── 02 Three questions ────────────────────────────────────────────── */}
      {stage === 'questions' && question && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div key={question.id} className={`${styles.settle} rounded-xl bg-ns-text p-5 text-ns-bg sm:p-8`}>
            <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.18em] text-ns-bg/70">
              Question {state.asked.length + 1} of up to {QUESTION_LIMIT}
            </p>
            <div className="mt-4 flex gap-4">
              {question.filmIds.map(id => {
                const film = ratedById.get(id)
                return film ? <div key={id} className="w-20 flex-shrink-0 text-ns-text sm:w-24"><FilmPoster film={film} sizes="96px" /></div> : null
              })}
              <div className="min-w-0 self-center">
                <h3 ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-semibold leading-tight outline-none sm:text-3xl">
                  {wording ? wording.prompt : 'Finding the right words…'}
                </h3>
                {wording?.context && <p className="mt-2 text-sm leading-6 text-ns-bg/75">{wording.context}</p>}
              </div>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {(['a', 'b'] as const).map(choice => (
                <button
                  key={choice}
                  type="button"
                  disabled={!wording}
                  onClick={() => answer(choice)}
                  className={styles.option}
                >
                  {wording ? (choice === 'a' ? wording.optionA : wording.optionB) : '…'}
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([['both', 'Both'], ['neither', 'Neither'], ['unsure', 'Not sure']] as const).map(([choice, label]) => (
                <button
                  key={choice}
                  type="button"
                  disabled={!wording}
                  onClick={() => answer(choice)}
                  className={styles.optionQuiet}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <aside className="min-w-0">
            <Eyebrow>Why this question</Eyebrow>
            <p className="mt-2 text-sm leading-6 text-ns-text">
              {question.coOccurCount > 1
                ? `${FACET_COPY[question.facetA].label} and ${FACET_COPY[question.facetB].label.toLowerCase()} show up together in ${question.coOccurCount} of the ${question.likedCount} films you rated highest, so your ratings cannot tell which one you were responding to.`
                : `Your ratings leave it open whether ${FACET_COPY[question.facetA].label.toLowerCase()} or ${FACET_COPY[question.facetB].label.toLowerCase()} matters to you.`}
            </p>
            <p className="mt-2 text-sm leading-6 text-ns-muted">
              Of the questions we could ask, this is the one most likely to reorder your picks. On average, about {Math.max(1, Math.round(question.expectedSwaps))} of your top five would change.
            </p>
            {lastChange && state.asked.length > 0 && (
              <div className="mt-5" role="status" aria-label="What changed">
                <ChangePanel cause={lastChange.cause} change={lastChange.change} />
              </div>
            )}
            <button type="button" onClick={() => setStage('results')} className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ns-muted hover:text-ns-text">
              Skip to my picks <ArrowRightIcon size={14} />
            </button>
          </aside>
        </div>
      )}

      {/* ── 03 Reasons and picks ──────────────────────────────────────────── */}
      {stage === 'results' && (
        <div className={`${styles.settle} mt-8 grid gap-10 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-12`}>
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <Eyebrow>What we think</Eyebrow>
            <h3 ref={headingRef} tabIndex={-1} className="mt-1 font-heading text-2xl font-semibold text-ns-text outline-none">
              Three hypotheses. Correct any of them.
            </h3>
            <ol className="mt-4 border-b border-ns-border">
              {baseView.hypotheses.map((hypothesis, index) => {
                const note = state.notes[hypothesis.key]
                const text = note?.text ?? hypothesisText[hypothesis.key] ?? templateHypothesis(hypothesis)
                return (
                  <HypothesisCard
                    key={hypothesis.key}
                    index={index}
                    hypothesis={hypothesis}
                    text={text}
                    note={note}
                    busy={busy}
                    onVerdict={value => verdict(hypothesis, text, value)}
                    onRefine={next => void applyText(next, hypothesis)}
                  />
                )
              })}
            </ol>

            <form onSubmit={onCorrection} className="mt-6">
              <label htmlFor="taste-correction" className="font-heading text-sm font-semibold text-ns-text">
                Tell it what it got wrong
              </label>
              <p className="mt-1 text-xs leading-5 text-ns-muted">One sentence in your own words. Your picks update straight away.</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="taste-correction"
                  value={correction}
                  onChange={event => setCorrection(event.target.value.slice(0, 400))}
                  placeholder="I liked the atmosphere, not the violence"
                  className="min-h-12 min-w-0 flex-1 rounded-lg border border-ns-border bg-ns-bg/60 px-4 text-sm text-ns-text outline-none placeholder:text-ns-muted/60 focus:border-ns-secondary-readable"
                />
                <button type="submit" disabled={busy || correction.trim().length < 3} className="min-h-12 rounded-lg bg-ns-secondary px-5 text-sm font-heading font-semibold text-ns-secondary-foreground disabled:cursor-not-allowed disabled:bg-ns-secondary-dim disabled:text-ns-muted">
                  {busy ? 'Reading…' : 'Apply'}
                </button>
              </div>
              {correctionNote && <p className="mt-2 text-xs leading-5 text-ns-warning">{correctionNote}</p>}
            </form>

            {/* On a phone the picks sit below, so the effect is repeated here. */}
            {lastChange && (
              <div className="mt-5 lg:hidden">
                <ChangePanel key={lastChange.cause + lastChange.change.overlap} cause={lastChange.cause} change={lastChange.change} />
                <a href="#taste-picks" className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-ns-secondary-readable">
                  See your picks <ArrowRightIcon size={14} className="rotate-90" />
                </a>
              </div>
            )}
          </div>

          <div id="taste-picks" className="min-w-0 scroll-mt-28 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <Eyebrow>Three picks</Eyebrow>
            <h3 className="mt-1 font-heading text-2xl font-semibold text-ns-text">A close match, a neighbour, and a stretch.</h3>

            <div className="mt-4">
              <SpoilerModeControl mode={mode} onChange={setMode} />
            </div>

            <fieldset className="mt-6">
              <legend className="font-heading text-sm font-semibold text-ns-text">Change one thing</legend>
              <p className="mt-1 text-xs leading-5 text-ns-muted">
                {strongest.length ? `Same ${facetList(strongest)}, but:` : 'Try a different direction:'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TWEAKS.map(tweak => {
                  const active = activeTweak?.facet === tweak.facet && Math.sign(activeTweak.value) === tweak.direction
                  return (
                    <button
                      key={`${tweak.facet}${tweak.direction}`}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setTweak(active ? null : tweak)}
                      className={`min-h-10 rounded-full border px-3.5 text-xs font-heading font-semibold transition-colors ${active ? 'border-ns-warning bg-ns-warning/10 text-ns-warning' : 'border-ns-border text-ns-muted hover:border-ns-muted hover:text-ns-text'}`}
                    >
                      {tweakLabel(tweak)}
                    </button>
                  )
                })}
              </div>
              {activeTweak && (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ns-muted">
                  <Tag tone="warning">This session only</Tag>
                  <label className="inline-flex min-h-10 items-center gap-2">
                    <input type="checkbox" checked={keepTweak} onChange={event => setKeepTweak(event.target.checked)} className="h-4 w-4 accent-ns-secondary" />
                    Keep this when I save
                  </label>
                  <button type="button" onClick={() => setTweak(null)} className="min-h-10 font-semibold text-ns-text underline underline-offset-4">Clear it</button>
                </div>
              )}
            </fieldset>

            <div className="mt-5 min-h-6" role="status" aria-label="What changed">
              {lastChange && <ChangePanel key={lastChange.cause + lastChange.change.overlap} cause={lastChange.cause} change={lastChange.change} />}
            </div>

            <div className="mt-4 border-b border-ns-border">
              {view.picks.map(pick => (
                <PickCard
                  key={pick.role}
                  pick={pick}
                  mode={mode}
                  story={stories[`${mode}:${pick.film.tmdbId}`]}
                  fresh={freshRoles.includes(pick.role)}
                />
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-ns-muted">
              Picks are ordered by how well a film’s catalog qualities line up with your stated reasons. They are not predictions of how you will rate it.
            </p>
          </div>

          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            <Eyebrow>Taste ledger</Eyebrow>
            <p className="mt-1 text-xs leading-5 text-ns-muted">
              Each bar is an estimate, not a score. The pale band shows how unsure it is. Open a row to see where it came from or take something back.
            </p>
            <div className="mt-3">
              <TasteLedger
                belief={baseView.belief}
                prior={prior}
                evidence={learned}
                temporary={activeTweak ? { facet: activeTweak.facet, label: activeTweak.value > 0 ? FACET_COPY[activeTweak.facet].more : FACET_COPY[activeTweak.facet].less } : null}
                onRemove={removeEvidence}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-ns-border pt-6 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-ns-secondary/15 text-ns-secondary-readable"><LockIcon size={17} /></span>
              <div className="min-w-0 text-sm leading-6" role="status">
                {save.kind === 'saved' ? (
                  <p className="text-ns-success">{save.detail}</p>
                ) : save.kind === 'error' ? (
                  <p className="text-ns-danger">{save.detail}</p>
                ) : boot.catalog === 'fixture' ? (
                  <p className="text-ns-muted">Sample ratings. Nothing here is written to your account.</p>
                ) : unsaved || (activeTweak && keepTweak) ? (
                  <p className="text-ns-text">What you taught it is not saved yet. Saving updates your Movie DNA preferences and rebuilds your recommendations.</p>
                ) : state.evidence.some(item => item.scope === 'saved') ? (
                  <p className="text-ns-muted">Your saved taste reasons are in use.</p>
                ) : (
                  <p className="text-ns-muted">Nothing to save yet. Answer a question or correct a hypothesis.</p>
                )}
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-2">
              {boot.catalog === 'member' && (
                <button
                  type="button"
                  disabled={save.kind === 'saving' || !(unsaved || (activeTweak && keepTweak))}
                  onClick={() => void saveProfile()}
                  className="min-h-11 rounded-lg bg-ns-secondary px-5 text-sm font-heading font-semibold text-ns-secondary-foreground disabled:cursor-not-allowed disabled:bg-ns-secondary-dim disabled:text-ns-muted"
                >
                  {save.kind === 'saving' ? 'Saving…' : 'Save to my Movie DNA'}
                </button>
              )}
              <button type="button" onClick={startOver} className="min-h-11 rounded-lg border border-ns-border px-4 text-sm font-heading font-semibold text-ns-text hover:border-ns-muted">
                Start over
              </button>
              {boot.catalog === 'member' && boot.saved && (
                <button type="button" disabled={save.kind === 'saving'} onClick={() => void forgetProfile()} className="min-h-11 rounded-lg border border-ns-border px-4 text-sm font-heading font-semibold text-ns-muted hover:text-ns-text">
                  Forget saved reasons
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
