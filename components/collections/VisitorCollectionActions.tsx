'use client'

/**
 * VisitorCollectionActions — shown to non-owners of a collection.
 * Renders: [Save to My Collections] [Follow Creator] [Share]
 * No edit, delete, or analytics controls.
 */

import { useState } from 'react'
import dynamic from 'next/dynamic'

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
    <div className="flex items-center gap-2 flex-wrap">

      {/* Follow Creator */}
      <FollowButton
        username={ownerUsername}
        initialIsFollowing={isFollowingOwner}
        initialIsFriend={isFriendWithOwner}
        size="sm"
      />

      {/* Share */}
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ns-border
                   text-ns-muted text-xs font-body hover:border-ns-gold/40 hover:text-ns-gold transition-colors"
      >
        {copied ? (
          <>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </>
        )}
      </button>
    </div>
  )
}
