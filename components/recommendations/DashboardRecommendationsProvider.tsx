'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { CuratedRecGroups } from '@/services/curated-recs'

interface DashboardRecommendationsState {
  groups: CuratedRecGroups | null
  loading: boolean
  loadError: boolean
  retry: () => void
}

const DashboardRecommendationsContext = createContext<DashboardRecommendationsState | null>(null)

export function useDashboardRecommendations() {
  const value = useContext(DashboardRecommendationsContext)
  if (!value) {
    throw new Error('useDashboardRecommendations must be used inside DashboardRecommendationsProvider')
  }
  return value
}

export default function DashboardRecommendationsProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<CuratedRecGroups | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    let active = true

    setLoading(true)
    setLoadError(false)

    fetch('/api/curated-recs')
      .then(response => {
        if (!response.ok) throw new Error('Recommendation request failed')
        return response.json() as Promise<CuratedRecGroups>
      })
      .then(data => {
        if (active) setGroups(data)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [requestVersion])

  function retry() {
    setRequestVersion(version => version + 1)
  }

  return (
    <DashboardRecommendationsContext.Provider value={{ groups, loading, loadError, retry }}>
      {children}
    </DashboardRecommendationsContext.Provider>
  )
}
