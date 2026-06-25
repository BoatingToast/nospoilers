'use client'

interface Props {
  movieTitle: string
  onEnter:    () => void
}

export default function SpoilerZoneGate({ movieTitle, onEnter }: Props) {
  return (
    <div className="max-w-lg mx-auto py-4">
      {/* Card */}
      <div className="relative overflow-hidden bg-ns-surface border border-amber-500/25 rounded-2xl p-10 text-center
                      shadow-[0_0_60px_-15px_rgba(245,158,11,0.15)]">

        {/* Glow bg */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />

        {/* Warning icon */}
        <div className="relative w-16 h-16 mx-auto mb-6 rounded-full bg-amber-500/10 border border-amber-500/30
                        flex items-center justify-center">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            strokeWidth="1.75" className="text-amber-400">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
          </svg>
        </div>

        <h3 className="relative font-display text-2xl tracking-widest text-ns-text mb-3">
          ENTER THE SPOILER ZONE?
        </h3>

        <p className="relative text-ns-muted font-body text-sm mb-1">
          Everything inside may contain full spoilers for
        </p>
        <p className="relative text-ns-gold font-body font-semibold text-base mb-6 truncate px-4">
          {movieTitle}
        </p>

        <div className="relative w-full h-px bg-ns-border mb-6" />

        <p className="relative text-ns-muted/70 font-body text-xs leading-relaxed mb-8 max-w-sm mx-auto">
          The Spoiler Zone is an open discussion room for people who have already watched this film.
          Plot twists, endings, and theories are fair game inside.
        </p>

        <button
          onClick={onEnter}
          className="relative px-10 py-3.5 rounded-xl bg-amber-500 text-black font-body font-bold text-sm
                     hover:bg-amber-400 active:scale-95 transition-all duration-150 shadow-lg shadow-amber-500/20"
        >
          Enter Spoiler Zone
        </button>

        <p className="relative mt-4 text-[10px] font-body text-ns-muted/40 tracking-wide">
          We&apos;ll remember your choice for this movie
        </p>
      </div>
    </div>
  )
}
