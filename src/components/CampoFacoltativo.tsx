import { useId, useState, type ReactNode } from 'react'
import { TextAreaField } from './fields'
import { focusSoon } from './focusSoon'
import { PlusIcon } from './icons'

/** Small "+ Aggiungi …" link that reveals a secondary field. */
export function AggiungiButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-12 items-center gap-1.5 self-start rounded-xl pr-2 font-semibold text-brand-700 active:bg-brand-100"
    >
      <PlusIcon width={20} height={20} strokeWidth={2.5} />
      {children}
    </button>
  )
}

/** A note, only when asked for: hidden behind "+ Aggiungi una nota" until it has some text. */
export function NotaField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId()
  const [open, setOpen] = useState(value.trim() !== '')

  if (!open) {
    return (
      <AggiungiButton
        onClick={() => {
          setOpen(true)
          focusSoon(id)
        }}
      >
        Aggiungi una nota
      </AggiungiButton>
    )
  }
  return <TextAreaField id={id} label="Nota" value={value} onChange={(e) => onChange(e.target.value)} />
}
