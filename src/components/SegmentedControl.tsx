type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  labelledBy?: string
}

export function SegmentedControl<T extends string>({ value, options, onChange, labelledBy }: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-brand-200 p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-11 rounded-lg px-2 text-base font-semibold ${
            value === option.value ? 'bg-white text-brand-900 shadow-sm' : 'text-brand-700'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
