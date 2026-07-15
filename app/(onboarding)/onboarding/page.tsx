'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import OnboardingProgress from '@/components/onboarding/OnboardingProgress'
import StepMovies, { type SelectedMovie } from '@/components/onboarding/StepMovies'
import StepGenres from '@/components/onboarding/StepGenres'
import StepPreferences, { type PreferenceAnswers } from '@/components/onboarding/StepPreferences'

export default function OnboardingPage() {
  const router       = useRouter()
  const { update }   = useSession()

  const [step,     setStep]     = useState(1)
  const [movies,   setMovies]   = useState<SelectedMovie[]>([])
  const [genres,   setGenres]   = useState<string[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleMoviesNext() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding/save-movies', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ movies }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to save movies.')
        return
      }
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  async function handleComplete(preferences: PreferenceAnswers) {
    let navigationStarted = false
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ genres, preferences }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null
        setError(data?.error ?? 'We couldn\'t generate your Movie DNA. Please try again.')
        return
      }
      // Keep the client session in sync before showing the dashboard.
      await update({ onboardingCompleted: true }).catch(() => null)
      navigationStarted = true
      router.replace('/dashboard')
      router.refresh()
    } catch {
      setError('We couldn\'t generate your Movie DNA. Check your connection and try again.')
    } finally {
      // On success, leave loading latched until navigation unmounts this page.
      // Only restore the button when the request itself failed.
      if (!navigationStarted) setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <OnboardingProgress currentStep={step} />

      {error && (
        <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-body text-center">
          {error}
        </div>
      )}

      {step === 1 && (
        <StepMovies
          selected={movies}
          setSelected={setMovies}
          onNext={handleMoviesNext}
          loading={loading}
        />
      )}

      {step === 2 && (
        <StepGenres
          selected={genres}
          setSelected={setGenres}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <StepPreferences
          onSubmit={handleComplete}
          onBack={() => setStep(2)}
          loading={loading}
        />
      )}
    </div>
  )
}
