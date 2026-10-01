'use client'

import { FormEvent, useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface ProWaitlistFormProps {
  initialEmail?: string
  signedIn?: boolean
}

type FormStatus = 'idle' | 'joined' | 'already-joined' | 'error'

export default function ProWaitlistForm({
  initialEmail = '',
  signedIn = false,
}: ProWaitlistFormProps) {
  const [email, setEmail] = useState(initialEmail)
  const [status, setStatus] = useState<FormStatus>('idle')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setStatus('idle')
    setError('')

    try {
      const response = await fetch('/api/pro/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json() as {
        joined?: boolean
        alreadyJoined?: boolean
        error?: string
      }

      if (!response.ok || !data.joined) {
        throw new Error(data.error ?? 'Could not join the waitlist.')
      }

      setStatus(data.alreadyJoined ? 'already-joined' : 'joined')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not join the waitlist.')
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const joined = status === 'joined' || status === 'already-joined'

  if (joined) {
    return (
      <div
        className="rounded-2xl border border-ns-success/30 bg-ns-success/10 px-5 py-4 text-left"
        role="status"
      >
        <p className="font-heading text-base font-semibold text-ns-success">
          {status === 'already-joined' ? 'You’re already on the list.' : 'You’re on the list.'}
        </p>
        <p className="mt-1 text-sm leading-6 text-ns-muted">
          We’ll email you when NoSpoilers Pro is ready. You won’t be charged today.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <Input
            id="pro-waitlist-email"
            name="email"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            maxLength={254}
            required
            readOnly={signedIn}
            aria-describedby="pro-waitlist-note pro-waitlist-status"
            error={status === 'error' ? error : undefined}
            className={signedIn ? 'cursor-default text-ns-muted' : undefined}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          loading={loading}
          disabled={!email.trim()}
          className="min-h-[46px] whitespace-nowrap sm:px-6"
        >
          Join the waitlist
        </Button>
      </div>
      <p id="pro-waitlist-note" className="text-xs leading-5 text-ns-muted/70">
        No payment today. We’ll only use your email for NoSpoilers Pro launch updates.
      </p>
      <p id="pro-waitlist-status" className="sr-only" aria-live="polite">
        {loading ? 'Joining the waitlist.' : ''}
      </p>
    </form>
  )
}
