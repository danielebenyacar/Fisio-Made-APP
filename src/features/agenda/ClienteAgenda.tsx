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
import { Button } from '../../components/Button'
import { DISCIPLINA_STYLE } from '../../components/disciplinaStyles'
import type { Appuntamento, Corso, Disciplina, Lezione } from '../../data'
import { daSegnare, dataOra, GIORNI, gruppiDelCliente } from '../../lib/agenda'
import { orario, statoAppuntamentoLabel } from '../../lib/appuntamenti'

type Dati = { appuntamenti: Appuntamento[]; lezioni: Lezione[]; corsi: Corso[] }

const giornoBreve = (date: Date) => format(date, 'EEE d MMM', { locale: it })

type Props = { clienteId: string; discipline: Disciplina[]; now: Date }

/** Client page: fixed groups, upcoming appointments and the history of lessons. */
export function ClienteAgenda({ clienteId, discipline, now }: Props) {
  const repository = useRepository()
  const [dati, setDati] = useState<Dati | null>(null)
  const [tutte, setTutte] = useState(false)
  const [scegliGruppo, setScegliGruppo] = useState(false)

  async function setIscritto(corso: Corso, iscritto: boolean) {
    const iscritti = iscritto ? [...corso.iscritti, clienteId] : corso.iscritti.filter((id) => id !== clienteId)
    const updated = await repository.updateCorso(corso.id, { iscritti })
    setDati((d) => d && { ...d, corsi: d.corsi.map((c) => (c.id === updated.id ? updated : c)) })
    setScegliGruppo(false)
  }

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

  const gruppi = gruppiDelCliente(dati.corsi, clienteId)
  const gruppiDisponibili = dati.corsi.filter(
    (c) => c.attivo && !c.iscritti.includes(clienteId) && (discipline.length === 0 || discipline.includes(c.disciplina)),
  )
  const mostraGruppi = gruppi.length > 0 || discipline.some((d) => d !== 'fisio')

  return (
    <>
      {mostraGruppi && (
        <section className="mt-6">
          <h2 className="mb-1 text-xl font-bold">Gruppi fissi</h2>
          <p className="mb-2 text-brand-600">Il gruppo a cui viene di solito. Può cambiarlo quando vuole.</p>
          {gruppi.length > 0 && (
            <ul className="mb-3 divide-y divide-brand-200 overflow-hidden rounded-2xl bg-white shadow-sm">
              {gruppi.map((c) => (
                <li key={c.id} className="flex min-h-14 flex-wrap items-center gap-2 px-4 py-2">
                  <span className="flex flex-1 flex-col">
                    <span className="font-semibold">{c.nome}</span>
                    <span className="text-brand-600 first-letter:uppercase">
                      {GIORNI[c.giorno - 1]} · {orario(dataOra('2026-01-05', c.ora), c.durataMinuti)}
                    </span>
                  </span>
                  <DisciplinaPill disciplina={c.disciplina} />
                  <button
                    type="button"
                    onClick={() => setIscritto(c, false)}
                    className="min-h-12 rounded-xl px-2 font-semibold text-danger-700 underline"
                  >
                    Togli
                  </button>
                </li>
              ))}
            </ul>
          )}
          {scegliGruppo ? (
            <div className="flex flex-col gap-2">
              {gruppiDisponibili.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setIscritto(c, true)}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl border-l-4 bg-white px-4 py-2 text-left shadow-sm active:bg-brand-100 ${DISCIPLINA_STYLE[c.disciplina].accent}`}
                >
                  <span className="flex flex-1 flex-col">
                    <span className="font-semibold">{c.nome}</span>
                    <span className="text-brand-600 first-letter:uppercase">
                      {GIORNI[c.giorno - 1]} · {orario(dataOra('2026-01-05', c.ora), c.durataMinuti)}
                    </span>
                  </span>
                  <PlusIcon className="shrink-0 text-brand-500" />
                </button>
              ))}
              {gruppiDisponibili.length === 0 && <EmptyState>Nessun altro gruppo disponibile.</EmptyState>}
              <Button variant="secondary" onClick={() => setScegliGruppo(false)}>
                Chiudi
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setScegliGruppo(true)}>
              {gruppi.length > 0 ? 'Aggiungi o cambia gruppo' : 'Scegli il gruppo'}
            </Button>
          )}
        </section>
      )}

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
