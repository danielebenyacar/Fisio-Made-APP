import { EmptyState } from '../../components/EmptyState'
import { PageTitle } from '../../components/PageTitle'

export function ClientiPage() {
  return (
    <>
      <PageTitle>Clienti</PageTitle>
      <div className="mt-6">
        <EmptyState>Qui troverai l’elenco dei clienti, con la ricerca per nome.</EmptyState>
      </div>
    </>
  )
}
