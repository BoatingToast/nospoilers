'use client'





// CHUNK 1 — WHO'S MOST LIKELY QUESTION DECK





import { useEffect, useRef, useState } from 'react'
import { ClapperboardIcon, CloseIcon, FriendsIcon } from '@/components/icons'

interface IcebreakerPlayer {
  id: string
  label: string
}

interface Props {
  players: IcebreakerPlayer[]
}

const QUESTIONS = [
  'Who is most likely to spend 30 minutes choosing the movie?',
  'Who is most likely to arrive with the best snacks?',
  'Who is most likely to quote the movie all week?',
  'Who is most likely to fall asleep before the credits?',
  'Who is most likely to guess the twist first?',
  'Who is most likely to rewatch a favorite for the hundredth time?',
  'Who is most likely to insist on keeping subtitles on?',
  'Who is most likely to check the runtime before agreeing?',
  'Who is most likely to cry during an animated movie?',
  'Who is most likely to choose an obscure indie film?',
  'Who is most likely to turn movie night into a marathon?',
  'Who is most likely to recognize every actor immediately?',
  'Who is most likely to stay through every last credit?',
  'Who is most likely to suggest a horror movie first?',
  'Who is most likely to rate the movie before it ends?',
]





// CHUNK 2 — PRIVATE VOTES AND GROUP REVEAL





export default function MovieNightIcebreaker({ players }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [questionIndex, setQuestionIndex] = useState<number | null>(null)
  const [seenQuestionIndexes, setSeenQuestionIndexes] = useState<number[]>([])
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [revealed, setRevealed] = useState(false)

  const gamePlayers = players.slice(0, 8)
  const question = questionIndex === null ? null : QUESTIONS[questionIndex]
  const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0)
  const allVotesIn = totalVotes === gamePlayers.length
  const highestVoteCount = Math.max(0, ...Object.values(votes))
  const winners = gamePlayers.filter(player => (votes[player.id] ?? 0) === highestVoteCount)

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    const dialog = dialogRef.current
    document.body.style.overflow = 'hidden'
    dialog?.querySelector<HTMLElement>('button')?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        return
      }
      if (event.key !== 'Tab' || !dialog) return

      const focusable = [...dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      triggerRef.current?.focus()
    }
  }, [isOpen])

  function drawQuestion() {
    const unseen = QUESTIONS
      .map((_, index) => index)
      .filter(index => !seenQuestionIndexes.includes(index))
    const choices = unseen.length > 0
      ? unseen
      : QUESTIONS.map((_, index) => index).filter(index => index !== questionIndex)
    const nextIndex = choices[Math.floor(Math.random() * choices.length)]

    setQuestionIndex(nextIndex)
    setSeenQuestionIndexes(unseen.length > 0 ? [...seenQuestionIndexes, nextIndex] : [nextIndex])
    setVotes({})
    setRevealed(false)
  }

  function startGame() {
    if (gamePlayers.length < 2) return
    drawQuestion()
    setIsOpen(true)
  }

  function voteFor(playerId: string) {
    if (revealed) return

    setVotes(current => {
      const voteCount = Object.values(current).reduce((sum, count) => sum + count, 0)
      if (voteCount >= gamePlayers.length) return current
      return { ...current, [playerId]: (current[playerId] ?? 0) + 1 }
    })
  }





// CHUNK 3 — PASS-AND-PLAY VOTING SCREEN





  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-ns-warning/20 bg-ns-surface">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ns-warning/10 via-transparent to-ns-secondary/5" />
        <div className="relative flex flex-col items-start justify-between gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-ns-warning/25 bg-ns-warning/10">
              <FriendsIcon size={23} className="text-ns-warning" />
            </div>
            <div>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-heading text-white">Movie Night Spotlight</h2>
                <span className="rounded-full border border-ns-warning/20 bg-ns-warning/10 px-2 py-0.5 text-[10px] font-body font-semibold uppercase tracking-wider text-ns-warning">
                  New
                </span>
              </div>
              <p className="max-w-xl text-sm font-body leading-relaxed text-ns-muted">
                Pass one screen around for a quick icebreaker before opening a live voting room.
              </p>
              {gamePlayers.length < 2 && (
                <p className="mt-1 text-xs font-body text-ns-warning">
                  Select at least two people in the Group panel to play.
                </p>
              )}
            </div>
          </div>

          <button
            ref={triggerRef}
            type="button"
            onClick={startGame}
            disabled={gamePlayers.length < 2}
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl bg-ns-warning px-5 py-2.5 text-sm font-body font-semibold text-ns-bg transition-all hover:-translate-y-0.5 hover:bg-ns-warning/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            <ClapperboardIcon size={16} />
            Start a Round
          </button>
        </div>
      </section>

      {isOpen && question && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="movie-night-spotlight-title"
          onClick={() => setIsOpen(false)}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-ns-warning/25 bg-ns-surface p-5 text-center shadow-2xl sm:p-8"
            onClick={event => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-ns-warning/10 blur-2xl" />

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ns-bg/80 text-ns-muted transition-colors hover:text-white"
              aria-label="Close game"
            >
              <CloseIcon size={16} />
            </button>

            <p className="text-[10px] font-body font-semibold uppercase tracking-[0.24em] text-ns-warning">
              {revealed ? 'The group has spoken' : `Vote ${Math.min(totalVotes + 1, gamePlayers.length)} of ${gamePlayers.length}`}
            </p>
            <h2 id="movie-night-spotlight-title" className="mx-auto mt-4 max-w-md text-2xl font-heading leading-snug text-white sm:text-3xl">
              {question}
            </h2>

            {!revealed ? (
              <>
                <p className="mt-3 text-xs font-body text-ns-muted">
                  Pass the screen around. Each person secretly taps one name.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-2">
                  {gamePlayers.map(player => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => voteFor(player.id)}
                      disabled={allVotesIn}
                      className="min-h-12 rounded-xl border border-ns-border bg-ns-bg/45 px-3 py-2.5 text-sm font-body font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-ns-warning/45 hover:bg-ns-warning/5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                    >
                      {player.label}
                    </button>
                  ))}
                </div>

                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-ns-bg">
                  <div
                    className="h-full rounded-full bg-ns-warning transition-all duration-300"
                    style={{ width: `${(totalVotes / gamePlayers.length) * 100}%` }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2">
                  <button
                    type="button"
                    onClick={() => setVotes({})}
                    disabled={totalVotes === 0}
                    className="rounded-xl border border-ns-border px-3 py-2.5 text-sm font-body text-ns-muted transition-colors hover:text-white disabled:opacity-40"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    disabled={!allVotesIn}
                    className="rounded-xl bg-ns-warning px-3 py-2.5 text-sm font-body font-semibold text-ns-bg transition-colors hover:bg-ns-warning/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Reveal Group Pick
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-6 animate-[fadeIn_250ms_ease-out]">
                <div className="rounded-2xl border border-ns-warning/25 bg-ns-warning/10 p-5">
                  <p className="text-[10px] font-body font-semibold uppercase tracking-[0.2em] text-ns-warning">
                    In the spotlight
                  </p>
                  <p className="mt-2 font-display text-4xl tracking-wider text-white">
                    {winners.map(player => player.label).join(' & ')}
                  </p>
                  <p className="mt-1 text-xs font-body text-ns-muted">
                    {highestVoteCount} {highestVoteCount === 1 ? 'vote' : 'votes'}
                  </p>
                </div>

                <div className="mt-4 space-y-2 text-left">
                  {gamePlayers
                    .slice()
                    .sort((a, b) => (votes[b.id] ?? 0) - (votes[a.id] ?? 0))
                    .map(player => (
                      <div key={player.id} className="flex items-center gap-3 rounded-xl border border-ns-border bg-ns-bg/35 px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-xs font-body text-ns-muted">
                          {player.label}
                        </span>
                        <span className="font-display text-lg text-white">{votes[player.id] ?? 0}</span>
                      </div>
                    ))}
                </div>

                <button
                  type="button"
                  onClick={drawQuestion}
                  className="mt-5 w-full rounded-xl bg-ns-warning px-4 py-2.5 text-sm font-body font-semibold text-ns-bg transition-colors hover:bg-ns-warning/90"
                >
                  Next Question
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
