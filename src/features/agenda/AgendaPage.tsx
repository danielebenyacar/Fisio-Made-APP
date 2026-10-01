import { addDays, format, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ButtonLink } from '../../components/ButtonLink'
import { DISCIPLINA_STYLE } from '../../components/disciplinaStyles'
import { DisciplinaPill } from '../../components/DisciplinaPill'
import { EmptyState } from '../../components/EmptyState'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '../../components/icons'
import { PageTitle } from '../../components/PageTitle'
import { TONE_STYLE } from '../../components/toneStyles'
import type { Appuntamento, Cliente } from '../../data'
import { giorniSettimana, occorrenzeCorsi, presentiOccorrenza, type Occorrenza } from '../../lib/agenda'
import { orario, statoAppuntamentoLabel } from '../../lib/appuntamenti'
import { formatDateShort, formatDayHeading, parseDateText, toIsoDate } from '../../lib/dates'
import { parseIsoDate } from '../../lib/packages'
import { useAgenda } from './useAgenda'

type Voce =
  | { tipo: 'corso'; inizio: Date; occorrenza: Occorrenza; presenti: number }
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
          presenti: presentiOccorrenza(dati.lezioni, occorrenza.corso.id, occorrenza.giorno).length,
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

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => select(addDays(selected, -7))}
          aria-label="Settimana prima"
          className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-brand-700 active:bg-brand-100"
        >
          <ChevronLeftIcon />
        </button>
        <p className="font-semibold">
          {formatDateShort(toIsoDate(week[0]))} – {formatDateShort(toIsoDate(week[6]))}
        </p>
        <button
          type="button"
          onClick={() => select(addDays(selected, 7))}
          aria-label="Settimana dopo"
          className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-brand-700 active:bg-brand-100"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div role="group" aria-label="Giorni della settimana" className="mt-1 grid grid-cols-7 gap-1">
        {week.map((day) => {
          const iso = toIsoDate(day)
          const isSelected = iso === selectedIso
          const isToday = isSameDay(day, now)
          return (
            <button
              key={iso}
              type="button"
              aria-pressed={isSelected}
              aria-label={formatDayHeading(day)}
              onClick={() => select(day)}
              className={`flex min-h-14 flex-col items-center justify-center rounded-xl leading-tight ${
                isSelected ? 'bg-brand-800 text-white' : isToday ? 'bg-white font-bold ring-2 ring-brand-800' : 'bg-white'
              }`}
            >
              <span className="text-sm uppercase">{format(day, 'EEEEE', { locale: it })}</span>
              <span className="text-lg font-semibold">{format(day, 'd')}</span>
              <span
                className={`mt-0.5 size-1.5 rounded-full ${giorniConVoci.has(iso) ? (isSelected ? 'bg-white' : 'bg-brand-500') : ''}`}
                aria-hidden="true"
              />
            </button>
          )
        })}
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
                        Gruppo · {voce.presenti === 1 ? '1 presente' : `${voce.presenti} presenti`}
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
