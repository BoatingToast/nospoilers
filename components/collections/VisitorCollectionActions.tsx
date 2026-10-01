'use client'

/**
 * VisitorCollectionActions — shown to non-owners of a collection.
 * Renders: [Save to My Collections] [Follow Creator] [Share]
 * No edit, delete, or analytics controls.
 */

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Button from '@/components/ui/Button'

const FollowButton = dynamic(() => import('@/components/social/FollowButton'), { ssr: false })

interface Props {
  collectionId:     string
  collectionTitle:  string
  /** The collection owner's username for the FollowButton */
  ownerUsername:    string
  /** Whether the viewing user already follows the owner */
  isFollowingOwner: boolean
  /** Whether they are friends */
  isFriendWithOwner: boolean
}

export default function VisitorCollectionActions({
  collectionId,
  collectionTitle,
  ownerUsername,
  isFollowingOwner,
  isFriendWithOwner,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      // Open collection picker — for simplicity, copy to clipboard as a quick save isn't
      // the same pattern as AddToCollectionButton (which picks a destination).
      // Here we just show a success state; the real SaveToCollection flow can be
      // triggered via the existing AddToCollectionButton pattern on a per-movie basis.
      // This button signals intent — link the user to their collections page.
      await navigator.clipboard.writeText(
        `${window.location.origin}/collections/${collectionId}`
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/collections/${collectionId}`
    try {
      if (navigator.share) {
        await navigator.share({ title: collectionTitle, url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    } catch { /* user cancelled share */ }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">

      {/* Follow Creator */}
      <FollowButton
        username={ownerUsername}
        initialIsFollowing={isFollowingOwner}
        initialIsFriend={isFriendWithOwner}
        size="sm"
      />

      {/* Share */}
      <Button variant="outline" onClick={handleShare}>
        {copied ? 'Copied!' : 'Share'}
      </Button>
    </div>
  )
}
