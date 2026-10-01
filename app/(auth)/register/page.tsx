'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'
import Button from '@/components/ui/Button'

export default function RegisterPage() {
  const [fields, setFields] = useState({ email: '', username: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<typeof fields & { form: string }>>({})
  const [loading, setLoading] = useState(false)
  const [accountCreated, setAccountCreated] = useState(false)

  function update(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFields(prev => ({ ...prev, [key]: e.target.value }))
      setErrors(previous => {
        const next = { ...previous }
        delete next[key]
        delete next.form
        return next
      })
    }
  }

  function validate(): boolean {
    const errs: typeof errors = {}
    if (!fields.email.trim().includes('@')) errs.email    = 'Enter a valid email.'
    if (fields.username.trim().length < 3)  errs.username = 'Username must be at least 3 characters.'
    if (fields.password.length < 8)        errs.password = 'Password must be at least 8 characters.'
    if (fields.password !== fields.confirm) errs.confirm  = 'Passwords do not match.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    if (!validate()) return
    setLoading(true)
    let registrationSucceeded = false

    try {
      const response = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email:    fields.email.trim(),
          password: fields.password,
          username: fields.username.trim(),
        }),
      })
      const data: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
          ? data.error
          : 'Registration failed. Please try again.'
        setErrors({ form: message })
        return
      }

      registrationSucceeded = true
      const signInResult = await signIn('credentials', {
        email:    fields.email.trim(),
        password: fields.password,
        redirect: false,
      })

      if (signInResult?.error || !signInResult?.ok) {
        setAccountCreated(true)
        return
      }

      window.location.assign('/onboarding')
    } catch {
      if (registrationSucceeded) {
        setAccountCreated(true)
      } else {
        setErrors({ form: 'Could not reach NoSpoilers. Check your connection and try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  if (accountCreated) {
    return (
      <div className="w-full max-w-md" role="status" aria-live="polite">
        <p className="mb-2 text-xs font-body uppercase tracking-[0.2em] text-ns-success">Account created</p>
        <h1 className="font-display text-4xl tracking-wider text-ns-text mb-2">ONE MORE STEP</h1>
        <p className="text-ns-muted font-body text-sm leading-relaxed">
          Your account is ready, but automatic sign-in did not finish. Sign in with the credentials you just created to continue.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-ns-secondary px-7 py-3.5 font-body font-semibold text-ns-secondary-foreground transition-colors hover:bg-ns-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary"
        >
          Continue to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h1 className="font-display text-4xl tracking-wider text-ns-text mb-2">CREATE ACCOUNT</h1>
        <p className="text-ns-muted font-body text-sm">Join NoSpoilers and discover films without fear.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-describedby={errors.form ? 'register-form-error' : undefined}>
        {errors.form && (
          <div
            id="register-form-error"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="p-3 rounded-xl bg-ns-danger/10 border border-ns-danger/20 text-ns-danger text-sm font-body"
          >
            {errors.form}
          </div>
        )}

        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          value={fields.email}
          onChange={update('email')}
          error={errors.email}
          required
          autoComplete="email"
        />

        <Input
          id="username"
          type="text"
          label="Username"
          placeholder="cinephile42"
          value={fields.username}
          onChange={update('username')}
          error={errors.username}
          required
          autoComplete="username"
        />

        <PasswordInput
          id="password"
          label="Password"
          placeholder="At least 8 characters"
          value={fields.password}
          onChange={update('password')}
          error={errors.password}
          required
          autoComplete="new-password"
        />

        <PasswordInput
          id="confirm"
          label="Confirm Password"
          placeholder="••••••••"
          value={fields.confirm}
          onChange={update('confirm')}
          error={errors.confirm}
          required
          autoComplete="new-password"
          visibilityLabel="confirmation password"
        />

        <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
          Create Account
        </Button>
      </form>

      <p className="text-center text-ns-muted text-sm font-body mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-ns-secondary-readable hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
