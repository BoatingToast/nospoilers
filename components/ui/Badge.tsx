import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'muted' | 'outline' | 'danger' | 'success' | 'warning' | 'info'
type Size    = 'sm' | 'md'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
  size?:    Size
  children?: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-ns-primary text-ns-primary-foreground border border-ns-primary',
  secondary: 'bg-ns-secondary/10 text-ns-secondary-readable border border-ns-secondary/30',
  muted:     'bg-ns-surface-2 text-ns-muted border border-ns-border',
  outline:   'bg-transparent text-ns-text border border-ns-border',
  danger:    'bg-ns-danger/10 text-ns-danger border border-ns-danger/30',
  success:   'bg-ns-success/10 text-ns-success border border-ns-success/30',
  warning:   'bg-ns-warning/10 text-ns-warning border border-ns-warning/30',
  info:      'bg-ns-info/10 text-ns-info border border-ns-info/30',
}

const sizeClasses: Record<Size, string> = {
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
}

export default function Badge({
  variant = 'muted',
  size = 'sm',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-body font-medium tracking-wide whitespace-nowrap',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
