import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  endAdornment?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    label,
    error,
    endAdornment,
    className,
    id,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...props
  }, ref) => {
    const errorId = id && error ? `${id}-error` : undefined
    const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(' ') || undefined

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm text-ns-muted font-body">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={id}
            ref={ref}
            aria-describedby={describedBy}
            aria-invalid={error ? true : ariaInvalid}
            className={cn(
              'w-full px-4 py-3 bg-ns-surface border rounded-xl text-ns-text placeholder:text-ns-muted/50',
              'focus:outline-none focus:ring-2 focus:ring-ns-secondary/30 focus:border-ns-secondary/50',
              'transition-colors duration-200 font-body text-sm',
              Boolean(endAdornment) && 'pr-12',
              error ? 'border-ns-danger/50' : 'border-ns-border',
              className
            )}
            {...props}
          />
          {endAdornment && (
            <div className="absolute inset-y-0 right-2 flex items-center">
              {endAdornment}
            </div>
          )}
        </div>
        {error && <p id={errorId} className="text-xs text-ns-danger font-body">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
