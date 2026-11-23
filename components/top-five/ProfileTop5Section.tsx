'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Top5Display from './Top5Display'
import Top5Editor  from './Top5Editor'
import type { TopFiveEntry } from '@/services/top-five'

interface Props {
  userId:  string
  isOwn:   boolean
}

export default function ProfileTop5Section({ userId, isOwn }: Props) {
  const router = useRouter()
  const [editing,  setEditing]  = useState(false)
  const [current,  setCurrent]  = useState<TopFiveEntry[]>([])
  const [loading,  setLoading]  = useState(false)
  // Key to force Top5Display to re-fetch after save
  const [displayKey, setDisplayKey] = useState(0)

  async function openEditor() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/top-five?userId=${userId}`)
      const data = await res.json()
      setCurrent(data.movies ?? [])
    } catch {
      setCurrent([])
    } finally {
      setLoading(false)
      setEditing(true)
    }
  }

  function handleSaved(movies: TopFiveEntry[]) {
    setEditing(false)
    setCurrent(movies)
    setDisplayKey(k => k + 1)  // re-fetches Top5Display
    router.refresh()            // refreshes server-rendered DNA/profile data
  }

  return (
    <>
      <Top5Display
        key={displayKey}
        userId={userId}
        isOwn={isOwn}
        onEditClick={openEditor}
      />

      {loading && (
        <div role="status" aria-label="Loading your Top 5" className="fixed inset-0 z-[100] flex animate-fade-in items-center justify-center bg-black/70">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ns-border-strong border-t-ns-text" />
        </div>
      )}

      {editing && (
        <Top5Editor
          initialMovies={current}
          onSaved={handleSaved}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}
