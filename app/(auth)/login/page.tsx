'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'
import Button from '@/components/ui/Button'

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
      <div className="mb-8">
        <h1 className="font-display text-4xl tracking-wider text-ns-text mb-2">WELCOME BACK</h1>
        <p className="text-ns-muted font-body text-sm">Sign in to your NoSpoilers account.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-describedby={error ? 'login-error' : undefined}>
        {error && (
          <div
            id="login-error"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="p-3 rounded-xl bg-ns-danger/10 border border-ns-danger/20 text-ns-danger text-sm font-body"
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

      <p className="text-center text-ns-muted text-sm font-body mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-ns-secondary-readable hover:underline">
          Create one
        </Link>
      </p>
    </div>
  )
}
