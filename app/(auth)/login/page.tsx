'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Invalid email or password.')
      return
    }

    // Hard navigation so the browser sends the freshly-set session cookie with the
    // request, middleware evaluates onboardingCompleted, and ALL server components
    // re-render in authenticated state. Avoids the race between router.push() and
    // router.refresh() in Next.js App Router (refresh acts on the current URL and
    // can cancel an in-flight push).
    window.location.href = '/dashboard'
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h1 className="font-display text-4xl tracking-wider text-ns-text mb-2">WELCOME BACK</h1>
        <p className="text-ns-muted font-body text-sm">Sign in to your NoSpoilers account.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-body">
            {error}
          </div>
        )}

        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <Input
          id="password"
          type="password"
          label="Password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
          Sign In
        </Button>
      </form>

      <p className="text-center text-ns-muted text-sm font-body mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-ns-gold hover:underline">
          Create one
        </Link>
      </p>
    </div>
  )
}
