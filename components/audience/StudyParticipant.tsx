'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import { DEFAULT_FACETS, FACETS, FACET_LABELS, type Facet } from '@/lib/audience-engine'
import type { StudyPublic, StudySession } from '@/lib/audience-types'
import {
  audienceRequest,
  DataState,
  FacetInputs,
  fieldClass,
  Panel,
  useAudienceData,
} from './Analytics'

export default function StudyParticipant({ code }: { code: string }) {
  const { data: auth, status: authStatus } = useSession()
  const {
    data: study,
    error,
    loading,
    reload,
  } = useAudienceData<StudyPublic>(`/api/audience/studies/${code}`)
  const [session, setSession] = useState<StudySession | null>(null)
  const [facets, setFacets] = useState({ ...DEFAULT_FACETS }),
    [primaryInterest, setPrimaryInterest] = useState<Facet>('atmosphere')
  const [consent, setConsent] = useState(false),
    [reuseConsent, setReuseConsent] = useState(false)
  const [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(''),
    [saved, setSaved] = useState(false)
  const [withdrawConfirm, setWithdrawConfirm] = useState(false),
    [withdrawn, setWithdrawn] = useState(false)
  const [rating, setRating] = useState(0),
    [intent, setIntent] = useState(0),
    [expectation, setExpectation] = useState(0)
  const [reasons, setReasons] = useState<Facet[]>([]),
    [note, setNote] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)
  const noticeRef = useRef<HTMLDivElement>(null)
  const eventChain = useRef<Promise<unknown>>(Promise.resolve())
  const progressBucket = useRef(-1)
  const feedbackAttempt = useRef<{ body: string; key: string } | null>(null)

  useEffect(() => {
    if (saved || withdrawn) noticeRef.current?.focus()
    else if (session) previewRef.current?.focus()
  }, [session?.id, session, saved, withdrawn])

  const sendEvent = useCallback(
    (type: string, progress = 0, eventKey?: string) => {
      const task = eventChain.current
        .catch(() => undefined)
        .then(() =>
          audienceRequest(`/api/audience/studies/${code}/events`, {
            method: 'POST',
            body: JSON.stringify({ type, progress, eventKey: eventKey ?? crypto.randomUUID() }),
          }),
        )
      eventChain.current = task
      task.catch((cause) =>
        setActionError(
          cause instanceof Error ? cause.message : 'A research event could not be saved.',
        ),
      )
      return task
    },
    [code],
  )

  useEffect(() => {
    if (!study?.participant || !auth?.user?.id) return
    const controller = new AbortController()
    audienceRequest<StudySession>(`/api/audience/studies/${code}/participation`, {
      signal: controller.signal,
    })
      .then((value) => {
        setSession(value)
        setSaved(Boolean(value.feedback))
        setRating(value.feedback?.rating ?? 0)
        setIntent(value.feedback?.intent ?? 0)
        setExpectation(value.feedback?.expectation ?? 0)
        setReasons((value.feedback?.reasons ?? []) as Facet[])
        setNote(value.feedback?.note ?? '')
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setActionError(cause instanceof Error ? cause.message : 'Could not resume study.')
      })
    return () => controller.abort()
  }, [study?.participant?.id, auth?.user?.id, code, study?.participant])

  useEffect(() => {
    if (!session || session.status !== 'active' || !previewRef.current) return
    let sent = false
    const observe = () => {
      if (!sent && document.visibilityState === 'visible') {
        sent = true
        void sendEvent('exposure', 0, `exposure-${session.id}`).catch(() => {
          sent = false
        })
      }
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) observe()
      },
      { threshold: 0.25 },
    )
    observer.observe(previewRef.current)
    const onVisibility = () => {
      const bounds = previewRef.current?.getBoundingClientRect()
      if (bounds && bounds.bottom > 0 && bounds.top < window.innerHeight) observe()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [session?.id, session?.status, session, sendEvent])

  async function join(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setActionError('')
    try {
      const source = new URLSearchParams(window.location.search).get('source') ?? 'invite'
      setSession(
        await audienceRequest<StudySession>(`/api/audience/studies/${code}/participation`, {
          method: 'POST',
          body: JSON.stringify({ consent, reuseConsent, facets, primaryInterest, source }),
        }),
      )
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not join study.')
    } finally {
      setBusy(false)
    }
  }

  async function feedback(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setActionError('')
    try {
      await eventChain.current
      const body = JSON.stringify({ rating, intent, expectation, reasons, note })
      if (feedbackAttempt.current?.body !== body)
        feedbackAttempt.current = { body, key: crypto.randomUUID() }
      await audienceRequest(`/api/audience/studies/${code}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          rating,
          intent,
          expectation,
          reasons,
          note,
          eventKey: feedbackAttempt.current.key,
        }),
      })
      setSaved(true)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not save feedback.')
    } finally {
      setBusy(false)
    }
  }

  async function interest() {
    if (!session) return
    setActionError('')
    setBusy(true)
    try {
      await sendEvent('interest', 0, `interest-${session.id}`)
      setSession({ ...session, interested: true })
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not record interest.')
    } finally {
      setBusy(false)
    }
  }

  async function withdraw() {
    setBusy(true)
    setActionError('')
    try {
      await eventChain.current.catch(() => undefined)
      await audienceRequest(`/api/audience/studies/${code}/participation`, { method: 'DELETE' })
      setSession(null)
      setWithdrawn(true)
      setWithdrawConfirm(false)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not withdraw. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <DataState error={error} loading={loading} retry={reload} />
      {study && (
        <>
          <PageHeader title={study.title} description={study.description} />
          {withdrawn ? (
            <div ref={noticeRef} tabIndex={-1} role="status" className="scroll-mt-28 focus:outline-none"><Panel
              title="Your participation has been withdrawn."
              description="Your responses and research events were deleted. Affected local dataset versions have been purged and disabled."
            >
              <Button href="/audience" variant="outline">
                Explore other studies
              </Button>
            </Panel></div>
          ) : (
            <>
              {!session && (
                <Panel
                  title="Help shape the next release."
                  description="Share what appeals to you, experience one preview, and give honest feedback."
                >
                  {study.isOwner ? (
                    <p className="text-base text-ns-muted">
                      You own this study. Invite other viewers to collect independent feedback.
                    </p>
                  ) : study.status !== 'active' ? (
                    <p className="text-base text-ns-muted">
                      This study is {study.status} and is not accepting new participants.
                    </p>
                  ) : authStatus === 'loading' ? (
                    <p role="status" className="text-base text-ns-muted">
                      Checking your session…
                    </p>
                  ) : !auth ? (
                    <div>
                      <p className="mb-4 text-base text-ns-muted">
                        Sign in to consent, keep your preview assignment stable, and manage your
                        research data.
                      </p>
                      <Button
                        href={`/login?callbackUrl=${encodeURIComponent(`/audience/${code}`)}`}
                      >
                        Sign in to participate
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={join} className="space-y-7">
                      <div>
                        <h3 className="mb-5 text-lg font-semibold text-ns-text">
                          What do you enjoy?
                        </h3>
                        <p className="mb-5 text-base text-ns-muted">
                          Rate how much you usually enjoy each dimension. You can adjust the
                          defaults before joining.
                        </p>
                        <FacetInputs value={facets} onChange={setFacets} prefix="viewer" />
                      </div>
                      <div>
                        <label
                          htmlFor="primary-interest"
                          className="mb-2 block text-sm font-semibold text-ns-text"
                        >
                          What draws you in most?
                        </label>
                        <select
                          id="primary-interest"
                          value={primaryInterest}
                          onChange={(e) => setPrimaryInterest(e.target.value as Facet)}
                          className={fieldClass}
                        >
                          {FACETS.map((f) => (
                            <option key={f} value={f}>
                              {FACET_LABELS[f]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-4 rounded-xl bg-ns-surface-2 p-5">
                        <h3 className="text-lg font-semibold text-ns-text">
                          Your research choices
                        </h3>
                        <p className="text-base leading-relaxed text-ns-muted">
                          We record your preferences, assigned preview, preview interactions, and
                          feedback. The creator receives aggregate results and reviewed,
                          unattributed comments. NoSpoilers administrators can inspect individual
                          research records for quality. Participation is voluntary.
                        </p>
                        <label className="flex items-start gap-3 text-base leading-relaxed text-ns-text">
                          <input
                            type="checkbox"
                            required
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            className="mt-1 h-5 w-5 shrink-0 accent-ns-secondary"
                          />
                          I agree to participate in this study under this research notice.
                        </label>
                        <label className="flex items-start gap-3 text-base leading-relaxed text-ns-text">
                          <input
                            type="checkbox"
                            checked={reuseConsent}
                            onChange={(e) => setReuseConsent(e.target.checked)}
                            className="mt-1 h-5 w-5 shrink-0 accent-ns-secondary"
                          />
                          <span>
                            Also contribute my reviewed responses to NoSpoilers’ shared research
                            datasets to improve audience models.{' '}
                            <span className="text-ns-muted">
                              Optional. Exports omit my account identity and written comments.
                            </span>
                          </span>
                        </label>
                        <p className="text-sm leading-relaxed text-ns-muted">
                          You can withdraw below at any time. Withdrawal deletes your local records
                          and disables affected local datasets. Previously downloaded files cannot
                          be remotely recalled.
                        </p>
                      </div>
                      <Button type="submit" disabled={!consent} loading={busy}>
                        Join and see my preview
                      </Button>
                    </form>
                  )}
                </Panel>
              )}
              {session && (
                <>
                  <div ref={previewRef} tabIndex={-1} className="scroll-mt-28 focus:outline-none">
                    <Panel
                      title={session.headline}
                      description={
                        session.hasVideo
                          ? 'Watch the preview, then tell us how it lands.'
                          : 'Read this introduction, then tell us how it lands.'
                      }
                    >
                      {session.status !== 'active' && (
                        <p className="mb-4 text-base text-ns-warning">
                          Collection is {session.status}. You can still withdraw your research data
                          below.
                        </p>
                      )}
                      {session.videoUrl && (
                        <video
                          controls
                          playsInline
                          preload="metadata"
                          src={session.videoUrl}
                          className="mb-5 aspect-video w-full rounded-xl bg-ns-bg"
                          onPlay={() => {
                            void sendEvent('exposure', 0, `exposure-${session.id}`)
                            void sendEvent('start', 0, `start-${session.id}`)
                          }}
                          onTimeUpdate={(event) => {
                            const video = event.currentTarget
                            if (!video.duration || !Number.isFinite(video.duration)) return
                            const progress = Math.min(
                              100,
                              Math.floor((video.currentTime / video.duration) * 100),
                            )
                            const bucket = Math.floor(progress / 10) * 10
                            if (bucket > progressBucket.current && bucket > 0) {
                              progressBucket.current = bucket
                              void sendEvent('progress', bucket, `progress-${session.id}-${bucket}`)
                            }
                          }}
                          onError={() =>
                            setActionError(
                              'The preview could not play. Refresh to renew its private playback link.',
                            )
                          }
                        />
                      )}
                      {session.concept && (
                        <p className="whitespace-pre-wrap text-base leading-loose text-ns-text">
                          {session.concept}
                        </p>
                      )}
                      {session.status === 'active' && (
                        <div className="mt-6 flex flex-wrap gap-3">
                          {!session.hasVideo && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                void sendEvent('exposure', 0, `exposure-${session.id}`)
                                void sendEvent('start', 0, `start-${session.id}`)
                              }}
                            >
                              I’ve read the preview
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={interest}
                            disabled={session.interested || busy}
                          >
                            {session.interested
                              ? 'Interest recorded'
                              : 'I’m interested in this release'}
                          </Button>
                        </div>
                      )}
                    </Panel>
                  </div>
                  {saved ? (
                    <div ref={noticeRef} tabIndex={-1} role="status" className="scroll-mt-28 focus:outline-none"><Panel
                      title="Your feedback is saved."
                      description="Thank you. Your response will go through quality review before it can enter a shared dataset."
                    >
                      {session.status === 'active' && (
                        <Button variant="outline" onClick={() => setSaved(false)}>
                          Correct my feedback
                        </Button>
                      )}
                    </Panel></div>
                  ) : (
                    session.status === 'active' && (
                      <Panel
                        title="How did it land?"
                        description="Answer about the preview you experienced. There are no right opinions."
                      >
                        <form onSubmit={feedback} className="space-y-7">
                          {[
                            {
                              label: 'How much did you enjoy this preview?',
                              value: rating,
                              set: setRating,
                              name: 'rating',
                              low: 'Not at all',
                              high: 'Very much',
                            },
                            {
                              label: 'How likely are you to seek out the full release?',
                              value: intent,
                              set: setIntent,
                              name: 'intent',
                              low: 'Very unlikely',
                              high: 'Very likely',
                            },
                            {
                              label:
                                'How well does this match what you want from this kind of entertainment?',
                              value: expectation,
                              set: setExpectation,
                              name: 'expectation',
                              low: 'Poorly',
                              high: 'Very well',
                            },
                          ].map((question) => (
                            <fieldset key={question.name}>
                              <legend className="mb-3 text-base font-semibold text-ns-text">
                                {question.label}
                              </legend>
                              <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <label
                                    key={n}
                                    className={`flex h-12 flex-1 cursor-pointer items-center justify-center rounded-xl text-base font-semibold focus-within:ring-2 focus-within:ring-ns-secondary ${question.value === n ? 'bg-ns-text text-ns-bg' : 'bg-ns-surface-2 text-ns-muted'}`}
                                  >
                                    <input
                                      type="radio"
                                      name={question.name}
                                      value={n}
                                      required
                                      checked={question.value === n}
                                      onChange={() => question.set(n)}
                                      className="sr-only"
                                      aria-label={`${question.name} ${n} of 5`}
                                    />
                                    {n}
                                  </label>
                                ))}
                              </div>
                              <div className="mt-2 flex justify-between text-sm text-ns-muted">
                                <span>{question.low}</span>
                                <span>{question.high}</span>
                              </div>
                            </fieldset>
                          ))}
                          <fieldset>
                            <legend className="mb-3 text-base font-semibold text-ns-text">
                              What influenced your response? Choose up to three.
                            </legend>
                            <div className="flex flex-wrap gap-2">
                              {FACETS.map((facet) => (
                                <label
                                  key={facet}
                                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm ${reasons.includes(facet) ? 'bg-ns-text text-ns-bg' : 'bg-ns-surface-2 text-ns-muted'}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={reasons.includes(facet)}
                                    disabled={!reasons.includes(facet) && reasons.length >= 3}
                                    onChange={() =>
                                      setReasons((rows) =>
                                        rows.includes(facet)
                                          ? rows.filter((f) => f !== facet)
                                          : [...rows, facet],
                                      )
                                    }
                                    className="accent-ns-secondary"
                                  />
                                  {FACET_LABELS[facet]}
                                </label>
                              ))}
                            </div>
                          </fieldset>
                          <div>
                            <label
                              htmlFor="audience-note"
                              className="mb-2 block text-sm font-semibold text-ns-text"
                            >
                              What worked, or what would you change? (optional)
                            </label>
                            <textarea
                              id="audience-note"
                              maxLength={600}
                              rows={4}
                              className={fieldClass}
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              aria-describedby="note-privacy"
                            />
                            <p id="note-privacy" className="mt-2 text-sm text-ns-muted">
                              Leave out names, contact details, and private information. Reviewed
                              comments may be shown to the creator without your account identity.
                            </p>
                          </div>
                          <Button
                            type="submit"
                            disabled={!rating || !intent || !expectation}
                            loading={busy}
                          >
                            Save my feedback
                          </Button>
                        </form>
                      </Panel>
                    )
                  )}
                  <Panel
                    title="Your data choices"
                    description={
                      session.reuseConsent
                        ? 'You opted into this study and the shared research dataset.'
                        : 'You opted into this study only. Your responses are ineligible for the shared dataset.'
                    }
                  >
                    {withdrawConfirm ? (
                      <div>
                        <p className="mb-4 text-base leading-relaxed text-ns-muted">
                          This removes your participation, responses, and events from this study and
                          invalidates affected local dataset versions.
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <Button variant="danger" onClick={withdraw} loading={busy}>
                            Withdraw and delete my study data
                          </Button>
                          <Button variant="ghost" onClick={() => setWithdrawConfirm(false)}>
                            Keep participating
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" onClick={() => setWithdrawConfirm(true)}>
                        Withdraw my participation
                      </Button>
                    )}
                  </Panel>
                </>
              )}
            </>
          )}
        </>
      )}
      {actionError && (
        <p role="alert" className="rounded-xl bg-ns-danger/10 p-4 text-base text-ns-danger">
          {actionError}
        </p>
      )}
    </div>
  )
}
