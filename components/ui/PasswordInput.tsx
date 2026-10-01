'use client'

import { forwardRef, useState } from 'react'
import Input, { type InputProps } from '@/components/ui/Input'
import { EyeIcon, EyeOffIcon } from '@/components/icons'

interface PasswordInputProps extends Omit<InputProps, 'type' | 'endAdornment'> {
  visibilityLabel?: string
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ visibilityLabel = 'password', ...props }, ref) => {
    const [visible, setVisible] = useState(false)
    const actionLabel = `${visible ? 'Hide' : 'Show'} ${visibilityLabel}`

    return (
      <Input
        {...props}
        ref={ref}
        type={visible ? 'text' : 'password'}
        endAdornment={(
          <button
            type="button"
            onClick={() => setVisible(current => !current)}
            aria-label={actionLabel}
            aria-pressed={visible}
            title={actionLabel}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ns-muted transition-colors hover:bg-ns-surface-2 hover:text-ns-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary"
          >
            {visible ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
          </button>
        )}
      />
    )
  }
)

PasswordInput.displayName = 'PasswordInput'
export default PasswordInput
