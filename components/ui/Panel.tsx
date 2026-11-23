import { cn } from '@/lib/utils'

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?:    string
  action?:   React.ReactNode
  children?: React.ReactNode
}

/**
 * Static surfaced section container — dashboard widgets, settings groups,
 * stat blocks. Unlike Card, it's not meant to be a clickable grid item:
 * no interactive hover treatment, just the shared chrome plus an optional
 * title row.
 */
export default function Panel({ title, action, className, children, ...props }: PanelProps) {
  return (
    <div
      className={cn('rounded-2xl bg-ns-surface p-6', className)}
      {...props}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <p className="font-heading text-lg font-bold text-ns-text">{title}</p>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
