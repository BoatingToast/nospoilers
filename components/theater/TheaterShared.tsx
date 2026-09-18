'use client'

import Link from 'next/link'
import { ClapperboardIcon } from '@/components/icons'
import styles from './theater.module.css'

export async function theaterRequest<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST', cache: 'no-store', signal,
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
  const data = await response.json()
  if (!response.ok) throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { status: response.status })
  return data as T
}

export function TheaterAccess({ error, retry, callbackUrl = '/theater' }: { error: string; retry?: () => void; callbackUrl?: string }) {
  return <div className={`${styles.panel} mx-auto max-w-xl p-8 text-center`}>
    <ClapperboardIcon className="mx-auto text-[#ddbd86]" size={32} />
    <h2 className={`${styles.title} mt-5 text-3xl`}>Your seat is waiting.</h2>
    <p role="alert" className="mt-4 text-sm leading-7 text-white/60">{error}</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className={styles.button}>Sign in</Link>
      <Link href="/pro/access" className={`${styles.button} ${styles.secondary}`}>Get Pro access</Link>
      {retry && <button className={`${styles.button} ${styles.secondary}`} onClick={retry}>Try again</button>}
    </div>
  </div>
}

export function premiereDate(date: string) {
  return new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
}

export function durationLabel(seconds: number) {
  return seconds < 60 ? `${seconds}s` : `${Math.ceil(seconds / 60)} min`
}
