import { useState } from 'react'
import { useRepository } from '../../app/dataSource'
import { ButtonLink } from '../../components/ButtonLink'
import { EmptyState } from '../../components/EmptyState'
import { PlusIcon } from '../../components/icons'
import { toIsoDate } from '../../lib/dates'
import { haSuccessivo, ordinaPacchetti, pacchettiInEvidenza, statoPacchetto } from '../../lib/packages'
import { PacchettoCard } from './PacchettoCard'
import { usePacchetti } from './usePacchetti'

/** "Pacchetti" section of the client page: packages in use first, finished ones in the history. */
export function ClientePacchetti({ clienteId, today }: { clienteId: string; today: Date }) {
  const repository = useRepository()
  const { pacchetti, lezioni, error, reload } = usePacchetti({ clienteId })
  const [showHistory, setShowHistory] = useState(false)

  async function segnaPagato(id: string) {
    await repository.updatePacchetto(id, { pagato: true, dataPagamento: toIsoDate(today) })
    reload()
  }

  if (error) return <EmptyState>Non riesco a caricare i pacchetti. Riprova tra poco.</EmptyState>
  if (!pacchetti || !lezioni) return null

  // In evidence: every package still usable, plus — for disciplines with none — the latest finished one.
  const inEvidenza = new Set([...pacchettiInEvidenza(pacchetti, lezioni, today).values()].map((x) => x.pacchetto.id))
  const withStato = ordinaPacchetti(pacchetti).map((pacchetto) => ({
    pacchetto,
    stato: statoPacchetto(pacchetto, lezioni, today),
    rinnovato: haSuccessivo(pacchetto, pacchetti),
  }))
  const current = withStato.filter(({ pacchetto, stato }) => stato.attivo || stato.nonIniziato || inEvidenza.has(pacchetto.id))
  const history = withStato.filter((x) => !current.includes(x)).reverse()

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Pacchetti</h2>
        <ButtonLink to={`/clienti/${clienteId}/pacchetti/nuovo`} className="shrink-0" aria-label="Nuovo pacchetto">
          <PlusIcon width={20} height={20} strokeWidth={2.5} />
          Nuovo
        </ButtonLink>
      </div>

      {current.length === 0 ? (
        <EmptyState>Nessun pacchetto. Tocca “Nuovo” per assegnarne uno dal listino.</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {current.map(({ pacchetto, stato, rinnovato }) => (
            <PacchettoCard
              key={pacchetto.id}
              pacchetto={pacchetto}
              stato={stato}
              rinnovato={rinnovato}
              to={`/clienti/${clienteId}/pacchetti/${pacchetto.id}`}
              onSegnaPagato={() => segnaPagato(pacchetto.id)}
            />
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            aria-expanded={showHistory}
            onClick={() => setShowHistory((v) => !v)}
            className="min-h-12 w-full rounded-xl font-semibold text-brand-700 underline"
          >
            {showHistory ? 'Nascondi storico' : `Mostra storico (${history.length})`}
          </button>
          {showHistory && (
            <div className="mt-2 flex flex-col gap-3">
              {history.map(({ pacchetto, stato, rinnovato }) => (
                <PacchettoCard
                  key={pacchetto.id}
                  pacchetto={pacchetto}
                  stato={stato}
                  rinnovato={rinnovato}
                  to={`/clienti/${clienteId}/pacchetti/${pacchetto.id}`}
                  onSegnaPagato={() => segnaPagato(pacchetto.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
