'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'
import Button from '@/components/ui/Button'
import { WarningIcon } from '@/components/icons'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

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
      const requestedDestination = new URLSearchParams(window.location.search).get('callbackUrl')
      const safeDestination = requestedDestination?.startsWith('/') && !requestedDestination.startsWith('//')
        ? requestedDestination
        : '/discover'
      window.location.assign(safeDestination)
    } catch {
      setError('Could not reach NoSpoilers. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-4xl text-ns-text sm:text-5xl">Welcome back.</h1>
      <p className="mt-3 text-lg leading-relaxed text-ns-muted">Sign in to your NoSpoilers account.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" aria-describedby={error ? 'login-error' : undefined}>
        {error && (
          <div
            id="login-error"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="flex items-start gap-2.5 rounded-xl bg-ns-danger/10 p-4 text-sm leading-relaxed text-ns-danger motion-safe:animate-fade-up"
          >
            <WarningIcon size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
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

        <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-1 w-full">
          Sign In
        </Button>
      </form>

      <p className="mt-6 flex flex-wrap items-center justify-center gap-x-1.5 text-base text-ns-muted">
        Don&apos;t have an account?
        <Link href="/register" className="inline-flex min-h-11 items-center font-semibold text-ns-text underline underline-offset-4 transition-colors hover:text-ns-secondary-readable">
          Create one
        </Link>
      </p>
    </div>
  )
}
