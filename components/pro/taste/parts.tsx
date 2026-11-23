'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
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

const POSTER_TILES = ['bg-ns-tile-blue', 'bg-ns-tile-peach', 'bg-ns-tile-lilac', 'bg-ns-tile-green', 'bg-ns-tile-yellow', 'bg-ns-tile-rose']

export function FilmPoster({ film, sizes = '160px' }: { film: Pick<TasteFilm, 'tmdbId' | 'title' | 'year' | 'posterPath'>; sizes?: string }) {
  if (film.posterPath) {
    return (
      <span className="relative block aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface-2">
        <Image src={tmdbImageUrl(film.posterPath, 'w342')} alt="" fill sizes={sizes} className="object-cover transition-transform duration-500 group-hover:scale-105" />
      </span>
    )
  }
  // Typographic stand-in when a film has no poster (always, in fixture mode).
  return (
    <span className={`flex aspect-[2/3] flex-col justify-between overflow-hidden rounded-xl p-2.5 ${POSTER_TILES[film.tmdbId % POSTER_TILES.length]}`}>
      <strong className="break-words font-heading text-sm font-bold leading-tight text-ns-text sm:text-base">{film.title}</strong>
      <span className="text-xs tabular-nums text-ns-muted">{film.year ?? ''}</span>
    </span>
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
  const description = MODES.find(option => option.mode === mode)?.description
  return (
    <div>
      <div className="grid grid-cols-3 gap-1 rounded-full bg-ns-surface p-1" role="group" aria-label="Spoiler safety level">
        {MODES.map(option => (
          <button
            key={option.mode}
            type="button"
            aria-pressed={mode === option.mode}
            onClick={() => onChange(option.mode)}
            className={`min-h-11 rounded-full px-3 text-sm font-semibold transition-colors duration-150 ${
              mode === option.mode ? 'bg-ns-text text-ns-bg' : 'text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p key={mode} className="mt-2 animate-fade-up text-sm text-ns-muted" aria-live="polite">{description}</p>
    </div>
  )
}

// ─── Hypothesis ───────────────────────────────────────────────────────────────

const VERDICT_BASE = 'aria-pressed:bg-ns-text aria-pressed:text-ns-bg aria-pressed:border-ns-text'

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
  const hasStatus = hypothesis.tentative || Boolean(note?.status)

  return (
    <li className="py-6">
      {hasStatus && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {hypothesis.tentative && <Badge variant="warning">Tentative</Badge>}
          {note?.status === 'agree' && <Badge variant="success">You agreed</Badge>}
          {note?.status === 'disagree' && <Badge>You disagreed</Badge>}
          {note?.status === 'refined' && <Badge variant="success">Your wording</Badge>}
        </div>
      )}

      {editing ? (
        <form
          className="animate-fade-up"
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
            className="w-full rounded-xl border border-ns-border-strong bg-ns-bg p-3 text-base leading-snug text-ns-text transition-colors focus:border-ns-text focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant="secondary" disabled={busy}>Use my wording</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(text) }}>Cancel</Button>
          </div>
        </form>
      ) : (
        <p className="font-heading text-xl font-semibold leading-snug text-ns-text">{text}</p>
      )}

      {grounding.length > 0 && (
        <p className="mt-2 text-sm leading-6 text-ns-muted">
          {hypothesis.tentative ? 'Thin evidence so far: ' : 'Based on: '}
          {grounding.join(' · ')}
        </p>
      )}

      {!editing && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className={VERDICT_BASE} disabled={busy} aria-pressed={note?.status === 'agree'} onClick={() => onVerdict('agree')}>
            That’s right
          </Button>
          <Button size="sm" variant="outline" className={VERDICT_BASE} disabled={busy} aria-pressed={note?.status === 'disagree'} onClick={() => onVerdict('disagree')}>
            Not really
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setDraft(text); setEditing(true) }}>
            Reword it
          </Button>
        </div>
      )}
    </li>
  )
}

// ─── Ledger ───────────────────────────────────────────────────────────────────

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
    <ul className="divide-y divide-ns-border">
      {facets.map(facet => {
        const entry = belief[facet]
        const items = evidence.filter(item => item.facet === facet)
        const low = Math.max(-1, entry.mean - entry.sd)
        const high = Math.min(1, entry.mean + entry.sd)
        const ratingsPosition = 50 + prior[facet].mean * 50 * (prior[facet].weight / (prior[facet].weight + 4))
        return (
          <li key={facet} className="py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="font-heading text-base font-bold text-ns-text">{FACET_COPY[facet].label}</span>
              <span className="text-sm text-ns-muted">
                {describeLean(entry.mean)}
                {entry.tentative ? ' · unsure' : ''}
                {temporary?.facet === facet && <span className="text-ns-warning"> · for now: {temporary.label.toLowerCase()}</span>}
              </span>
            </div>
            <div className={`${styles.track} mt-2.5`} role="img" aria-label={`${FACET_COPY[facet].label}: ${describeLean(entry.mean)}${entry.tentative ? ', still unsure' : ''}`}>
              <span className={styles.band} style={{ transform: `translateX(${(low + 1) * 50}%) scaleX(${(high - low) / 2})` }} />
              <span className={styles.fill} data-lean={entry.mean < 0 ? 'against' : 'toward'} style={{ transform: `scaleX(${entry.mean})` }} />
              {items.length > 0 && (
                <span className={styles.ratingsMark} style={{ transform: `translateX(${Math.max(0, Math.min(100, ratingsPosition))}%)` }} />
              )}
            </div>
            <details className="group mt-1 text-sm text-ns-muted">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 transition-colors hover:text-ns-text [&::-webkit-details-marker]:hidden">
                From {entry.sources.length ? entry.sources.map(sourceLabel).join(', ') : 'nothing yet'}
              </summary>
              <ul className="animate-fade-up space-y-2 pb-1">
                <li className="leading-6">
                  {prior[facet].weight >= 0.5
                    ? `Ratings alone read this as ${describeLean(prior[facet].mean)}${prior[facet].tangledWith ? `, but cannot separate it from ${FACET_COPY[prior[facet].tangledWith].label.toLowerCase()}` : ''}.`
                    : 'Your ratings say little about this.'}
                </li>
                {items.map(item => (
                  <li key={item.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 leading-6">
                      {item.note || sourceLabel(item.source)}
                      {item.scope === 'session' && <span> (not saved yet)</span>}
                    </span>
                    <button type="button" onClick={() => onRemove(item.id)} aria-label={`Remove: ${item.note || sourceLabel(item.source)}`} className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full text-ns-muted transition-colors hover:bg-ns-surface-2 hover:text-ns-text">
                      <CloseIcon size={15} />
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
    <div className={`${styles.settle} rounded-2xl bg-ns-surface p-5`}>
      <p className="font-heading text-sm font-bold text-ns-success">What changed</p>
      <p className="mt-1 text-base leading-relaxed text-ns-text">{cause}</p>
      {nothing ? (
        <p className="mt-1 text-sm leading-6 text-ns-muted">Nothing moved. That did not change a preference we rank by.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm leading-6 text-ns-muted">
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
    <article className={`${styles.pick} grid grid-cols-[88px_minmax(0,1fr)] gap-4 py-6 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-6`} data-fresh={fresh} data-role={pick.role}>
      <div key={pick.film.tmdbId} className="group animate-fade-up">
        <FilmPoster film={pick.film} sizes="120px" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-sm font-bold text-ns-secondary-readable">{role.label}</span>
          {fresh && <Badge variant="success">Changed</Badge>}
          {pick.support === 'tentative' && <Badge variant="warning">Tentative</Badge>}
        </div>
        <p className="text-sm text-ns-muted">{role.line}</p>

        <h4 key={pick.film.tmdbId} className="mt-2 animate-fade-up font-heading text-xl font-bold leading-tight text-ns-text">{pick.film.title}</h4>
        {meta && <p className="mt-0.5 text-sm tabular-nums text-ns-muted">{meta}</p>}

        <ul className="mt-3 space-y-2">
          {pick.reasons.map(reason => (
            <li key={reason.facet} className="flex gap-2 text-sm leading-6 text-ns-text">
              <CheckIcon size={15} className="mt-1 flex-shrink-0 text-ns-success" />
              <span className="min-w-0">
                {reasonSentence(reason.facet, reason.because, reason.tentative)}
                {mode !== 'blind' && reason.tags.length > 0 && (
                  <span className="block text-sm text-ns-muted">Catalog: {reason.tags.join(', ')}</span>
                )}
              </span>
            </li>
          ))}
          {pick.reasons.length === 0 && (
            <li className="text-sm leading-6 text-ns-muted">A well-regarded film that does not clash with anything you told us.</li>
          )}
        </ul>

        {pick.tradeoff && (
          <p className="mt-3 text-sm leading-6 text-ns-muted">{tradeoffSentence(pick.tradeoff.facet, pick.tradeoff.direction, pick.role)}</p>
        )}
        <p className="mt-2 text-sm text-ns-muted">{matchedSentence(pick.matched, pick.of)}</p>

        {mode !== 'blind' && (
          <p key={`${mode}:${story ? 'story' : 'loading'}`} className="mt-3 animate-fade-up border-t border-ns-border pt-3 text-sm leading-6 text-ns-text">
            {story ?? 'Loading premise…'}
          </p>
        )}

        <Link href={`/movie/${pick.film.tmdbId}`} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ns-secondary-readable transition-colors hover:text-ns-text">
          Open film page <ArrowRightIcon size={15} />
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
