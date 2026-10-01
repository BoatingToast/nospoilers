'use client'

import RouteErrorState from '@/components/ui/RouteErrorState'

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteErrorState
      error={error}
      reset={reset}
      title="This page missed its cue"
      description="We could not load this part of NoSpoilers. Try the request again without losing your place."
    />
  )
}
