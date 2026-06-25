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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-8 h-8 border-2 border-ns-gold/30 border-t-ns-gold rounded-full animate-spin" />
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
