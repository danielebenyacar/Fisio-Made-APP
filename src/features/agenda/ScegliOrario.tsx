import { addDays } from 'date-fns'
import { useId, useState, type ReactNode } from 'react'
import { DISCIPLINA_STYLE } from '../../components/disciplinaStyles'
import { TextField } from '../../components/fields'
import { AlertIcon, CheckIcon } from '../../components/icons'
import { dataOra, giorniSettimana, oraDi } from '../../lib/agenda'
import { orario } from '../../lib/appuntamenti'
import { fullName } from '../../lib/clienti'
import { formatDayHeading, toIsoDate } from '../../lib/dates'
import { fasceDelGiorno, impegniDelGiorno, impegniSovrapposti, type Impegno } from '../../lib/disponibilita'
import { parseIsoDate } from '../../lib/packages'
import { useAgenda } from './useAgenda'
import { WeekStrip } from './WeekStrip'

type Props = {
  giorno: string // YYYY-MM-DD
  ora: string // HH:mm, or '' when nothing is chosen yet
  durataMinuti: number
  now: Date
  onChange: (giorno: string, ora: string) => void
  /** The appointment being moved: its own slot counts as free. */
  ignoraAppuntamentoId?: string
  error?: string
  /** More fields next to the manual time (e.g. the duration). */
  extraManuale?: ReactNode
}

const fascia = (i: Impegno) => `${oraDi(i.inizio)}–${oraDi(i.fine)}`

/**
 * Pick a day of the week, see what is already planned (classes and appointments) and tap
 * one of the free times in between. Any other time can still be typed by hand.
 */
export function ScegliOrario({
  giorno,
  ora,
  durataMinuti,
  now,
  onChange,
  ignoraAppuntamentoId,
  error,
  extraManuale,
}: Props) {
  const ids = useId()
  const selected = parseIsoDate(giorno)
  const week = giorniSettimana(selected)
  const { dati, error: loadError } = useAgenda(week[0], addDays(week[0], 7))
  const [manuale, setManuale] = useState(false)

  const nome = (clienteId: string) => {
    const cliente = dati?.clienti.find((c) => c.id === clienteId)
    return cliente ? fullName(cliente) : 'Appuntamento'
  }
  const impegni = dati ? impegniDelGiorno(giorno, dati.corsi, dati.appuntamenti, nome, ignoraAppuntamentoId) : []
  const fasce = dati ? fasceDelGiorno(giorno, impegni, durataMinuti, now) : []
  const liberi = fasce.flatMap((f) => (f.tipo === 'liberi' ? f.orari.map(oraDi) : []))
  const inizio = /^\d{2}:\d{2}$/.test(ora) ? dataOra(giorno, ora) : null
  const conflitti = inizio ? impegniSovrapposti(impegni, inizio, durataMinuti) : []
  const showManuale = manuale || (inizio !== null && dati !== undefined && !liberi.includes(ora))

  return (
    <div>
      <WeekStrip selected={selected} now={now} fromToday onSelect={(day) => onChange(toIsoDate(day), '')} />

      <p className="mt-4 font-semibold first-letter:uppercase">{formatDayHeading(selected)}</p>
      {loadError && <p className="mt-2 text-danger-700">Non riesco a caricare l’agenda. Riprova tra poco.</p>}

      {dati && fasce.length > 0 && (
        <ol aria-label="Impegni e orari liberi" className="mt-2 flex flex-col gap-2">
          {fasce.map((f) =>
            f.tipo === 'impegno' ? (
              <li
                key={f.impegno.id}
                className={`flex min-h-12 items-center gap-3 rounded-xl border-l-4 bg-brand-100 px-3 py-2 text-brand-700 ${DISCIPLINA_STYLE[f.impegno.disciplina].accent}`}
              >
                <span className="shrink-0 font-semibold tabular-nums">{fascia(f.impegno)}</span>
                <span className="min-w-0 flex-1 truncate">{f.impegno.titolo}</span>
                <span className="shrink-0 text-sm">Occupato</span>
              </li>
            ) : (
              <li key={`liberi-${f.orari[0].getTime()}`}>
                <div className="grid grid-cols-4 gap-2">
                  {f.orari.map((t) => {
                    const hhmm = oraDi(t)
                    const isSelected = hhmm === ora
                    return (
                      <button
                        key={hhmm}
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`Libero alle ${hhmm}`}
                        onClick={() => onChange(giorno, hhmm)}
                        className={`min-h-12 rounded-xl border font-semibold tabular-nums ${
                          isSelected ? 'border-brand-800 bg-brand-800 text-white' : 'border-brand-300 bg-white active:bg-brand-100'
                        }`}
                      >
                        {hhmm}
                      </button>
                    )
                  })}
                </div>
              </li>
            ),
          )}
        </ol>
      )}
      {dati && liberi.length === 0 && (
        <p className="mt-2 text-brand-600">
          {giorno < toIsoDate(now) ? 'Giorno passato: scegli un altro giorno.' : 'Nessun orario libero in questo giorno.'}
        </p>
      )}

      {showManuale ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <TextField
            id={`${ids}-ora`}
            label="Ora"
            type="time"
            step={900}
            value={ora}
            onChange={(e) => onChange(giorno, e.target.value)}
          />
          {extraManuale}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setManuale(true)}
          className="mt-2 min-h-12 font-semibold text-brand-700 underline"
        >
          Un altro orario
        </button>
      )}

      {conflitti.length > 0 && (
        <p role="alert" className="mt-3 flex gap-2 rounded-xl border border-warning-300 bg-warning-50 p-3 font-semibold text-warning-900">
          <AlertIcon className="mt-0.5 shrink-0" width={20} height={20} />
          <span>Si sovrappone a: {conflitti.map((c) => `${c.titolo} (${fascia(c)})`).join(', ')}</span>
        </p>
      )}

      {inizio && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold shadow-sm">
          <CheckIcon width={20} height={20} strokeWidth={3} className="shrink-0 text-posturale-700" />
          <span className="first-letter:uppercase">
            {formatDayHeading(inizio)} · {orario(inizio, durataMinuti)}
          </span>
        </p>
      )}
      {error && <p className="mt-1.5 font-semibold text-danger-700">{error}</p>}
    </div>
  )
}

