import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useRepository } from '../../app/dataSource'
import { Button } from '../../components/Button'
import { DISCIPLINA_STYLE } from '../../components/disciplinaStyles'
import { DisciplinaPill } from '../../components/DisciplinaPill'
import { EmptyState } from '../../components/EmptyState'
import { ChevronRightIcon, PlusIcon } from '../../components/icons'
import { Sheet } from '../../components/Sheet'
import { TONE_STYLE } from '../../components/toneStyles'
import type { Appuntamento, Corso, Lezione } from '../../data'
import { daSegnare, dataOra, GIORNI, gruppiDelCliente } from '../../lib/agenda'
import { orario, statoAppuntamentoLabel } from '../../lib/appuntamenti'
import { useDisciplineAutomatiche } from '../clienti/useDisciplineAutomatiche'

type Dati = { appuntamenti: Appuntamento[]; lezioni: Lezione[]; corsi: Corso[] }

const giornoBreve = (date: Date) => format(date, 'EEE d MMM', { locale: it })
const quandoCorso = (c: Corso) => `${GIORNI[c.giorno - 1]} · ${orario(dataOra('2026-01-05', c.ora), c.durataMinuti)}`

type Props = {
  clienteId: string
  now: Date
  onClienteChange: () => void
  /** The "choose a group" sheet, opened from the client page. */
  scegliGruppo: boolean
  onChiudiScegliGruppo: () => void
  /** Shown right after the upcoming appointments (the packages). */
  children?: ReactNode
}

/**
 * Client page: upcoming appointments, fixed groups and the lessons done.
 * Sections with nothing in them are not shown.
 */
export function ClienteAgenda({ clienteId, now, onClienteChange, scegliGruppo, onChiudiScegliGruppo, children }: Props) {
  const repository = useRepository()
  const { aggiungi, rimuoviSeNonUsata } = useDisciplineAutomatiche()
  const [dati, setDati] = useState<Dati | null>(null)
  const [storicoAperto, setStoricoAperto] = useState(false)

  async function setIscritto(corso: Corso, iscritto: boolean) {
    const iscritti = iscritto ? [...corso.iscritti, clienteId] : corso.iscritti.filter((id) => id !== clienteId)
    const updated = await repository.updateCorso(corso.id, { iscritti })
    setDati((d) => d && { ...d, corsi: d.corsi.map((c) => (c.id === updated.id ? updated : c)) })
    onChiudiScegliGruppo()
    // Joining a yoga group makes the client a yoga client, and so on.
    if (iscritto) await aggiungi(clienteId, corso.disciplina)
    else await rimuoviSeNonUsata(clienteId, corso.disciplina)
    onClienteChange()
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
  const descrizione = (l: Lezione) => {
    if (l.corsoId) return dati.corsi.find((c) => c.id === l.corsoId)?.nome ?? 'Corso'
    const app = dati.appuntamenti.find((a) => a.id === l.appuntamentoId)
    if (app?.valutazione) return 'Valutazione posturale'
    return l.disciplina === 'fisio' ? 'Seduta' : 'Lezione'
  }

  const gruppi = gruppiDelCliente(dati.corsi, clienteId)
  const gruppiDisponibili = dati.corsi.filter((c) => c.attivo && !c.iscritti.includes(clienteId))

  return (
    <>
      {prossimi.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xl font-bold">Prossimi appuntamenti</h2>
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
        </section>
      )}

      {children}

      {gruppi.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xl font-bold">Gruppo fisso</h2>
          <ul className="divide-y divide-brand-200 overflow-hidden rounded-2xl bg-white shadow-sm">
            {gruppi.map((c) => (
              <li key={c.id} className="flex min-h-14 flex-wrap items-center gap-2 px-4 py-2">
                <span className="flex flex-1 flex-col">
                  <span className="font-semibold">{c.nome}</span>
                  <span className="text-brand-600 first-letter:uppercase">{quandoCorso(c)}</span>
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
        </section>
      )}

      {storico.length > 0 && (
        <section className="mt-6">
          <button
            type="button"
            aria-expanded={storicoAperto}
            onClick={() => setStoricoAperto((v) => !v)}
            className="flex min-h-12 w-full items-center justify-between rounded-2xl bg-white px-4 font-semibold shadow-sm active:bg-brand-100"
          >
            <span>Lezioni fatte ({storico.length})</span>
            <ChevronRightIcon className={`text-brand-400 transition-transform ${storicoAperto ? 'rotate-90' : ''}`} />
          </button>
          {storicoAperto && (
            <ul className="mt-2 divide-y divide-brand-200 overflow-hidden rounded-2xl bg-white shadow-sm">
              {storico.map((l) => (
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
          )}
        </section>
      )}

      <Sheet open={scegliGruppo} onClose={onChiudiScegliGruppo} labelledBy="scegli-gruppo">
        <h2 id="scegli-gruppo" className="text-xl font-bold">
          Scegli il gruppo
        </h2>
        <p className="mt-1 text-brand-600">Il gruppo di yoga o posturale a cui viene di solito.</p>
        <div className="mt-4 flex max-h-[55vh] flex-col gap-2 overflow-y-auto">
          {gruppiDisponibili.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setIscritto(c, true)}
              className={`flex min-h-14 items-center gap-3 rounded-2xl border border-l-4 border-brand-200 bg-white px-4 py-2 text-left active:bg-brand-100 ${DISCIPLINA_STYLE[c.disciplina].accent}`}
            >
              <span className="flex flex-1 flex-col">
                <span className="font-semibold">{c.nome}</span>
                <span className="text-brand-600 first-letter:uppercase">{quandoCorso(c)}</span>
              </span>
              <PlusIcon className="shrink-0 text-brand-500" />
            </button>
          ))}
          {gruppiDisponibili.length === 0 && <EmptyState>Nessun gruppo disponibile. Creali da Altro → Corsi.</EmptyState>}
        </div>
        <div className="mt-4">
          <Button variant="secondary" onClick={onChiudiScegliGruppo}>
            Chiudi
          </Button>
        </div>
      </Sheet>
    </>
  )
}
