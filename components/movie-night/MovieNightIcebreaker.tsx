'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import styles from './movie-night.module.css'

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

/** The winning name sits under the redaction bar for a beat, then wipes open. */
function SpotlightName({ name }: { name: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), 220)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <p className="mt-2 break-words font-display text-4xl text-ns-text sm:text-5xl">
      <span data-open={open} className="ns-redact">{name}</span>
    </p>
  )
}

export default function MovieNightIcebreaker({ players }: Props) {
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

  return (
    <>
      <section className="flex flex-col justify-between gap-5 rounded-3xl bg-ns-surface p-6 sm:p-8">
        <div>
          <h2 className="font-display text-2xl text-ns-text">Movie Night Spotlight</h2>
          <p className="mt-2 text-base leading-relaxed text-ns-muted">
            Pass one screen around for a quick icebreaker before opening a live voting room.
          </p>
          {gamePlayers.length < 2 && (
            <p className="mt-2 text-sm text-ns-warning">
              Select at least two people in the Group panel to play.
            </p>
          )}
        </div>
        <div>
          <Button onClick={startGame} disabled={gamePlayers.length < 2} variant="outline">
            Start a round
          </Button>
        </div>
      </section>

      {isOpen && question && (
        <Modal
          onClose={() => setIsOpen(false)}
          ariaLabelledBy="movie-night-spotlight-title"
          maxWidth="max-w-lg"
          className="p-6 pt-14 text-center sm:p-10 sm:pt-14"
        >
          <p className="text-sm font-semibold tabular-nums text-ns-secondary-readable">
            {revealed ? 'The group has spoken' : (
              <span key={totalVotes} className="inline-block animate-fade-up motion-reduce:animate-none">
                Vote {Math.min(totalVotes + 1, gamePlayers.length)} of {gamePlayers.length}
              </span>
            )}
          </p>
          <h2
            key={questionIndex}
            id="movie-night-spotlight-title"
            className="mx-auto mt-3 max-w-md animate-fade-up font-display text-2xl leading-snug text-ns-text motion-reduce:animate-none sm:text-3xl"
          >
            {question}
          </h2>

          {!revealed ? (
            <>
              <p className="mt-3 text-sm text-ns-muted">
                Pass the screen around. Each person secretly taps one name.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-2">
                {gamePlayers.map(player => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => voteFor(player.id)}
                    disabled={allVotesIn}
                    className="min-h-12 min-w-0 truncate rounded-full bg-ns-surface-2 px-4 text-sm font-semibold text-ns-text transition-[background-color,transform] duration-150 hover:bg-ns-surface-3 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {player.label}
                  </button>
                ))}
              </div>

              <div aria-hidden="true" className="mt-5 h-1.5 overflow-hidden rounded-full bg-ns-surface-2">
                <div
                  className={`h-full rounded-full bg-ns-secondary ${styles.meter}`}
                  style={{ transform: `scaleX(${totalVotes / gamePlayers.length})` }}
                />
              </div>

              <div className="mt-5 grid grid-cols-[1fr_2fr] gap-2">
                <Button onClick={() => setVotes({})} disabled={totalVotes === 0} variant="ghost">
                  Reset
                </Button>
                <Button onClick={() => setRevealed(true)} disabled={!allVotesIn}>
                  Reveal group pick
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-6">
              <div className="rounded-2xl bg-ns-tile-rose p-5">
                <p className="text-sm font-semibold text-ns-secondary-readable">In the spotlight</p>
                <SpotlightName name={winners.map(player => player.label).join(' & ')} />
                <p className="mt-2 text-sm text-ns-muted">
                  {highestVoteCount} {highestVoteCount === 1 ? 'vote' : 'votes'}
                </p>
              </div>

              <ul className="mt-4 space-y-3 text-left">
                {gamePlayers
                  .slice()
                  .sort((a, b) => (votes[b.id] ?? 0) - (votes[a.id] ?? 0))
                  .map((player, index) => (
                    <li key={player.id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-sm text-ns-muted">{player.label}</span>
                        <span className="font-display text-lg tabular-nums text-ns-text">{votes[player.id] ?? 0}</span>
                      </div>
                      <div aria-hidden="true" className="mt-1 h-1 overflow-hidden rounded-full bg-ns-surface-2">
                        <div
                          className={`h-full origin-left rounded-full bg-ns-secondary ${styles.barGrow}`}
                          style={{
                            '--i': Math.min(index, 7),
                            transform: `scaleX(${(votes[player.id] ?? 0) / Math.max(gamePlayers.length, 1)})`,
                          } as CSSProperties}
                        />
                      </div>
                    </li>
                  ))}
              </ul>

              <Button onClick={drawQuestion} variant="outline" className="mt-6 w-full">
                Next question
              </Button>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
