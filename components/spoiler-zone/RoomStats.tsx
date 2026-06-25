'use client'

interface Props {
  memberCount:  number
  messageCount: number
  onlineCount:  number
  movieTitle:   string
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center px-4 first:pl-0 last:pr-0">
      <p className="font-display text-2xl tracking-wider text-ns-gold leading-none">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-ns-muted/60 text-[10px] font-body tracking-wide mt-1">{label}</p>
    </div>
  )
}

export default function RoomStats({ memberCount, messageCount, onlineCount, movieTitle }: Props) {
  return (
    <div className="flex items-center gap-0 divide-x divide-ns-border">
      {onlineCount > 0 && (
        <div className="text-center pr-4">
          <div className="flex items-center gap-1.5 justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="font-display text-2xl tracking-wider text-emerald-400 leading-none">
              {onlineCount.toLocaleString()}
            </p>
          </div>
          <p className="text-ns-muted/60 text-[10px] font-body tracking-wide mt-1">Online</p>
        </div>
      )}
      <Stat value={memberCount}  label="Members"  />
      <Stat value={messageCount} label="Messages" />
    </div>
  )
}
