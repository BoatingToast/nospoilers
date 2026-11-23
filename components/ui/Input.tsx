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
          <label htmlFor={id} className="font-body text-sm font-semibold text-ns-text">
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
              'min-h-12 w-full rounded-xl border bg-ns-bg px-4 py-2 font-body text-base text-ns-text',
              'placeholder:text-ns-subtle transition-colors duration-150',
              'focus:border-ns-text focus:outline-none focus:ring-1 focus:ring-ns-text',
              Boolean(endAdornment) && 'pr-12',
              error ? 'border-ns-danger' : 'border-ns-border-strong',
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
        {error && <p id={errorId} className="font-body text-sm text-ns-danger">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
