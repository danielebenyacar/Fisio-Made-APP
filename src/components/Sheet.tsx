import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  labelledBy?: string
  children: ReactNode
}

/** Bottom sheet on a native modal <dialog>: focus trap, Esc and backdrop tap close it. */
export function Sheet({ open, onClose, labelledBy, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="mx-auto mt-auto mb-0 w-full max-w-md rounded-t-2xl border-0 bg-white p-0 text-brand-900 backdrop:bg-black/40"
    >
      <div className="px-5 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">{children}</div>
    </dialog>
  )
}
