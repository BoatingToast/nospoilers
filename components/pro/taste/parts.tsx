'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowRightIcon, CheckIcon, CloseIcon } from '@/components/icons'
import {
  FACET_IDS,
  type FacetId,
  type RatingsPrior,
  type TasteBelief,
  type TasteChange,
  type TasteEvidence,
  type TasteFilm,
  type TasteHypothesis,
  type TastePick,
  type HypothesisNote,
} from '@/lib/taste/engine'
import {
  FACET_COPY,
  ROLE_COPY,
  describeLean,
  matchedSentence,
  reasonSentence,
  sourceLabel,
  tradeoffSentence,
} from '@/lib/taste/language'
import { tmdbImageUrl } from '@/lib/utils'
import styles from './taste.module.css'

export type SpoilerMode = 'blind' | 'safe' | 'standard'

const TILE_TOKENS = ['--ns-chart-1', '--ns-chart-7', '--ns-chart-3', '--ns-chart-4', '--ns-chart-6', '--ns-chart-5']

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.18em] text-ns-secondary-readable">
      {children}
    </p>
  )
}

export function Tag({ tone = 'muted', children }: { tone?: 'muted' | 'warning' | 'success'; children: React.ReactNode }) {
  const color = tone === 'warning'
    ? 'border-ns-warning/40 text-ns-warning'
    : tone === 'success'
      ? 'border-ns-success/40 text-ns-success'
      : 'border-ns-border text-ns-muted'
  return (
    <span className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 font-heading text-[11px] font-semibold uppercase tracking-[0.12em] ${color}`}>
      {children}
    </span>
  )
}

export function FilmPoster({ film, sizes = '160px' }: { film: Pick<TasteFilm, 'tmdbId' | 'title' | 'year' | 'posterPath'>; sizes?: string }) {
  if (film.posterPath) {
    return (
      <div className={styles.poster}>
        <Image src={tmdbImageUrl(film.posterPath, 'w342')} alt="" fill sizes={sizes} className="object-cover" />
      </div>
    )
  }
  const token = TILE_TOKENS[film.tmdbId % TILE_TOKENS.length]
  return (
    <div className={styles.poster}>
      <div className={styles.posterType} style={{ '--tile': `var(${token})` } as React.CSSProperties}>
        <strong>{film.title}</strong>
        <span>{film.year ?? ''}</span>
      </div>
    </div>
  )
}

// ─── Spoiler mode ─────────────────────────────────────────────────────────────

const MODES: Array<{ mode: SpoilerMode; label: string; description: string }> = [
  { mode: 'blind', label: 'Blind', description: 'Reasons only. No story or catalog descriptors.' },
  { mode: 'safe', label: 'Safe', description: 'A short premise and catalog descriptors.' },
  { mode: 'standard', label: 'Standard', description: 'The full synopsis and catalog descriptors.' },
]

/** The same Blind / Safe / Standard control movie pages use. */
export function SpoilerModeControl({ mode, onChange }: { mode: SpoilerMode; onChange: (mode: SpoilerMode) => void }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-ns-border bg-ns-bg/60 p-1" role="group" aria-label="Spoiler safety level">
        {MODES.map(option => (
          <button
            key={option.mode}
            type="button"
            aria-pressed={mode === option.mode}
            onClick={() => onChange(option.mode)}
            className={`min-h-10 rounded-lg px-3 font-body text-xs transition-colors ${
              mode === option.mode
                ? 'bg-ns-secondary text-ns-secondary-foreground'
                : 'text-ns-muted hover:bg-ns-surface hover:text-ns-text'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ns-muted" aria-live="polite">
        {MODES.find(option => option.mode === mode)?.description}
      </p>
    </div>
  )
}

// ─── Hypothesis ───────────────────────────────────────────────────────────────

export function HypothesisCard({
  index,
  hypothesis,
  text,
  note,
  busy,
  onVerdict,
  onRefine,
}: {
  index: number
  hypothesis: TasteHypothesis
  text: string
  note: HypothesisNote | undefined
  busy: boolean
  onVerdict: (verdict: 'agree' | 'disagree') => void
  onRefine: (text: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const fieldId = `hypothesis-${index}`

  const grounding = [
    ...hypothesis.grounding.notes,
    hypothesis.grounding.ratedFilmCount > 0
      ? `${hypothesis.grounding.ratedFilmCount} ${hypothesis.grounding.ratedFilmCount === 1 ? 'film' : 'films'} you rated ${hypothesis.grounding.ratedFilmTone === 'low' ? 'low' : 'highly'}`
      : null,
  ].filter(Boolean)

  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-4 border-t border-ns-border py-5">
      <span className={`${styles.numeral} text-3xl text-ns-muted/70`} aria-hidden="true">0{index + 1}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {hypothesis.tentative && <Tag tone="warning">Tentative</Tag>}
          {note?.status === 'agree' && <Tag tone="success">You agreed</Tag>}
          {note?.status === 'disagree' && <Tag>You disagreed</Tag>}
          {note?.status === 'refined' && <Tag tone="success">Your wording</Tag>}
        </div>

        {editing ? (
          <form
            className="mt-2"
            onSubmit={event => {
              event.preventDefault()
              const next = draft.trim()
              if (next.length < 4) return
              onRefine(next)
              setEditing(false)
            }}
          >
            <label htmlFor={fieldId} className="sr-only">Reword hypothesis {index + 1}</label>
            <textarea
              id={fieldId}
              value={draft}
              onChange={event => setDraft(event.target.value.slice(0, 220))}
              rows={3}
              className="w-full rounded-lg border border-ns-border bg-ns-bg/60 p-3 font-heading text-base leading-snug text-ns-text outline-none focus:border-ns-secondary-readable"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className="min-h-10 rounded-lg bg-ns-secondary px-4 text-xs font-heading font-semibold text-ns-secondary-foreground disabled:opacity-60">
                Use my wording
              </button>
              <button type="button" onClick={() => { setEditing(false); setDraft(text) }} className="min-h-10 rounded-lg border border-ns-border px-4 text-xs font-heading font-semibold text-ns-muted hover:text-ns-text">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-2 font-heading text-lg leading-snug text-ns-text sm:text-xl">{text}</p>
        )}

        {grounding.length > 0 && (
          <p className="mt-2 text-xs leading-5 text-ns-muted">
            {hypothesis.tentative ? 'Thin evidence so far: ' : 'Based on: '}
            {grounding.join(' · ')}
          </p>
        )}

        {!editing && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy} aria-pressed={note?.status === 'agree'} onClick={() => onVerdict('agree')} className="min-h-10 rounded-lg border border-ns-border px-3.5 text-xs font-heading font-semibold text-ns-text transition-colors hover:border-ns-success/60 aria-pressed:border-ns-success/60 aria-pressed:text-ns-success disabled:opacity-60">
              That’s right
            </button>
            <button type="button" disabled={busy} aria-pressed={note?.status === 'disagree'} onClick={() => onVerdict('disagree')} className="min-h-10 rounded-lg border border-ns-border px-3.5 text-xs font-heading font-semibold text-ns-text transition-colors hover:border-ns-warning/60 aria-pressed:border-ns-warning/60 aria-pressed:text-ns-warning disabled:opacity-60">
              Not really
            </button>
            <button type="button" disabled={busy} onClick={() => { setDraft(text); setEditing(true) }} className="min-h-10 rounded-lg border border-ns-border px-3.5 text-xs font-heading font-semibold text-ns-muted transition-colors hover:text-ns-text disabled:opacity-60">
              Reword it
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

// ─── Ledger ───────────────────────────────────────────────────────────────────

function percent(value: number): string {
  return `${Math.max(0, Math.min(100, value))}%`
}

/**
 * The taste representation itself: every facet, where the estimate sits, how
 * unsure it is, where it came from, and a way to take any single item back.
 */
export function TasteLedger({
  belief,
  prior,
  evidence,
  temporary,
  onRemove,
}: {
  belief: TasteBelief
  prior: RatingsPrior
  evidence: TasteEvidence[]
  /** An active "change one thing". Shown on its row, never folded into the estimate. */
  temporary: { facet: FacetId; label: string } | null
  onRemove: (id: string) => void
}) {
  const facets = [...FACET_IDS].sort((a, b) => Math.abs(belief[b].mean) - Math.abs(belief[a].mean))

  return (
    <ul className="border-b border-ns-border">
      {facets.map(facet => {
        const entry = belief[facet]
        const items = evidence.filter(item => item.facet === facet)
        const low = Math.max(-1, entry.mean - entry.sd)
        const high = Math.min(1, entry.mean + entry.sd)
        return (
          <li key={facet} className="border-t border-ns-border py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="font-heading text-sm font-semibold text-ns-text">{FACET_COPY[facet].label}</span>
              <span className="text-xs text-ns-muted">
                {describeLean(entry.mean)}
                {entry.tentative ? ' · unsure' : ''}
                {temporary?.facet === facet && <span className="text-ns-warning"> · for now: {temporary.label.toLowerCase()}</span>}
              </span>
            </div>
            <div className={`${styles.track} mt-2`} role="img" aria-label={`${FACET_COPY[facet].label}: ${describeLean(entry.mean)}${entry.tentative ? ', still unsure' : ''}`}>
              <span className={styles.band} style={{ left: percent(50 + low * 50), width: percent((high - low) * 50) }} />
              <span
                className={styles.fill}
                data-lean={entry.mean < 0 ? 'against' : 'toward'}
                style={entry.mean >= 0
                  ? { left: '50%', width: percent(entry.mean * 50) }
                  : { left: percent(50 + entry.mean * 50), width: percent(-entry.mean * 50) }}
              />
              {items.length > 0 && (
                <span className={styles.ratingsMark} style={{ left: percent(50 + prior[facet].mean * 50 * (prior[facet].weight / (prior[facet].weight + 4))) }} />
              )}
            </div>
            <details className="mt-2 text-xs text-ns-muted">
              <summary className="cursor-pointer py-1 hover:text-ns-text">
                From {entry.sources.length ? entry.sources.map(sourceLabel).join(', ') : 'nothing yet'}
              </summary>
              <ul className="mt-1 space-y-1.5">
                <li>
                  {prior[facet].weight >= 0.5
                    ? `Ratings alone read this as ${describeLean(prior[facet].mean)}${prior[facet].tangledWith ? `, but cannot separate it from ${FACET_COPY[prior[facet].tangledWith].label.toLowerCase()}` : ''}.`
                    : 'Your ratings say little about this.'}
                </li>
                {items.map(item => (
                  <li key={item.id} className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      {item.note || sourceLabel(item.source)}
                      {item.scope === 'session' && <span> (not saved yet)</span>}
                    </span>
                    <button type="button" onClick={() => onRemove(item.id)} aria-label={`Remove: ${item.note || sourceLabel(item.source)}`} className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-md border border-ns-border text-ns-muted hover:text-ns-text">
                      <CloseIcon size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        )
      })}
    </ul>
  )
}

// ─── What changed ─────────────────────────────────────────────────────────────

export function ChangePanel({ cause, change }: { cause: string; change: TasteChange }) {
  const nothing = change.facets.length === 0 && change.picks.length === 0 && change.movers.length === 0
  return (
    <div className={`${styles.settle} border-l-2 border-ns-success bg-ns-success/[0.06] py-3 pl-4 pr-3`}>
      <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-ns-success">What changed</p>
      <p className="mt-1 text-sm leading-6 text-ns-text">{cause}</p>
      {nothing ? (
        <p className="mt-1 text-xs leading-5 text-ns-muted">Nothing moved. That did not change a preference we rank by.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-xs leading-5 text-ns-muted">
          {change.facets.slice(0, 3).map(item => (
            <li key={item.facet}>
              <span className="text-ns-text">{FACET_COPY[item.facet].label}:</span>{' '}
              {describeLean(item.before) === describeLean(item.after)
                ? `still ${describeLean(item.after)}, nudged ${item.after > item.before ? 'up' : 'down'}`
                : <>{describeLean(item.before)} → <span className="text-ns-text">{describeLean(item.after)}</span></>}
            </li>
          ))}
          {change.picks.map(item => (
            <li key={item.role}>
              <span className="text-ns-text">{ROLE_COPY[item.role].label}:</span>{' '}
              {item.beforeTitle ?? 'none'} → <span className="text-ns-text">{item.afterTitle ?? 'none'}</span>
            </li>
          ))}
          {change.picks.length === 0 && change.movers.slice(0, 2).map(item => (
            <li key={item.tmdbId}>
              <span className="text-ns-text">{item.title}</span> moved from #{item.from} to #{item.to} in your ranking
            </li>
          ))}
          {change.picks.length === 0 && change.movers.length === 0 && (
            <li>Your three picks stayed the same.</li>
          )}
        </ul>
      )}
    </div>
  )
}

// ─── Pick ─────────────────────────────────────────────────────────────────────

export function PickCard({
  pick,
  mode,
  story,
  fresh,
}: {
  pick: TastePick
  mode: SpoilerMode
  story: string | undefined
  fresh: boolean
}) {
  const role = ROLE_COPY[pick.role]
  const meta = [pick.film.year, pick.film.runtime ? `${pick.film.runtime} min` : null].filter(Boolean).join(' · ')

  return (
    <article className={`${styles.pick} grid grid-cols-[84px_1fr] gap-4 px-1 py-5 sm:grid-cols-[104px_1fr] sm:gap-5`} data-fresh={fresh} data-role={pick.role}>
      <FilmPoster film={pick.film} sizes="104px" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${styles.numeral} text-xl text-ns-secondary-readable`}>{role.label}</span>
          {fresh && <Tag tone="success">Changed</Tag>}
          {pick.support === 'tentative' && <Tag tone="warning">Tentative</Tag>}
        </div>
        <p className="text-xs text-ns-muted">{role.line}</p>

        <h4 className="mt-2 font-heading text-lg font-semibold leading-tight text-ns-text">{pick.film.title}</h4>
        {meta && <p className="mt-0.5 text-xs text-ns-muted">{meta}</p>}

        <ul className="mt-3 space-y-2">
          {pick.reasons.map(reason => (
            <li key={reason.facet} className="flex gap-2 text-sm leading-5 text-ns-text">
              <CheckIcon size={14} className="mt-0.5 flex-shrink-0 text-ns-success" />
              <span className="min-w-0">
                {reasonSentence(reason.facet, reason.because, reason.tentative)}
                {mode !== 'blind' && reason.tags.length > 0 && (
                  <span className="block text-xs text-ns-muted">Catalog: {reason.tags.join(', ')}</span>
                )}
              </span>
            </li>
          ))}
          {pick.reasons.length === 0 && (
            <li className="text-sm leading-5 text-ns-muted">A well-regarded film that does not clash with anything you told us.</li>
          )}
        </ul>

        {pick.tradeoff && (
          <p className="mt-3 text-sm leading-5 text-ns-muted">{tradeoffSentence(pick.tradeoff.facet, pick.tradeoff.direction, pick.role)}</p>
        )}
        <p className="mt-2 text-xs text-ns-muted">{matchedSentence(pick.matched, pick.of)}</p>

        {mode !== 'blind' && (
          <p className="mt-3 border-t border-ns-border pt-3 text-sm leading-6 text-ns-text">
            {story ?? 'Loading premise…'}
          </p>
        )}

        <Link href={`/movie/${pick.film.tmdbId}`} className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-ns-secondary-readable hover:text-ns-text">
          Open film page <ArrowRightIcon size={14} />
        </Link>
      </div>
    </article>
  )
}

export function facetList(facets: FacetId[]): string {
  const names = facets.map(facet => FACET_COPY[facet].label.toLowerCase())
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
