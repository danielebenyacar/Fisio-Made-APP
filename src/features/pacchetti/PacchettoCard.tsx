import { Link } from 'react-router-dom'
import { DISCIPLINA_STYLE } from '../../components/disciplinaStyles'
import { DisciplinaPill } from '../../components/DisciplinaPill'
import { TONE_STYLE } from '../../components/toneStyles'
import type { Pacchetto } from '../../data'
import { formatDateIt } from '../../lib/dates'
import { formatEuro } from '../../lib/money'
import { descriviAvanzamento, etichettaStato } from '../../lib/pacchettoLabel'
import type { StatoPacchetto } from '../../lib/packages'
import { SettimaneBar } from './SettimaneBar'

type Props = {
  pacchetto: Pacchetto
  stato: StatoPacchetto
  /** A newer package of the same discipline exists. */
  rinnovato: boolean
  to: string
  onSegnaPagato?: () => void
}

export function PacchettoCard({ pacchetto, stato, rinnovato, to, onSegnaPagato }: Props) {
  const etichetta = etichettaStato(pacchetto, stato, rinnovato)
  const prezzo = pacchetto.prezzo === undefined ? '' : ` · ${formatEuro(pacchetto.prezzo)}`

  return (
    <div className={`overflow-hidden rounded-2xl border-l-4 bg-white shadow-sm ${DISCIPLINA_STYLE[pacchetto.disciplina].accent}`}>
      <Link to={to} className="block px-4 pt-4 pb-3 active:bg-brand-100">
        <span className="flex items-start justify-between gap-2">
          <span className="text-lg font-semibold">{pacchetto.nome}</span>
          <DisciplinaPill disciplina={pacchetto.disciplina} />
        </span>
        {etichetta && (
          <span className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 font-semibold ${TONE_STYLE[etichetta.tono]}`}>
            {etichetta.testo}
          </span>
        )}
        <span className="mt-2 block text-brand-700">{descriviAvanzamento(pacchetto, stato)}</span>
        {pacchetto.modalita === 'sedute' && stato.totali > 0 && (
          <span className="mt-2 block h-2 overflow-hidden rounded-full bg-brand-200" aria-hidden="true">
            <span
              className={`block h-full ${DISCIPLINA_STYLE[pacchetto.disciplina].dot}`}
              style={{ width: `${Math.min(100, (stato.fatte / stato.totali) * 100)}%` }}
            />
          </span>
        )}
        {pacchetto.modalita === 'abbonamento' && stato.settimane.length > 0 && (
          <span className="mt-2 block">
            <SettimaneBar settimane={stato.settimane} disciplina={pacchetto.disciplina} />
          </span>
        )}
        <span className={`mt-2 block font-semibold ${pacchetto.pagato ? 'text-brand-600' : 'text-danger-700'}`}>
          {pacchetto.pagato
            ? `Pagato${pacchetto.dataPagamento ? ` il ${formatDateIt(pacchetto.dataPagamento)}` : ''}${prezzo}`
            : `Da pagare${prezzo}`}
        </span>
      </Link>
      {!pacchetto.pagato && onSegnaPagato && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={onSegnaPagato}
            className="min-h-12 w-full rounded-xl border-2 border-danger-600 font-semibold text-danger-700 active:bg-danger-50"
          >
            Segna pagato
          </button>
        </div>
      )}
    </div>
  )
}
