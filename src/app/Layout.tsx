import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useDataSource } from './dataSource'
import { DemoBanner } from './DemoBanner'

export function Layout() {
  const { mode } = useDataSource()
  return (
    <div className="min-h-dvh">
      {mode === 'mock' ? <DemoBanner /> : <div className="h-[env(safe-area-inset-top)]" />}
      <main className="mx-auto max-w-md px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
