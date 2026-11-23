'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface WipeTextProps {
  children: ReactNode
  /**
   * Start under the redaction bar and wipe it away after mount. Only set this
   * in response to a viewer action, and only mount text the viewer may read.
   */
  animate?: boolean
  className?: string
}

export default function WipeText({ children, animate = false, className }: WipeTextProps) {
  const [open, setOpen] = useState(!animate)

  useEffect(() => {
    if (open) return
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setOpen(true))
    })
    return () => cancelAnimationFrame(frame)
  }, [open])

  return <span data-open={open} className={cn('ns-redact', className)}>{children}</span>
}
