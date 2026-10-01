import type { ReactNode } from 'react'

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-3xl font-bold tracking-tight">{children}</h1>
}
