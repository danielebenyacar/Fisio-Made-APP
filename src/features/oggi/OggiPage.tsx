import { useState } from 'react'
import { EmptyState } from '../../components/EmptyState'
import { PageTitle } from '../../components/PageTitle'
import { formatDayHeading } from '../../lib/dates'

export function OggiPage() {
  const [today] = useState(() => new Date())
  return (
    <>
      <PageTitle>Oggi</PageTitle>
      <p className="mt-1 text-brand-600 first-letter:uppercase">{formatDayHeading(today)}</p>
      <div className="mt-6">
        <EmptyState>
          Qui troverai gli avvisi del giorno: pacchetti da rinnovare, pagamenti, assenze e
          compleanni.
        </EmptyState>
      </div>
    </>
  )
}
