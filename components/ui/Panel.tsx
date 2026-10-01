import { cn } from '@/lib/utils'

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?:    string
  action?:   React.ReactNode
  children?: React.ReactNode
}

/**
 * Static bordered/surfaced section container — dashboard widgets, settings
 * groups, stat blocks. Unlike Card, it's not meant to be a clickable grid
 * item: no interactive hover treatment, just the shared chrome plus an
 * optional title row.
 */
export default function Panel({ title, action, className, children, ...props }: PanelProps) {
  return (
    <div
      className={cn('border-t-2 border-ns-text/80 bg-ns-surface p-5', className)}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <p className="font-heading text-sm font-semibold text-ns-text">{title}</p>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
