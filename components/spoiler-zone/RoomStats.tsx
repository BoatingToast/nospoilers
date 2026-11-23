'use client'

interface Props {
  memberCount:  number
  messageCount: number
  onlineCount:  number
  movieTitle:   string
}

function LiveValue({ value, label }: { value: number; label: string }) {
  return (
    <span>
      <span key={value} className="inline-block animate-fade-up font-semibold tabular-nums text-ns-text">
        {value.toLocaleString()}
      </span>{' '}
      {label}
    </span>
  )
}

export default function RoomStats({ memberCount, messageCount, onlineCount }: Props) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ns-muted">
      {onlineCount > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ns-success" />
          <span key={onlineCount} className="inline-block animate-fade-up font-semibold tabular-nums text-ns-success">
            {onlineCount.toLocaleString()}
          </span>
          online
        </span>
      )}
      <LiveValue value={memberCount} label={memberCount === 1 ? 'member' : 'members'} />
      <LiveValue value={messageCount} label={messageCount === 1 ? 'message' : 'messages'} />
    </p>
  )
}
