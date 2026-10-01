import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRepository } from '../../app/dataSource'
import { ButtonLink } from '../../components/ButtonLink'
import { DisciplinaPill } from '../../components/DisciplinaPill'
import { EmptyState } from '../../components/EmptyState'
import { ChevronRightIcon, PlusIcon } from '../../components/icons'
import { TONE_STYLE } from '../../components/toneStyles'
import type { Appuntamento, Corso, Lezione } from '../../data'
import { daSegnare } from '../../lib/agenda'
import { orario, statoAppuntamentoLabel } from '../../lib/appuntamenti'

type Dati = { appuntamenti: Appuntamento[]; lezioni: Lezione[]; corsi: Corso[] }

const giornoBreve = (date: Date) => format(date, 'EEE d MMM', { locale: it })

/** Client page: upcoming appointments and the history of lessons. */
export function ClienteAgenda({ clienteId, now }: { clienteId: string; now: Date }) {
  const repository = useRepository()
  const [dati, setDati] = useState<Dati | null>(null)
  const [tutte, setTutte] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      repository.listAppuntamenti({ clienteId }),
      repository.listLezioni({ clienteId }),
      repository.listCorsi(),
    ]).then(([appuntamenti, lezioni, corsi]) => !cancelled && setDati({ appuntamenti, lezioni, corsi }))
    return () => {
      cancelled = true
    }
  }, [repository, clienteId])

  if (!dati) return null
  const prossimi = dati.appuntamenti.filter(
    (a) => (a.stato === 'programmato' && new Date(a.inizio) >= now) || daSegnare(a, now),
  )
  const storico = [...dati.lezioni].reverse()
  const visibili = tutte ? storico : storico.slice(0, 8)
  const descrizione = (l: Lezione) => {
    if (l.corsoId) return dati.corsi.find((c) => c.id === l.corsoId)?.nome ?? 'Corso'
    const app = dati.appuntamenti.find((a) => a.id === l.appuntamentoId)
    if (app?.valutazione) return 'Valutazione posturale'
    return l.disciplina === 'fisio' ? 'Seduta' : 'Lezione'
  }

  return (
    <>
      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Appuntamenti</h2>
          <ButtonLink
            to={`/agenda/appuntamenti/nuovo?cliente=${clienteId}`}
            variant="secondary"
            className="shrink-0"
            aria-label="Nuovo appuntamento"
          >
            <PlusIcon width={20} height={20} strokeWidth={2.5} />
            Nuovo
          </ButtonLink>
        </div>
        {prossimi.length === 0 ? (
          <EmptyState>Nessun appuntamento in programma.</EmptyState>
        ) : (
          <ul className="divide-y divide-brand-200 overflow-hidden rounded-2xl bg-white shadow-sm">
            {prossimi.map((a) => {
              const label = statoAppuntamentoLabel(a, now)
              const inizio = new Date(a.inizio)
              return (
                <li key={a.id}>
                  <Link to={`/agenda/appuntamenti/${a.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 active:bg-brand-100">
                    <span className="flex flex-1 flex-col">
                      <span className="font-semibold first-letter:uppercase">
                        {giornoBreve(inizio)} · {orario(inizio, a.durataMinuti)}
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <DisciplinaPill disciplina={a.disciplina} />
                        {a.valutazione && <span className="text-sm font-semibold">Valutazione</span>}
                        {label && (
                          <span className={`rounded-full border px-2.5 py-0.5 text-sm font-semibold ${TONE_STYLE[label.tono]}`}>
                            {label.testo}
                          </span>
                        )}
                      </span>
                    </span>
                    <ChevronRightIcon className="shrink-0 text-brand-400" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-xl font-bold">Lezioni</h2>
        {storico.length === 0 ? (
          <EmptyState>Nessuna lezione registrata.</EmptyState>
        ) : (
          <>
            <ul className="divide-y divide-brand-200 overflow-hidden rounded-2xl bg-white shadow-sm">
              {visibili.map((l) => (
                <li key={l.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                  <span className="w-24 shrink-0 font-semibold first-letter:uppercase">{giornoBreve(new Date(l.data))}</span>
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                    <DisciplinaPill disciplina={l.disciplina} />
                    <span className="text-brand-700">{descrizione(l)}</span>
                    {l.stato === 'assente' && (
                      <span className={`rounded-full border px-2.5 py-0.5 text-sm font-semibold ${TONE_STYLE.neutro}`}>Assenza</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {storico.length > 8 && (
              <button
                type="button"
                onClick={() => setTutte((v) => !v)}
                className="mt-2 min-h-12 w-full font-semibold text-brand-700 underline"
              >
                {tutte ? 'Mostra meno' : `Mostra tutte (${storico.length})`}
              </button>
            )}
          </>
        )}
      </section>
    </>
  )
}
