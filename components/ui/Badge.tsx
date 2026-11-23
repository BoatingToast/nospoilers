import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'muted' | 'outline' | 'danger' | 'success' | 'warning' | 'info'
type Size    = 'sm' | 'md'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
  size?:    Size
  children?: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-ns-text text-ns-bg',
  secondary: 'bg-ns-tile-rose text-ns-secondary-readable',
  muted:     'bg-ns-surface-2 text-ns-muted',
  outline:   'border border-ns-border-strong text-ns-text',
  danger:    'bg-ns-danger/10 text-ns-danger',
  success:   'bg-ns-success/10 text-ns-success',
  warning:   'bg-ns-warning/10 text-ns-warning',
  info:      'bg-ns-info/10 text-ns-info',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-3 py-1 text-sm gap-1.5',
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
        'inline-flex items-center whitespace-nowrap rounded-full font-body font-semibold',
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
