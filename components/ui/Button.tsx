import Link from 'next/link'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  href?: string
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-ns-secondary text-ns-secondary-foreground hover:bg-ns-secondary-readable',
  secondary: 'bg-ns-surface text-ns-text hover:bg-ns-surface-2',
  ghost:     'text-ns-text hover:bg-ns-surface',
  outline:   'border border-ns-border-strong bg-transparent text-ns-text hover:bg-ns-surface',
  danger:    'bg-ns-danger/10 text-ns-danger hover:bg-ns-danger/15',
  success:   'bg-ns-success/10 text-ns-success hover:bg-ns-success/15',
}

const sizeClasses: Record<Size, string> = {
  sm: 'min-h-10 px-4 text-sm',
  md: 'min-h-11 px-5 text-sm',
  lg: 'min-h-14 px-7 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  href,
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-body font-semibold transition-[color,background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer select-none active:scale-[0.97]',
    variantClasses[variant],
    sizeClasses[size],
    (disabled || loading) && 'opacity-50 cursor-not-allowed pointer-events-none',
    className
  )

  if (href) {
    const unavailable = disabled || loading

    return (
      <Link
        href={href}
        className={classes}
        aria-label={props['aria-label']}
        aria-disabled={unavailable || undefined}
        aria-busy={loading || undefined}
        tabIndex={unavailable ? -1 : undefined}
        onClick={unavailable ? event => event.preventDefault() : undefined}
      >
        {children}
      </Link>
    )
  }

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <svg aria-hidden="true" className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  )
}
