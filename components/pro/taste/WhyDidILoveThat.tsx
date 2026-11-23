'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { ArrowRightIcon, CheckIcon } from '@/components/icons'
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
  FilmPoster,
  HypothesisCard,
  PickCard,
  SpoilerModeControl,
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
    <header>
      <h2 className="font-display text-3xl text-ns-text sm:text-4xl">Why did I love that?</h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-ns-muted sm:text-lg">
        Two people can love the same film for different reasons. Confirm a few films, answer up to three questions, and correct what we get wrong.
      </p>
      {boot && (boot.catalog === 'fixture' || boot.ai === 'fixture') && (
        <div className="mt-4 flex flex-wrap gap-2">
          {boot.catalog === 'fixture' && <Badge variant="warning" size="md" className="whitespace-normal">Fixture mode: sample ratings, not yours</Badge>}
          {boot.ai === 'fixture' && <Badge size="md" className="whitespace-normal">Built-in wording: live AI is not configured</Badge>}
        </div>
      )}
    </header>
  )

  if (loadError) {
    return (
      <section aria-label="Why did I love that?" className="mb-10 lg:mb-14">
        {header}
        <div className="mt-6 rounded-3xl bg-ns-surface p-6 sm:p-8">
          <p className="text-base text-ns-danger" role="alert">{loadError}</p>
          <Button href="/pro/taste-lab?demo=1" variant="secondary" className="mt-4 bg-ns-surface-2 hover:bg-ns-surface-3">
            Explore with sample ratings <ArrowRightIcon size={15} />
          </Button>
        </div>
      </section>
    )
  }

  if (!boot || !ready) {
    return (
      <section aria-label="Why did I love that?" className="mb-10 lg:mb-14" aria-busy="true">
        {header}
        <p className="mt-6 text-base text-ns-muted">Reading your ratings…</p>
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="aspect-[2/3] rounded-xl" />)}
        </div>
      </section>
    )
  }

  if (boot.status !== 'ready') {
    return (
      <section aria-label="Why did I love that?" className="mb-10 lg:mb-14">
        {header}
        <div className="mt-6 rounded-3xl bg-ns-surface p-7 sm:p-10">
          <h3 className="font-heading text-2xl font-bold text-ns-text">
            {boot.status === 'needs-ratings' ? 'A few more ratings first' : 'No candidates to rank right now'}
          </h3>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-ns-muted">
            {boot.status === 'needs-ratings'
              ? `This works from films you have rated, including at least one you rated highly. You have ${boot.ratingCount} usable ${boot.ratingCount === 1 ? 'rating' : 'ratings'}; four is the minimum.`
              : 'The film catalog did not return enough candidates for your ratings. Try again in a moment.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/ratings">Rate films <ArrowRightIcon size={15} /></Button>
            <Button href="/pro/taste-lab?demo=1" variant="outline">Explore with sample ratings</Button>
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
    <section aria-label="Why did I love that?" className="mb-12 lg:mb-16">
      {header}

      {boot.catalog === 'fixture' && (
        <div className="mt-5 rounded-2xl bg-ns-surface p-5 text-sm leading-6 text-ns-muted sm:p-6">
          <p className="font-semibold text-ns-text">Two sample viewers share this exact rating sheet.</p>
          <ul className="mt-1 space-y-0.5">
            {FIXTURE_VIEWERS.map(viewer => (
              <li key={viewer.id}><span className="text-ns-text">{viewer.name}.</span> {viewer.blurb}</li>
            ))}
          </ul>
          <p className="mt-1">Answer as one, note the picks, start over, then answer as the other. Nothing here is saved.</p>
        </div>
      )}

      <div className="relative mt-7 scroll-mt-28">
        <ol ref={railRef} className="grid scroll-mt-28 grid-cols-3 rounded-full bg-ns-surface p-1" aria-label="Progress">
          {STAGES.map((item, index) => {
            const reachable = index < stageIndex
            const current = item.id === stage
            return (
              <li key={item.id} className="relative z-10 min-w-0">
                <button
                  type="button"
                  disabled={!reachable}
                  aria-current={current ? 'step' : undefined}
                  onClick={() => setStage(item.id)}
                  className={`flex min-h-11 w-full items-center justify-center rounded-full px-2 text-center text-xs font-semibold leading-tight transition-colors duration-200 sm:text-sm ${
                    current ? 'text-ns-bg' : reachable ? 'text-ns-text hover:text-ns-secondary-readable' : 'cursor-default text-ns-muted'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            )
          })}
        </ol>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 left-1 top-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-ns-text transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{ transform: `translateX(${stageIndex * 100}%)` }}
        />
      </div>

      {stage === 'films' && (
        <div className={`${styles.settle} mt-8`}>
          <h3 ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-bold text-ns-text outline-none sm:text-3xl">
            Which of these do you remember well?
          </h3>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-ns-muted">
            These are films you rated highly. Questions only use the ones you confirm, so you are never asked to compare something you have half forgotten.
          </p>
          <ul className="mt-6 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-x-4 lg:grid-cols-8">
            {liked.map(film => {
              const selected = state.confirmedIds.includes(film.tmdbId)
              return (
                <li key={film.tmdbId}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${film.title}${selected ? ', confirmed' : ''}`}
                    onClick={() => toggleFilm(film.tmdbId)}
                    className="group block w-full rounded-xl text-left"
                  >
                    <span className={`relative block rounded-xl ring-2 ring-offset-2 ring-offset-ns-bg transition-shadow duration-150 ${selected ? 'ring-ns-secondary' : 'ring-transparent'}`}>
                      <FilmPoster film={film} sizes="(max-width: 640px) 30vw, 150px" />
                      <span className={`absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-ns-secondary text-ns-secondary-foreground transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${selected ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
                        <CheckIcon size={14} strokeWidth={3} />
                      </span>
                    </span>
                    {film.posterPath && <span className="mt-2 block text-sm font-semibold leading-5 text-ns-text">{film.title}</span>}
                    <span className="mt-1.5 block text-xs text-ns-muted">You rated it {film.score}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button size="lg" disabled={state.confirmedIds.length < 2} onClick={() => setStage('questions')}>
              Ask me about these <ArrowRightIcon size={16} />
            </Button>
            <p key={state.confirmedIds.length} className="animate-fade-up text-sm tabular-nums text-ns-muted" aria-live="polite">
              {state.confirmedIds.length < 2
                ? `Confirm at least two. ${state.confirmedIds.length} so far.`
                : `${state.confirmedIds.length} confirmed.`}
            </p>
          </div>
        </div>
      )}

      {stage === 'questions' && question && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-12">
          <div key={question.id} className={`${styles.settle} rounded-3xl bg-ns-surface p-6 sm:p-10`}>
            <p className="text-sm font-semibold tabular-nums text-ns-muted">
              Question {state.asked.length + 1} of up to {QUESTION_LIMIT}
            </p>
            <div className="mt-4 flex gap-4 sm:gap-6">
              {question.filmIds.map(id => {
                const film = ratedById.get(id)
                return film ? <div key={id} className="w-20 flex-shrink-0 sm:w-28"><FilmPoster film={film} sizes="112px" /></div> : null
              })}
              <div className="min-w-0 self-center">
                <h3 ref={headingRef} tabIndex={-1} className="font-display text-2xl text-ns-text outline-none sm:text-4xl">
                  {wording ? wording.prompt : 'Finding the right words…'}
                </h3>
                {wording?.context && <p className="mt-2 text-base leading-relaxed text-ns-muted">{wording.context}</p>}
              </div>
            </div>

            <div className="mt-7 grid gap-2 sm:grid-cols-2">
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
            <h3 className="font-heading text-lg font-bold text-ns-text">Why this question</h3>
            <p className="mt-2 text-base leading-relaxed text-ns-text">
              {question.coOccurCount > 1
                ? `${FACET_COPY[question.facetA].label} and ${FACET_COPY[question.facetB].label.toLowerCase()} show up together in ${question.coOccurCount} of the ${question.likedCount} films you rated highest, so your ratings cannot tell which one you were responding to.`
                : `Your ratings leave it open whether ${FACET_COPY[question.facetA].label.toLowerCase()} or ${FACET_COPY[question.facetB].label.toLowerCase()} matters to you.`}
            </p>
            <p className="mt-2 text-base leading-relaxed text-ns-muted">
              Of the questions we could ask, this is the one most likely to reorder your picks. On average, about {Math.max(1, Math.round(question.expectedSwaps))} of your top five would change.
            </p>
            {lastChange && state.asked.length > 0 && (
              <div className="mt-5" role="status" aria-label="What changed">
                <ChangePanel cause={lastChange.cause} change={lastChange.change} />
              </div>
            )}
            <button type="button" onClick={() => setStage('results')} className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ns-muted transition-colors hover:text-ns-text">
              Skip to my picks <ArrowRightIcon size={15} />
            </button>
          </aside>
        </div>
      )}

      {stage === 'results' && (
        <div className={`${styles.settle} mt-8 grid gap-10 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-14`}>
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <h3 ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-bold text-ns-text outline-none sm:text-3xl">
              Three hypotheses. Correct any of them.
            </h3>
            <ol className="mt-2 divide-y divide-ns-border border-b border-ns-border">
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

            <form onSubmit={onCorrection} className="mt-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <Input
                    id="taste-correction"
                    label="Tell it what it got wrong"
                    value={correction}
                    onChange={event => setCorrection(event.target.value.slice(0, 400))}
                    placeholder="I liked the atmosphere, not the violence"
                    aria-describedby="taste-correction-help"
                  />
                </div>
                <Button type="submit" variant="secondary" loading={busy} disabled={correction.trim().length < 3} className="sm:min-h-12">
                  {busy ? 'Reading…' : 'Apply'}
                </Button>
              </div>
              <p id="taste-correction-help" className="mt-2 text-sm leading-6 text-ns-muted">One sentence in your own words. Your picks update straight away.</p>
              {correctionNote && <p className="mt-2 animate-fade-up text-sm leading-6 text-ns-warning">{correctionNote}</p>}
            </form>

            {/* On a phone the picks sit below, so the effect is repeated here. */}
            {lastChange && (
              <div className="mt-5 lg:hidden">
                <ChangePanel key={lastChange.cause + lastChange.change.overlap} cause={lastChange.cause} change={lastChange.change} />
                <a href="#taste-picks" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ns-secondary-readable">
                  See your picks <ArrowRightIcon size={15} className="rotate-90" />
                </a>
              </div>
            )}
          </div>

          <div id="taste-picks" className="min-w-0 scroll-mt-28 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <h3 className="font-heading text-2xl font-bold text-ns-text sm:text-3xl">A close match, a neighbour, and a stretch.</h3>

            <div className="mt-5">
              <SpoilerModeControl mode={mode} onChange={setMode} />
            </div>

            <fieldset className="mt-7">
              <legend className="font-heading text-base font-bold text-ns-text">Change one thing</legend>
              <p className="mt-1 text-sm leading-6 text-ns-muted">
                {strongest.length ? `Same ${facetList(strongest)}, but:` : 'Try a different direction:'}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {TWEAKS.map(tweak => {
                  const active = activeTweak?.facet === tweak.facet && Math.sign(activeTweak.value) === tweak.direction
                  return (
                    <button
                      key={`${tweak.facet}${tweak.direction}`}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setTweak(active ? null : tweak)}
                      className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-colors duration-150 ${active ? 'bg-ns-text text-ns-bg' : 'bg-ns-surface text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text'}`}
                    >
                      {tweakLabel(tweak)}
                    </button>
                  )
                })}
              </div>
              {activeTweak && (
                <div className="mt-3 flex animate-fade-up flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ns-muted">
                  <Badge variant="warning" size="md">This session only</Badge>
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={keepTweak} onChange={event => setKeepTweak(event.target.checked)} className="h-5 w-5 accent-ns-secondary" />
                    Keep this when I save
                  </label>
                  <button type="button" onClick={() => setTweak(null)} className="min-h-11 font-semibold text-ns-text underline underline-offset-4">Clear it</button>
                </div>
              )}
            </fieldset>

            <div className="mt-5 min-h-6" role="status" aria-label="What changed">
              {lastChange && <ChangePanel key={lastChange.cause + lastChange.change.overlap} cause={lastChange.cause} change={lastChange.change} />}
            </div>

            <div className="mt-2 divide-y divide-ns-border border-b border-ns-border">
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
            <p className="mt-3 text-sm leading-6 text-ns-muted">
              Picks are ordered by how well a film’s catalog qualities line up with your stated reasons. They are not predictions of how you will rate it.
            </p>
          </div>

          <div className="ns-reveal min-w-0 lg:col-start-1 lg:row-start-2">
            <h3 className="font-heading text-2xl font-bold text-ns-text">Taste ledger</h3>
            <p className="mt-1 text-sm leading-6 text-ns-muted">
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

          <div className="flex flex-col gap-4 rounded-3xl bg-ns-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 lg:col-span-2">
            <div className="min-w-0 text-base leading-relaxed" role="status">
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
            <div className="flex flex-shrink-0 flex-wrap gap-2">
              {boot.catalog === 'member' && (
                <Button
                  loading={save.kind === 'saving'}
                  disabled={!(unsaved || (activeTweak && keepTweak))}
                  onClick={() => void saveProfile()}
                >
                  {save.kind === 'saving' ? 'Saving…' : 'Save to my Movie DNA'}
                </Button>
              )}
              <Button variant="outline" onClick={startOver}>Start over</Button>
              {boot.catalog === 'member' && boot.saved && (
                <Button variant="ghost" disabled={save.kind === 'saving'} onClick={() => void forgetProfile()} className="hover:bg-ns-surface-2">
                  Forget saved reasons
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
