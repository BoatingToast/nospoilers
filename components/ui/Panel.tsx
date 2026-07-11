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
      className={cn('bg-ns-surface border border-ns-border rounded-2xl p-5', className)}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body">{title}</p>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
