import { Link } from 'react-router-dom'
import { useGoBack } from '../../app/useGoBack'
import { BackButton } from '../../components/BackButton'
import { ButtonLink } from '../../components/ButtonLink'
import { DISCIPLINA_STYLE } from '../../components/disciplinaStyles'
import { EmptyState } from '../../components/EmptyState'
import { ChevronRightIcon, PlusIcon } from '../../components/icons'
import { PageTitle } from '../../components/PageTitle'
import { DISCIPLINE } from '../../data'
import { DISCIPLINA_LABEL } from '../../lib/discipline'
import { descriviTipo } from '../../lib/listino'
import { formatEuro } from '../../lib/money'
import { useListino } from './usePacchetti'

export function ListinoPage() {
  const { tipi, error } = useListino()
  const goBack = useGoBack('/altro')

  return (
    <>
      <BackButton label="Altro" onClick={goBack} />
      <div className="flex items-center justify-between gap-3">
        <PageTitle>Prezzi</PageTitle>
        <ButtonLink to="/altro/listino/nuovo" className="shrink-0">
          <PlusIcon width={20} height={20} strokeWidth={2.5} />
          Nuovo
        </ButtonLink>
      </div>
      <p className="mt-2 text-brand-700">
        Pacchetti e abbonamenti che vendi. Tocca una voce per cambiare il prezzo: vale per i pacchetti
        che venderai da ora in poi.
      </p>

      {error && <EmptyState>Non riesco a caricare i prezzi. Riprova tra poco.</EmptyState>}

      {tipi &&
        DISCIPLINE.map((disciplina) => {
          const items = tipi.filter((t) => t.disciplina === disciplina)
          return (
            <section key={disciplina} className="mt-6">
              <h2 className="mb-2 flex items-center gap-2 text-xl font-bold">
                <span className={`size-3 rounded-full border ${DISCIPLINA_STYLE[disciplina].solid}`} />
                {DISCIPLINA_LABEL[disciplina]}
              </h2>
              {items.length === 0 ? (
                <EmptyState>Nessun pacchetto per {DISCIPLINA_LABEL[disciplina].toLowerCase()}.</EmptyState>
              ) : (
                <ul className="divide-y divide-brand-200 overflow-hidden rounded-2xl bg-white shadow-sm">
                  {items.map((tipo) => (
                    <li key={tipo.id}>
                      <Link
                        to={`/altro/listino/${tipo.id}`}
                        className={`flex min-h-16 items-center gap-3 px-4 py-3 active:bg-brand-100 ${tipo.attivo ? '' : 'opacity-60'}`}
                      >
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="font-semibold">{tipo.nome}</span>
                          <span className="text-brand-600">{descriviTipo(tipo)}</span>
                          {!tipo.attivo && <span className="font-semibold text-brand-600">Non in vendita</span>}
                        </span>
                        <span className="shrink-0 text-lg font-bold tabular-nums">
                          {tipo.prezzo === undefined ? '—' : formatEuro(tipo.prezzo)}
                        </span>
                        <ChevronRightIcon className="shrink-0 text-brand-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
    </>
  )
}
