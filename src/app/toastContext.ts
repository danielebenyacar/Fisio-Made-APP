import { createContext, use } from 'react'

export type ToastOptions = {
  message: string
  /** A button in the toast, e.g. "Annulla". */
  action?: { label: string; onClick: () => void }
  /** A link styled as a button, e.g. WhatsApp. Disabled when href is missing. */
  link?: { label: string; href?: string; disabledHint?: string }
  durationMs?: number
  /** Called when the toast goes away by itself (not when its action is used). */
  onExpire?: () => void
}

export const ToastContext = createContext<((options: ToastOptions) => void) | null>(null)

export function useToast(): (options: ToastOptions) => void {
  const show = use(ToastContext)
  if (!show) throw new Error('ToastContext mancante')
  return show
}
