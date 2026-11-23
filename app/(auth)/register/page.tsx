'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'
import Button from '@/components/ui/Button'
import { CheckIcon, WarningIcon } from '@/components/icons'

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
      <div className="w-full max-w-md motion-safe:animate-fade-up" role="status" aria-live="polite">
        <p className="flex items-center gap-2 text-sm font-semibold text-ns-success">
          <CheckIcon size={16} /> Account created
        </p>
        <h1 className="mt-3 font-display text-4xl text-ns-text sm:text-5xl">One more step.</h1>
        <p className="mt-3 text-lg leading-relaxed text-ns-muted">
          Your account is ready, but automatic sign-in did not finish. Sign in with the credentials you just created to continue.
        </p>
        <Button href="/login" size="lg" className="mt-8 w-full">
          Continue to sign in
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-4xl text-ns-text sm:text-5xl">Create account.</h1>
      <p className="mt-3 text-lg leading-relaxed text-ns-muted">Join NoSpoilers and discover films without fear.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" aria-describedby={errors.form ? 'register-form-error' : undefined}>
        {errors.form && (
          <div
            id="register-form-error"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="flex items-start gap-2.5 rounded-xl bg-ns-danger/10 p-4 text-sm leading-relaxed text-ns-danger motion-safe:animate-fade-up"
          >
            <WarningIcon size={16} className="mt-0.5 flex-shrink-0" />
            <span>{errors.form}</span>
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

        <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-1 w-full">
          Create Account
        </Button>
      </form>

      <p className="mt-6 flex flex-wrap items-center justify-center gap-x-1.5 text-base text-ns-muted">
        Already have an account?
        <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-ns-text underline underline-offset-4 transition-colors hover:text-ns-secondary-readable">
          Sign in
        </Link>
      </p>
    </div>
  )
}
