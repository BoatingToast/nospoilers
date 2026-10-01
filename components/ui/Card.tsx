import Link from 'next/link'
import { cn } from '@/lib/utils'

type Variant = 'surface' | 'outline'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:     Variant
  /** Adds the shared hover border/glow treatment used by clickable grid items (movie posters, rec cards, etc). */
  interactive?: boolean
  href?:        string
  children?:    React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  surface: 'bg-ns-surface border border-ns-border',
  outline: 'bg-transparent border border-ns-border',
}

export default function Card({
  variant = 'surface',
  interactive = false,
  href,
  className,
  children,
  ...props
}: CardProps) {
  const classes = cn(
    'rounded transition-colors duration-200',
    variantClasses[variant],
    interactive && 'hover:border-ns-text/60',
    className,
  )

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}
