import { useId } from 'react'
import { Button } from './Button'
import { Sheet } from './Sheet'

type Props = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** Confirmation step required before every destructive action. */
export function ConfirmSheet({ open, title, message, confirmLabel, onConfirm, onCancel }: Props) {
  const titleId = useId()
  return (
    <Sheet open={open} onClose={onCancel} labelledBy={titleId}>
      <h2 id={titleId} className="text-xl font-bold">
        {title}
      </h2>
      <p className="mt-2 text-brand-700">{message}</p>
      <div className="mt-6 flex flex-col gap-3">
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Annulla
        </Button>
      </div>
    </Sheet>
  )
}
