'use client'

interface FilterPillsProps<T extends string> {
  label: string
  options: readonly (readonly [T, string])[]
  value: T
  onChange: (value: T) => void
}

/** Single-choice pill filter used by the dashboard's poster tabs. */
export default function FilterPills<T extends string>({ label, options, value, onChange }: FilterPillsProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex min-w-0 gap-1 overflow-x-auto scrollbar-hide">
      {options.map(([option, text]) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`min-h-11 flex-shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors duration-200 ${
            value === option ? 'bg-ns-text text-ns-bg' : 'text-ns-muted [@media(hover:hover)]:hover:bg-ns-surface-2 [@media(hover:hover)]:hover:text-ns-text'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
