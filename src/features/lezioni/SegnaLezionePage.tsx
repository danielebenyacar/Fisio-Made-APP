import { EmptyState } from '../../components/EmptyState'
import { PageTitle } from '../../components/PageTitle'

export function SegnaLezionePage() {
  return (
    <>
      <PageTitle>Segna lezione</PageTitle>
      <div className="mt-6">
        <EmptyState>Qui sceglierai il cliente e registrerai la lezione in due tocchi.</EmptyState>
      </div>
    </>
  )
}
