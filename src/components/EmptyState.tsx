import type { ReactNode } from 'react'

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-brand-300 px-5 py-8 text-center text-brand-600">
      {children}
    </div>
  )
}
