'use client'

interface Props {
  memberCount:  number
  messageCount: number
  onlineCount:  number
  movieTitle:   string
}

function Stat({ value, label, valueClass = 'text-ns-text' }: { value: number; label: string; valueClass?: string }) {
  return (
    <div className="min-w-0">
      <dd className={`font-display text-2xl leading-none tracking-wide ${valueClass}`}>
        {value.toLocaleString()}
      </dd>
      <dt className="mt-1 font-body text-[11px] uppercase tracking-widest text-ns-muted">{label}</dt>
    </div>
  )
}

export default function RoomStats({ memberCount, messageCount, onlineCount }: Props) {
  return (
    <dl className="flex flex-wrap items-start gap-x-6 gap-y-2">
      {onlineCount > 0 && <Stat value={onlineCount} label="Online" valueClass="text-emerald-400" />}
      <Stat value={memberCount}  label="Members"  />
      <Stat value={messageCount} label="Messages" />
    </dl>
  )
}
