'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function RegisterPage() {
  const [fields, setFields] = useState({ email: '', username: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<typeof fields & { form: string }>>({})
  const [loading, setLoading] = useState(false)

  function update(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields(prev => ({ ...prev, [key]: e.target.value }))
  }

  function validate(): boolean {
    const errs: typeof errors = {}
    if (!fields.email.includes('@'))       errs.email    = 'Enter a valid email.'
    if (fields.username.length < 3)        errs.username = 'Username must be at least 3 characters.'
    if (fields.password.length < 8)        errs.password = 'Password must be at least 8 characters.'
    if (fields.password !== fields.confirm) errs.confirm  = 'Passwords do not match.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        email:    fields.email,
        password: fields.password,
        username: fields.username,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setErrors({ form: data.error ?? 'Registration failed.' })
      setLoading(false)
      return
    }

    // Auto sign-in after registration, then hard-navigate so the session cookie
    // is sent with the next request and all server components boot up authenticated.
    await signIn('credentials', {
      email:    fields.email,
      password: fields.password,
      redirect: false,
    })

    window.location.href = '/onboarding'
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h1 className="font-display text-4xl tracking-wider text-ns-text mb-2">CREATE ACCOUNT</h1>
        <p className="text-ns-muted font-body text-sm">Join NoSpoilers and discover films without fear.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errors.form && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-body">
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
        />

        <Input
          id="password"
          type="password"
          label="Password"
          placeholder="At least 8 characters"
          value={fields.password}
          onChange={update('password')}
          error={errors.password}
          required
        />

        <Input
          id="confirm"
          type="password"
          label="Confirm Password"
          placeholder="••••••••"
          value={fields.confirm}
          onChange={update('confirm')}
          error={errors.confirm}
          required
        />

        <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
          Create Account
        </Button>
      </form>

      <p className="text-center text-ns-muted text-sm font-body mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-ns-gold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
