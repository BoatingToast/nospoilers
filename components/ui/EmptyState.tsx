import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

/** Quiet placeholder for empty lists: says what is missing and what to do next. */
export default function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center rounded-2xl bg-ns-surface px-6 py-14 text-center', className)}>
      <h2 className="font-heading text-2xl font-bold text-ns-text">{title}</h2>
      {description && <p className="mt-2 max-w-md text-base leading-relaxed text-ns-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
