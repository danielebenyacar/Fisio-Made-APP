import { addDays, format, isSameDay } from 'date-fns'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ButtonLink } from '../../components/ButtonLink'
import { DISCIPLINA_STYLE } from '../../components/disciplinaStyles'
import { DisciplinaPill } from '../../components/DisciplinaPill'
import { EmptyState } from '../../components/EmptyState'
import { ChevronRightIcon, PlusIcon } from '../../components/icons'
import { PageTitle } from '../../components/PageTitle'
import { TONE_STYLE } from '../../components/toneStyles'
import type { Appuntamento, Cliente } from '../../data'
import { giorniSettimana, occorrenzeCorsi, presentiOccorrenza, type Occorrenza } from '../../lib/agenda'
import { orario, statoAppuntamentoLabel } from '../../lib/appuntamenti'
import { formatDayHeading, parseDateText, toIsoDate } from '../../lib/dates'
import { parseIsoDate } from '../../lib/packages'
import { useAgenda } from './useAgenda'
import { WeekStrip } from './WeekStrip'

type Voce =
  | { tipo: 'corso'; inizio: Date; occorrenza: Occorrenza; presenti: number; iscritti: number }
  | { tipo: 'appuntamento'; inizio: Date; appuntamento: Appuntamento; cliente?: Cliente }

export function AgendaPage() {
  const [now] = useState(() => new Date())
  const [params, setParams] = useSearchParams()
  const giornoParam = params.get('giorno')
  const selected = giornoParam && parseDateText(giornoParam) ? parseIsoDate(giornoParam) : now
  const week = giorniSettimana(selected)
  const { dati, error } = useAgenda(week[0], addDays(week[0], 7))

  const select = (day: Date) => setParams({ giorno: toIsoDate(day) }, { replace: true })
  const selectedIso = toIsoDate(selected)

  const voci: Voce[] = dati
    ? [
        ...occorrenzeCorsi(dati.corsi, week).map((occorrenza) => ({
          tipo: 'corso' as const,
          inizio: occorrenza.inizio,
          occorrenza,
          presenti: presentiOccorrenza(dati.lezioni, occorrenza.corso.id, occorrenza.giorno).filter(
            (l) => l.stato === 'fatta',
          ).length,
          iscritti: occorrenza.corso.iscritti.filter((id) => dati.clienti.some((c) => c.id === id && !c.archiviato))
            .length,
        })),
        ...dati.appuntamenti.map((appuntamento) => ({
          tipo: 'appuntamento' as const,
          inizio: new Date(appuntamento.inizio),
          appuntamento,
          cliente: dati.clienti.find((c) => c.id === appuntamento.clienteId),
        })),
      ].sort((a, b) => a.inizio.getTime() - b.inizio.getTime())
    : []
  const delGiorno = voci.filter((v) => toIsoDate(v.inizio) === selectedIso)
  const giorniConVoci = new Set(voci.map((v) => toIsoDate(v.inizio)))

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <PageTitle>Agenda</PageTitle>
        <ButtonLink to={`/agenda/appuntamenti/nuovo?giorno=${selectedIso}`} className="shrink-0">
          <PlusIcon width={20} height={20} strokeWidth={2.5} />
          Appuntamento
        </ButtonLink>
      </div>

      <div className="mt-4">
        <WeekStrip selected={selected} now={now} onSelect={select} marked={giorniConVoci} />
      </div>

      <div className="mt-5 flex items-center gap-2">
        <h2 className="text-xl font-bold first-letter:uppercase">{formatDayHeading(selected)}</h2>
        {!isSameDay(selected, now) && (
          <button
            type="button"
            onClick={() => select(now)}
            className="min-h-10 rounded-full border border-brand-300 bg-white px-3 font-semibold"
          >
            Oggi
          </button>
        )}
      </div>

      <div className="mt-3">
        {error ? (
          <EmptyState>Non riesco a caricare l’agenda. Riprova tra poco.</EmptyState>
        ) : !dati ? null : delGiorno.length === 0 ? (
          <EmptyState>Nessun corso né appuntamento in questo giorno.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {delGiorno.map((voce) =>
              voce.tipo === 'corso' ? (
                <li key={`${voce.occorrenza.corso.id}-${voce.occorrenza.giorno}`}>
                  <Link
                    to={`/agenda/corsi/${voce.occorrenza.corso.id}/${voce.occorrenza.giorno}`}
                    className={`flex min-h-16 items-center gap-3 rounded-2xl border-l-4 bg-white px-4 py-3 shadow-sm active:bg-brand-100 ${DISCIPLINA_STYLE[voce.occorrenza.corso.disciplina].accent}`}
                  >
                    <span className="w-14 shrink-0 font-semibold">{format(voce.inizio, 'HH:mm')}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold">{voce.occorrenza.corso.nome}</span>
                      <span className="text-brand-600">
                        {voce.inizio > now
                          ? `Gruppo · ${voce.iscritti === 1 ? '1 iscritto' : `${voce.iscritti} iscritti`}`
                          : `Gruppo · ${voce.presenti}/${voce.iscritti} presenti`}
                      </span>
                    </span>
                    <ChevronRightIcon className="shrink-0 text-brand-400" />
                  </Link>
                </li>
              ) : (
                <li key={voce.appuntamento.id}>
                  <AppuntamentoRiga voce={voce} now={now} />
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <ButtonLink to="/altro/corsi" variant="secondary">
          Gestisci i corsi settimanali
        </ButtonLink>
      </div>
    </>
  )
}

function AppuntamentoRiga({ voce, now }: { voce: Extract<Voce, { tipo: 'appuntamento' }>; now: Date }) {
  const { appuntamento, cliente } = voce
  const label = statoAppuntamentoLabel(appuntamento, now)
  const annullato = appuntamento.stato === 'annullato'
  return (
    <Link
      to={`/agenda/appuntamenti/${appuntamento.id}`}
      className={`flex min-h-16 items-center gap-3 rounded-2xl border-l-4 bg-white px-4 py-3 shadow-sm active:bg-brand-100 ${DISCIPLINA_STYLE[appuntamento.disciplina].accent} ${annullato ? 'opacity-60' : ''}`}
    >
      <span className="w-14 shrink-0 font-semibold">{format(voce.inizio, 'HH:mm')}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`truncate font-semibold ${annullato ? 'line-through' : ''}`}>
          {cliente ? `${cliente.nome} ${cliente.cognome}` : 'Cliente non trovato'}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <DisciplinaPill disciplina={appuntamento.disciplina} />
          {appuntamento.valutazione && (
            <span className="rounded-full border border-brand-300 px-2.5 py-0.5 text-sm font-semibold">Valutazione</span>
          )}
          {label && (
            <span className={`rounded-full border px-2.5 py-0.5 text-sm font-semibold ${TONE_STYLE[label.tono]}`}>
              {label.testo}
            </span>
          )}
        </span>
        <span className="sr-only">{orario(voce.inizio, appuntamento.durataMinuti)}</span>
      </span>
      <ChevronRightIcon className="shrink-0 text-brand-400" />
    </Link>
  )
}
