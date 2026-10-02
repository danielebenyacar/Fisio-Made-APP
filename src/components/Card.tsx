import type { ReactNode } from 'react'

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-2xl bg-white p-5 shadow-sm ${className}`}>{children}</section>
}
