'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { readCallbackUrl, withCallbackUrl } from '@/lib/callback-url'

export default function RegisterPage() {
  const [fields, setFields] = useState({ email: '', username: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<typeof fields & { form: string }>>({})
  const [loading, setLoading] = useState(false)
  const [accountCreated, setAccountCreated] = useState(false)
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null)

  useEffect(() => { setCallbackUrl(readCallbackUrl()) }, [])

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

      window.location.assign(withCallbackUrl('/onboarding', callbackUrl))
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
      <div
        className="mx-auto grid w-full min-w-0 max-w-6xl gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start"
        role="status"
        aria-live="polite"
      >
        <h1 className="min-w-0 font-display text-[clamp(3rem,12.5vw,7rem)] leading-[0.86] tracking-wide text-ns-text">
          ONE MORE{' '}
          <span className="block text-ns-secondary-readable">STEP</span>
        </h1>
        <div className="min-w-0 border-t-2 border-ns-text pt-5">
          <Badge variant="success" size="md">Account created</Badge>
          <p className="mt-4 font-body text-base leading-relaxed text-ns-text sm:text-lg">
            Your account is ready, but automatic sign-in did not finish. Sign in with the credentials you just created to continue.
          </p>
          <Button variant="primary" size="lg" href={withCallbackUrl('/login', callbackUrl)} className="mt-6 w-full sm:w-auto">
            Continue to sign in
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
      <h1 className="min-w-0 font-display text-[clamp(3rem,12.5vw,7rem)] leading-[0.86] tracking-wide text-ns-text">
        CREATE{' '}
        <span className="block text-ns-secondary-readable">ACCOUNT</span>
      </h1>

      <div className="min-w-0 border-t-2 border-ns-text pt-5">
      <p className="font-body text-base leading-relaxed text-ns-text sm:text-lg">Join NoSpoilers and discover films without fear.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" aria-describedby={errors.form ? 'register-form-error' : undefined}>
        {errors.form && (
          <div
            id="register-form-error"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="border-l-2 border-ns-danger py-1 pl-3 font-body text-sm text-ns-danger"
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

      <p className="mt-6 border-t border-ns-border pt-4 font-body text-sm text-ns-muted">
        Already have an account?{' '}
        <Link href={withCallbackUrl('/login', callbackUrl)} className="text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text">
          Sign in
        </Link>
      </p>
      </div>
    </div>
  )
}
