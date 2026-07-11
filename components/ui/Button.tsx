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
  primary:   'bg-ns-secondary text-ns-secondary-foreground font-semibold hover:bg-ns-secondary/90 active:scale-[0.98]',
  secondary: 'bg-ns-surface-2 text-ns-text border border-ns-border hover:border-ns-secondary/50 hover:bg-ns-surface',
  ghost:     'text-ns-muted hover:text-ns-text hover:bg-ns-surface',
  outline:   'bg-transparent text-ns-text border border-ns-border hover:border-ns-secondary/50 hover:text-ns-secondary',
  danger:    'bg-ns-danger/10 text-ns-danger border border-ns-danger/20 hover:bg-ns-danger/20',
  success:   'bg-ns-success/10 text-ns-success border border-ns-success/20 hover:bg-ns-success/20',
}

const sizeClasses: Record<Size, string> = {
  sm:  'px-3 py-1.5 text-sm rounded-lg',
  md:  'px-5 py-2.5 text-sm rounded-xl',
  lg:  'px-7 py-3.5 text-base rounded-xl',
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
    'inline-flex items-center justify-center gap-2 font-body transition-all duration-200 cursor-pointer select-none',
    variantClasses[variant],
    sizeClasses[size],
    (disabled || loading) && 'opacity-50 cursor-not-allowed pointer-events-none',
    className
  )

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  )
}
