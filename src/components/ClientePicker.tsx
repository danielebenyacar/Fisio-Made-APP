import { useState, type ReactNode } from 'react'
import type { Cliente } from '../data'
import { matchesQuery } from '../lib/clienti'
import { ChevronRightIcon, SearchIcon } from './icons'

type Props = {
  clienti: Cliente[]
  onSelect: (cliente: Cliente) => void
  /** Extra line under the name (e.g. the package state). */
  dettaglio?: (cliente: Cliente) => ReactNode
  placeholder?: string
  autoFocus?: boolean
}

/** Search box + list of active clients. Shows everyone until the list gets long. */
export function ClientePicker({ clienti, onSelect, dettaglio, placeholder = 'Cerca il cliente', autoFocus }: Props) {
  const [query, setQuery] = useState('')
  const found = clienti.filter((c) => !c.archiviato && matchesQuery(c, query))
  const shown = query || found.length <= 30 ? found : found.slice(0, 30)

  return (
    <div>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-brand-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          className="block min-h-12 w-full rounded-xl border border-brand-300 bg-white pr-4 pl-11 text-base placeholder:text-brand-400 focus:outline-2 focus:outline-brand-700"
        />
      </div>
      {shown.length === 0 ? (
        <p className="mt-3 text-center text-brand-600">Nessun cliente trovato.</p>
      ) : (
        <ul className="mt-3 divide-y divide-brand-200 overflow-hidden rounded-2xl bg-white shadow-sm">
          {shown.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c)}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-brand-100"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-lg">
                    {c.nome} <strong className="font-semibold">{c.cognome}</strong>
                  </span>
                  {dettaglio?.(c)}
                </span>
                <ChevronRightIcon className="shrink-0 text-brand-400" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
