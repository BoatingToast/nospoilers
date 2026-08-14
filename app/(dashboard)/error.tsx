'use client'

import RouteErrorState from '@/components/ui/RouteErrorState'

export default function DashboardError({
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
      title="Your dashboard could not load"
      description="Your profile and ratings are safe. Retry the dashboard when you are ready."
    />
  )
}
