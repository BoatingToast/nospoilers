import Link from 'next/link'
import { cn } from '@/lib/utils'

type Variant = 'surface' | 'outline'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:     Variant
  /** Adds the shared hover treatment used by clickable grid items. */
  interactive?: boolean
  href?:        string
  children?:    React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  surface: 'bg-ns-surface',
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
    'rounded-2xl transition-colors duration-150',
    variantClasses[variant],
    interactive && 'hover:bg-ns-surface-2',
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
