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
  primary:   'bg-ns-secondary text-ns-secondary-foreground font-semibold hover:bg-ns-text hover:text-ns-bg active:translate-y-px',
  secondary: 'bg-transparent text-ns-text border border-ns-text/70 font-semibold hover:bg-ns-text hover:text-ns-bg',
  ghost:     'text-ns-muted hover:text-ns-text underline-offset-4 hover:underline',
  outline:   'bg-transparent text-ns-text border border-ns-border hover:border-ns-text',
  danger:    'bg-ns-danger/10 text-ns-danger border border-ns-danger/20 hover:bg-ns-danger/20',
  success:   'bg-ns-success/10 text-ns-success border border-ns-success/20 hover:bg-ns-success/20',
}

const sizeClasses: Record<Size, string> = {
  sm:  'px-3 py-1.5 text-sm rounded',
  md:  'px-5 py-2.5 text-sm rounded',
  lg:  'px-7 py-3.5 text-base rounded',
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
    'inline-flex items-center justify-center gap-2 font-heading transition-colors duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary-readable focus-visible:ring-offset-2 focus-visible:ring-offset-ns-bg',
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
        <svg aria-hidden="true" className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  )
}
