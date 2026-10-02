import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ButtonLink } from '../../components/ButtonLink'
import { DISCIPLINA_STYLE } from '../../components/disciplinaStyles'
import { EmptyState } from '../../components/EmptyState'
import { ChevronRightIcon, PlusIcon, SearchIcon, UploadIcon } from '../../components/icons'
import { PageTitle } from '../../components/PageTitle'
import { DISCIPLINE } from '../../data'
import {
  countByDisciplina,
  hasDisciplina,
  matchesQuery,
  type FiltroDisciplina,
} from '../../lib/clienti'
import { DISCIPLINA_LABEL } from '../../lib/discipline'
import { pacchettiInEvidenza } from '../../lib/packages'
import { ClienteBadges } from '../pacchetti/ClienteBadges'
import { usePacchetti } from '../pacchetti/usePacchetti'
import { useClienti } from './useClienti'

const FILTRI: FiltroDisciplina[] = ['tutti', ...DISCIPLINE]

const parseFiltro = (value: string | null): FiltroDisciplina =>
  FILTRI.find((f) => f === value) ?? 'tutti'

function tabClass(filtro: FiltroDisciplina, selected: boolean): string {
  if (filtro === 'tutti') {
    return selected
      ? 'border-brand-800 bg-brand-800 text-white'
      : 'border-brand-300 bg-white text-brand-800'
  }
  return selected ? DISCIPLINA_STYLE[filtro].solid : DISCIPLINA_STYLE[filtro].soft
}

export function ClientiPage() {
  const { clienti, error } = useClienti()
  const { pacchetti = [], lezioni = [] } = usePacchetti({ tutti: true })
  const [today] = useState(() => new Date())
  // Filters live in the URL so they survive opening a client and coming back.
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const filtro = parseFiltro(params.get('d'))
  const archiviati = params.get('archiviati') === '1'

  const setParam = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )

  const inView = (clienti ?? []).filter((c) => c.archiviato === archiviati && matchesQuery(c, query))
  const counts = countByDisciplina(inView)
  const shown = inView.filter((c) => hasDisciplina(c, filtro))
  const archivedCount = (clienti ?? []).filter((c) => c.archiviato).length

  const badgesFor = (clienteId: string) => {
    const own = pacchetti.filter((p) => p.clienteId === clienteId)
    return {
      inEvidenza: pacchettiInEvidenza(own, lezioni.filter((l) => l.clienteId === clienteId), today),
      daPagare: own.some((p) => !p.pagato),
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <PageTitle>{archiviati ? 'Archiviati' : 'Clienti'}</PageTitle>
        {!archiviati && (
          <ButtonLink to="/clienti/nuovo" className="shrink-0">
            <PlusIcon width={20} height={20} strokeWidth={2.5} />
            Nuovo
          </ButtonLink>
        )}
      </div>

      <div className="relative mt-4">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-brand-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setParam('q', e.target.value)}
          placeholder="Cerca per nome o cognome"
          aria-label="Cerca cliente"
          autoComplete="off"
          className="block min-h-12 w-full rounded-xl border border-brand-300 bg-white pr-4 pl-11 text-base placeholder:text-brand-400 focus:outline-2 focus:outline-brand-700"
        />
      </div>

      <div role="group" aria-label="Filtra per disciplina" className="mt-3 grid grid-cols-4 gap-1.5">
        {FILTRI.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filtro === f}
            onClick={() => setParam('d', f === 'tutti' ? null : f)}
            className={`flex min-h-14 flex-col items-center justify-center rounded-xl border-2 px-1 leading-tight font-semibold ${tabClass(f, filtro === f)}`}
          >
            {f === 'tutti' ? 'Tutti' : DISCIPLINA_LABEL[f]}
            <span className="text-sm opacity-80">{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className="mt-4">
        {error ? (
          <EmptyState>Non riesco a caricare i clienti. Riprova tra poco.</EmptyState>
        ) : clienti === undefined ? null : shown.length === 0 ? (
          <EmptyState>
            {query || filtro !== 'tutti'
              ? 'Nessun cliente trovato.'
              : archiviati
                ? 'Nessun cliente archiviato.'
                : 'Ancora nessun cliente. Tocca “Nuovo” per aggiungerne uno.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-brand-200 overflow-hidden rounded-2xl bg-white shadow-sm">
            {shown.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/clienti/${c.id}`}
                  className="flex min-h-16 items-center gap-3 px-4 py-3 active:bg-brand-100"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    {/* Sorted by cognome, so it is the bold part (like the iPhone contacts). */}
                    <span className="truncate text-lg">
                      {c.nome} <strong className="font-semibold">{c.cognome}</strong>
                    </span>
                    <ClienteBadges discipline={c.discipline} {...badgesFor(c.id)} />
                  </span>
                  <ChevronRightIcon className="shrink-0 text-brand-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {archiviati ? (
          <ButtonLink to="/clienti" variant="secondary" replace>
            Torna ai clienti attivi
          </ButtonLink>
        ) : (
          archivedCount > 0 && (
            <ButtonLink to="/clienti?archiviati=1" variant="secondary" replace>
              Vedi archiviati ({archivedCount})
            </ButtonLink>
          )
        )}
        {!archiviati && (
          <ButtonLink to="/altro/importa" variant="secondary">
            <UploadIcon width={20} height={20} />
            Importa clienti da Excel
          </ButtonLink>
        )}
      </div>
    </>
  )
}
