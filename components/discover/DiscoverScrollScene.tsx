import type { ReactNode } from 'react'

interface DiscoverScrollSceneProps {
  children: ReactNode
  sectionCount: number
}

/**
 * Page frame for Discover. The scroll-driven backdrop, entrance animations and
 * section counter were removed with the layout cleanup; the frame only sets the
 * page's minimum height and bottom spacing now.
 */
export default function DiscoverScrollScene({ children }: DiscoverScrollSceneProps) {
  return <div className="min-h-screen min-w-0 pb-20">{children}</div>
}
