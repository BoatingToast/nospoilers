import { cn } from '@/lib/utils'
import { ChevronIcon } from '@/components/icons'

/** The one control style shared by every settings field. */
export const controlClass =
  'min-h-12 w-full rounded-xl border border-ns-border-strong bg-ns-bg px-4 py-2 font-body text-base text-ns-text placeholder:text-ns-subtle transition-colors duration-150 focus:border-ns-text focus:outline-none focus:ring-1 focus:ring-ns-text disabled:cursor-not-allowed disabled:text-ns-muted'

export function SettingsSection({
  title,
  description,
  children,
  className,
  reveal = 0,
}: {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** Stagger index for sections below the fold. Omit for the first section. */
  reveal?: number
}) {
  return (
    <section
      className={cn('rounded-2xl bg-ns-surface p-6 sm:p-8', reveal > 0 && 'ns-reveal', className)}
      style={reveal > 0 ? ({ '--i': Math.min(reveal, 7) } as React.CSSProperties) : undefined}
    >
      <h2 className="font-heading text-xl font-bold text-ns-text">{title}</h2>
      {description && <p className="mt-1 max-w-xl text-sm leading-relaxed text-ns-muted">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ns-text">{label}</label>
      {children}
      {hint && <p id={`${id}-hint`} className="text-sm text-ns-muted">{hint}</p>}
    </div>
  )
}

export function SelectControl({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={cn(controlClass, 'cursor-pointer appearance-none pr-11', className)}>
        {children}
      </select>
      <ChevronIcon
        size={16}
        direction="down"
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ns-muted"
      />
    </div>
  )
}

/** Switch with a 44px hit area around a smaller visual track. */
export function Toggle({
  checked,
  onChange,
  disabled,
  labelledBy,
  describedBy,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  labelledBy?: string
  describedBy?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="group flex h-11 w-14 flex-shrink-0 items-center justify-center rounded-full disabled:cursor-wait"
    >
      <span
        className={cn(
          'relative block h-7 w-12 rounded-full transition-colors duration-200',
          checked ? 'bg-ns-secondary' : 'bg-ns-surface-3',
        )}
      >
        <span
          className={cn(
            'absolute left-1 top-1 block h-5 w-5 rounded-full transition-transform duration-[240ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
            checked ? 'translate-x-5 bg-ns-secondary-foreground' : 'translate-x-0 bg-ns-text',
          )}
        />
      </span>
    </button>
  )
}

/** Pill segmented control with a sliding selection. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
}) {
  const index = Math.max(0, options.findIndex(option => option.value === value))

  return (
    <div
      role="group"
      aria-label={label}
      className="relative grid w-full auto-cols-fr grid-flow-col rounded-full bg-ns-surface-2 p-1 sm:w-auto"
    >
      <span
        aria-hidden="true"
        className="absolute bottom-1 left-1 top-1 rounded-full bg-ns-text transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'relative min-h-11 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors duration-150 sm:min-h-10 sm:px-4',
            option.value === value ? 'text-ns-bg' : 'text-ns-muted hover:text-ns-text',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** Quiet confirmation that fades in next to a save control. */
export function SavedNote({ show, label = 'Saved' }: { show: boolean; label?: string }) {
  return (
    <span aria-live="polite" className="text-sm font-semibold text-ns-success">
      {show && <span className="inline-block animate-fade-up">{label}</span>}
    </span>
  )
}
