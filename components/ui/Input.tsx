import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm text-ns-muted font-body">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            'w-full px-4 py-3 bg-ns-surface border rounded-xl text-ns-text placeholder:text-ns-muted/50',
            'focus:outline-none focus:ring-2 focus:ring-ns-gold/30 focus:border-ns-gold/50',
            'transition-colors duration-200 font-body text-sm',
            error ? 'border-red-500/50' : 'border-ns-border',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400 font-body">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
