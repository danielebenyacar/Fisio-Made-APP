import { CheckIcon } from '../../components/icons'
import { DISCIPLINA_STYLE } from '../../components/disciplinaStyles'
import type { Disciplina } from '../../data'
import { formatDateShort } from '../../lib/dates'
import type { Settimana } from '../../lib/packages'

const LABEL = { fatta: 'fatta', persa: 'persa', 'da-fare': 'da fare' } as const

/** One dot per week of a subscription: done, lost or still to use. */
export function SettimaneBar({ settimane, disciplina }: { settimane: Settimana[]; disciplina: Disciplina }) {
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="Settimane dell’abbonamento">
      {settimane.map((w) => (
        <li
          key={w.inizio}
          className={`flex size-7 items-center justify-center rounded-full border-2 text-sm font-bold ${
            w.stato === 'fatta'
              ? DISCIPLINA_STYLE[disciplina].solid
              : w.stato === 'persa'
                ? 'border-danger-200 bg-danger-50 text-danger-700'
                : 'border-brand-300 bg-white'
          }`}
        >
          {w.stato === 'fatta' && <CheckIcon width={14} height={14} strokeWidth={3.5} />}
          {w.stato === 'persa' && <span aria-hidden="true">✕</span>}
          <span className="sr-only">
            Settimana del {formatDateShort(w.inizio)}: {LABEL[w.stato]}
          </span>
        </li>
      ))}
    </ol>
  )
}
