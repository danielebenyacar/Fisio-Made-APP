import type { ReactNode } from 'react'

type Props = { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }

/** A large tappable checkbox with its label. */
export function CheckboxRow({ checked, onChange, children }: Props) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-xl border border-brand-300 bg-white px-4 py-3 font-semibold">
      <input
        type="checkbox"
        className="size-6 shrink-0 accent-brand-800"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  )
}
