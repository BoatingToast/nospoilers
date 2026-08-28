'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

interface RefreshButtonProps {
  label?: string
  pendingLabel?: string
  className?: string
}

export default function RefreshButton({
  label = 'Try again',
  pendingLabel = 'Trying again…',
  className = '',
}: RefreshButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
      className={className}
    >
      {isPending ? pendingLabel : label}
    </button>
  )
}
