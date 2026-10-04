import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastOptions } from './toastContext'

type Shown = ToastOptions & { key: number }

/** One toast at a time, just above the bottom navigation. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Shown | null>(null)
  const seq = useRef(0)

  const show = useCallback((options: ToastOptions) => {
    seq.current += 1
    setToast({ ...options, key: seq.current })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      setToast((current) => (current?.key === toast.key ? null : current))
      toast.onExpire?.()
    }, toast.durationMs ?? 5000)
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <ToastContext value={show}>
      {children}
      {toast && (
        <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 px-4">
          <div
            role="status"
            className="mx-auto flex max-w-md flex-col gap-3 rounded-2xl bg-brand-900 px-4 py-3 text-white shadow-lg"
          >
            <div className="flex items-center gap-3">
              <p className="flex-1 font-semibold">{toast.message}</p>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    setToast(null)
                    toast.action!.onClick()
                  }}
                  className="min-h-12 shrink-0 rounded-xl px-3 font-bold text-warning-300 underline"
                >
                  {toast.action.label}
                </button>
              )}
              {!toast.action && (
                <button
                  type="button"
                  aria-label="Chiudi"
                  onClick={() => setToast(null)}
                  className="min-h-12 min-w-12 shrink-0 rounded-xl text-xl text-brand-300"
                >
                  ✕
                </button>
              )}
            </div>
            {toast.link &&
              (toast.link.href ? (
                <a
                  href={toast.link.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setToast(null)}
                  className="flex min-h-12 items-center justify-center rounded-xl bg-posturale-600 font-semibold text-white"
                >
                  {toast.link.label}
                </a>
              ) : (
                <p className="text-brand-300">{toast.link.disabledHint}</p>
              ))}
          </div>
        </div>
      )}
    </ToastContext>
  )
}
