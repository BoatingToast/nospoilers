'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'
import Button from '@/components/ui/Button'
import { readCallbackUrl, withCallbackUrl } from '@/lib/callback-url'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null)

  useEffect(() => { setCallbackUrl(readCallbackUrl()) }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password.')
        return
      }
      if (!result?.ok) {
        setError('Sign in is temporarily unavailable. Please try again.')
        return
      }

      // Hard navigation so the browser sends the freshly-set session cookie with the
      // request, middleware evaluates onboardingCompleted, and ALL server components
      // re-render in authenticated state.
      window.location.assign(readCallbackUrl() ?? '/discover')
    } catch {
      setError('Could not reach NoSpoilers. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
      <h1 className="min-w-0 font-display text-[clamp(3rem,12.5vw,7rem)] leading-[0.86] tracking-wide text-ns-text">
        WELCOME{' '}
        <span className="block text-ns-secondary-readable">BACK</span>
      </h1>

      <div className="min-w-0 border-t-2 border-ns-text pt-5">
      <p className="font-body text-base leading-relaxed text-ns-text sm:text-lg">Sign in to your NoSpoilers account.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" aria-describedby={error ? 'login-error' : undefined}>
        {error && (
          <div
            id="login-error"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="border-l-2 border-ns-danger py-1 pl-3 font-body text-sm text-ns-danger"
          >
            {error}
          </div>
        )}

        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChange={event => {
            setEmail(event.target.value)
            if (error) setError('')
          }}
          required
          autoComplete="email"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'login-error' : undefined}
        />

        <PasswordInput
          id="password"
          label="Password"
          placeholder="••••••••"
          value={password}
          onChange={event => {
            setPassword(event.target.value)
            if (error) setError('')
          }}
          required
          autoComplete="current-password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'login-error' : undefined}
        />

        <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
          Sign In
        </Button>
      </form>

      <p className="mt-6 border-t border-ns-border pt-4 font-body text-sm text-ns-muted">
        Don&apos;t have an account?{' '}
        <Link href={withCallbackUrl('/register', callbackUrl)} className="text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text">
          Create one
        </Link>
      </p>
      </div>
    </div>
  )
}
