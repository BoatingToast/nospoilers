'use client'

export default function LabError({ reset }: { reset: () => void }) {
  return <main className="flex min-h-[calc(100dvh-2rem)] flex-col items-center justify-center gap-4 p-8 text-center"><h1 className="font-heading text-2xl">Lab could not open</h1><p className="text-sm text-ns-muted">Your saved projects are still in this browser. Try opening the workspace again.</p><button onClick={reset} className="rounded-lg bg-ns-secondary px-5 py-3 text-sm text-white">Try again</button></main>
}
