import { addDays, format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRepository } from '../../app/dataSource'
import { useGoBack } from '../../app/useGoBack'
import { BackButton } from '../../components/BackButton'
import { Button } from '../../components/Button'
import { ButtonLink } from '../../components/ButtonLink'
import { ClientePicker } from '../../components/ClientePicker'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { DisciplinaPill } from '../../components/DisciplinaPill'
import { EmptyState } from '../../components/EmptyState'
import { CheckIcon } from '../../components/icons'
import { PageTitle } from '../../components/PageTitle'
import { Sheet } from '../../components/Sheet'
import { TONE_STYLE } from '../../components/toneStyles'
import type { Cliente, Corso, Lezione, Pacchetto } from '../../data'
import {
  dataOra,
  lezioneAltraOccorrenza,
  presentiOccorrenza,
  presenzaInOccorrenza,
} from '../../lib/agenda'
import { orario } from '../../lib/appuntamenti'
import { fullName } from '../../lib/clienti'
import { formatDayHeading, parseDateText } from '../../lib/dates'
import { pacchettoPerLezione, parseIsoDate, type SceltaPacchetto } from '../../lib/packages'
import { usePacchetti } from '../pacchetti/usePacchetti'
import { useRegistraLezione } from '../lezioni/useRegistraLezione'
import { useAgenda } from './useAgenda'

const SCELTA_LABEL: Record<SceltaPacchetto['tipo'], { testo: string; tono: 'ok' | 'avviso' | 'problema' }> = {
  ok: { testo: 'Abbonamento valido', tono: 'ok' },
  'settimana-gia-usata': { testo: 'Lezione della settimana già fatta', tono: 'avviso' },
  nessuno: { testo: 'Nessun abbonamento valido', tono: 'problema' },
}

/** /agenda/corsi/:corsoId/:giorno — attendance of one session of a weekly class. */
export function CorsoOccorrenzaPage() {
  const { corsoId, giorno } = useParams()
  const goBack = useGoBack(`/agenda?giorno=${giorno}`)
  const valid = giorno && parseDateText(giorno) === giorno
  const day = valid ? parseIsoDate(giorno) : new Date(0)
  const { dati, error, reload } = useAgenda(day, addDays(day, 1))
  const pacchettiState = usePacchetti({ tutti: true })

  if (!valid) return <EmptyState>Data non valida.</EmptyState>
  if (error || pacchettiState.error) return <EmptyState>Non riesco a caricare il corso. Riprova tra poco.</EmptyState>
  if (!dati || !pacchettiState.pacchetti) return null
  const corso = dati.corsi.find((c) => c.id === corsoId)
  if (!corso) {
    return (
      <>
        <BackButton label="Agenda" onClick={goBack} />
        <EmptyState>Corso non trovato.</EmptyState>
      </>
    )
  }

  return (
    <Occorrenza
      key={`${corso.id}-${giorno}`}
      corso={corso}
      corsi={dati.corsi}
      giorno={giorno}
      clienti={dati.clienti}
      lezioni={dati.lezioni}
      pacchetti={pacchettiState.pacchetti}
      onChange={() => {
        reload()
        pacchettiState.reload()
      }}
      goBack={goBack}
    />
  )
}

type Props = {
  corso: Corso
  corsi: Corso[]
  giorno: string
  clienti: Cliente[]
  lezioni: Lezione[]
  pacchetti: Pacchetto[]
  onChange: () => void
  goBack: () => void
}

function Occorrenza({ corso, corsi, giorno, clienti, lezioni, pacchetti, onChange, goBack }: Props) {
  const repository = useRepository()
  const { registra, registraMolte } = useRegistraLezione()
  const [now] = useState(() => new Date())
  const [adding, setAdding] = useState(false)
  const [toRemove, setToRemove] = useState<Lezione | null>(null)
  const [pending, setPending] = useState<{ cliente: Cliente; scelta: SceltaPacchetto } | null>(null)
  const [busy, setBusy] = useState(false)

  const { disciplina } = corso
  const inizio = dataOra(giorno, corso.ora)
  const futuro = inizio.getTime() - now.getTime() > 60 * 60 * 1000 // more than an hour ahead
  const clienteById = (id: string) => clienti.find((c) => c.id === id)
  const sceltaPer = (cliente: Cliente) =>
    pacchettoPerLezione(
      pacchetti.filter((p) => p.clienteId === cliente.id),
      lezioni.filter((l) => l.clienteId === cliente.id),
      disciplina,
      inizio,
    )

  const iscritti = corso.iscritti
    .map(clienteById)
    .filter((c): c is Cliente => c !== undefined && !c.archiviato)
  const iscrittiIds = new Set(iscritti.map((c) => c.id))
  const ospiti = presentiOccorrenza(lezioni, corso.id, giorno).filter((l) => !iscrittiIds.has(l.clienteId))
  const presenteIds = new Set(presentiOccorrenza(lezioni, corso.id, giorno).map((l) => l.clienteId))
  const daSegnare = iscritti.filter(
    (c) =>
      !presenzaInOccorrenza(lezioni, c.id, corso.id, giorno) &&
      sceltaPer(c).tipo === 'ok' &&
      !lezioneAltraOccorrenza(lezioni, c.id, disciplina, inizio, corso.id),
  )
  const candidatiOspiti = clienti.filter(
    (c) =>
      !iscrittiIds.has(c.id) &&
      !presenteIds.has(c.id) &&
      (c.discipline.includes(disciplina) || pacchetti.some((p) => p.clienteId === c.id && p.disciplina === disciplina)),
  )

  async function segna(cliente: Cliente, stato: 'fatta' | 'assente', forza = false) {
    setBusy(true)
    const esito = await registra(
      { cliente, disciplina, quando: inizio, corsoId: corso.id, stato, forzaSettimana: forza || stato === 'assente' },
      { onUndone: onChange },
    )
    setBusy(false)
    if (esito.tipo === 'ok') {
      setPending(null)
      setAdding(false)
      onChange()
    } else {
      setPending({ cliente, scelta: esito })
    }
  }

  async function tuttiPresenti() {
    setBusy(true)
    await registraMolte(
      daSegnare.map((cliente) => ({ cliente, disciplina, quando: inizio, corsoId: corso.id })),
      { onUndone: onChange },
    )
    setBusy(false)
    onChange()
  }

  async function togli() {
    if (!toRemove) return
    await repository.deleteLezione(toRemove.id)
    setToRemove(null)
    onChange()
  }

  const chip = (testo: string, tono: keyof typeof TONE_STYLE, withCheck = false) => (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${TONE_STYLE[tono]}`}>
      {withCheck && <CheckIcon width={14} height={14} strokeWidth={3} />}
      {testo}
    </span>
  )

  return (
    <>
      <BackButton label="Agenda" onClick={goBack} />
      <PageTitle>{corso.nome}</PageTitle>
      <p className="mt-1 text-brand-700 first-letter:uppercase">
        {formatDayHeading(inizio)} · {orario(inizio, corso.durataMinuti)}
      </p>
      <div className="mt-2">
        <DisciplinaPill disciplina={disciplina} />
      </div>

      <div className="mt-6 mb-2 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">
          Iscritti {iscritti.length > 0 && <span className="text-brand-600">({iscritti.length})</span>}
        </h2>
        {!futuro && daSegnare.length > 1 && (
          <Button className="shrink-0" disabled={busy} onClick={tuttiPresenti}>
            Tutti presenti
          </Button>
        )}
      </div>
      {futuro && <p className="mb-2 text-brand-600">Le presenze si segnano dal giorno del corso.</p>}

      {iscritti.length === 0 ? (
        <EmptyState>
          Nessun iscritto fisso. Aggiungili da Altro → Corsi, oppure dalla scheda del cliente.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-brand-200 overflow-hidden rounded-2xl bg-white shadow-sm">
          {iscritti.map((cliente) => {
            const presenza = presenzaInOccorrenza(lezioni, cliente.id, corso.id, giorno)
            const altrove = presenza ? undefined : lezioneAltraOccorrenza(lezioni, cliente.id, disciplina, inizio, corso.id)
            const scelta = presenza || futuro ? null : sceltaPer(cliente)
            return (
              <li key={cliente.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-lg">
                    {cliente.nome} <strong className="font-semibold">{cliente.cognome}</strong>
                  </span>
                  {presenza && (
                    <span className="flex items-center gap-1">
                      {presenza.stato === 'fatta' ? chip('Presente', 'ok', true) : chip('Assente', 'neutro')}
                      <button
                        type="button"
                        onClick={() => setToRemove(presenza)}
                        aria-label={`Togli ${presenza.stato === 'fatta' ? 'presenza' : 'assenza'} di ${cliente.nome}`}
                        className="min-h-12 rounded-xl px-2 font-semibold text-danger-700 underline"
                      >
                        Togli
                      </button>
                    </span>
                  )}
                </div>
                {altrove && (
                  <p className="mt-1 font-semibold text-warning-900">
                    Già venuto/a questa settimana:{' '}
                    {format(new Date(altrove.data), 'EEEE d', { locale: it })}
                    {altrove.corsoId ? ` (${corsi.find((c) => c.id === altrove.corsoId)?.nome ?? 'altro gruppo'})` : ''}
                  </p>
                )}
                {!altrove && scelta && scelta.tipo !== 'ok' && (
                  <p className="mt-1">{chip(SCELTA_LABEL[scelta.tipo].testo, SCELTA_LABEL[scelta.tipo].tono)}</p>
                )}
                {!futuro && !presenza && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button disabled={busy} onClick={() => segna(cliente, 'fatta')}>
                      Presente
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy || scelta?.tipo === 'nessuno'}
                      onClick={() => segna(cliente, 'assente')}
                    >
                      Assente
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {(ospiti.length > 0 || !futuro) && (
        <>
          <h2 className="mt-6 mb-1 text-xl font-bold">Da altri gruppi</h2>
          <p className="mb-2 text-brand-600">Chi cambia gruppo questa settimana: conta come la sua lezione della settimana.</p>
        </>
      )}
      {ospiti.length > 0 && (
        <ul className="mb-3 divide-y divide-brand-200 overflow-hidden rounded-2xl bg-white shadow-sm">
          {ospiti.map((l) => {
            const cliente = clienteById(l.clienteId)
            return (
              <li key={l.id} className="flex min-h-14 flex-wrap items-center gap-2 px-4 py-2">
                <span className="flex-1 text-lg">{cliente ? fullName(cliente) : 'Cliente non trovato'}</span>
                {l.stato === 'fatta' ? chip('Presente', 'ok', true) : chip('Assente', 'neutro')}
                <button
                  type="button"
                  onClick={() => setToRemove(l)}
                  className="min-h-12 rounded-xl px-2 font-semibold text-danger-700 underline"
                >
                  Togli
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {!futuro &&
        (adding ? (
          <div className="flex flex-col gap-3">
            <ClientePicker
              clienti={candidatiOspiti}
              autoFocus
              placeholder="Chi è venuto da un altro gruppo?"
              onSelect={(cliente) => segna(cliente, 'fatta')}
              dettaglio={(cliente) => {
                const label = SCELTA_LABEL[sceltaPer(cliente).tipo]
                return <span className="self-start">{chip(label.testo, label.tono)}</span>
              }}
            />
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Chiudi
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            Aggiungi da un altro gruppo
          </Button>
        ))}

      <ConfirmSheet
        open={toRemove !== null}
        title={toRemove?.stato === 'assente' ? 'Togliere l’assenza?' : 'Togliere la presenza?'}
        message={`La registrazione di ${toRemove ? fullName(clienteById(toRemove.clienteId) ?? { nome: '', cognome: '' }) : ''} viene cancellata${toRemove?.stato === 'fatta' ? ' e la lezione torna disponibile nel suo abbonamento' : ''}.`}
        confirmLabel="Togli"
        onConfirm={togli}
        onCancel={() => setToRemove(null)}
      />

      <Sheet open={pending !== null} onClose={() => setPending(null)} labelledBy="pending-title">
        {pending?.scelta.tipo === 'settimana-gia-usata' && (
          <>
            <h2 id="pending-title" className="text-xl font-bold">
              Lezione della settimana già fatta
            </h2>
            <p className="mt-2 text-brand-700">
              {pending.cliente.nome} ha già usato la lezione di questa settimana del suo abbonamento. Vuoi segnarla
              comunque?
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button onClick={() => segna(pending.cliente, 'fatta', true)}>Segna comunque</Button>
              <Button variant="secondary" onClick={() => setPending(null)}>
                Annulla
              </Button>
            </div>
          </>
        )}
        {pending?.scelta.tipo === 'nessuno' && (
          <>
            <h2 id="pending-title" className="text-xl font-bold">
              Nessun abbonamento valido
            </h2>
            <p className="mt-2 text-brand-700">
              {pending.cliente.nome} non ha un abbonamento valido per questa data. Prima crea un pacchetto.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <ButtonLink to={`/clienti/${pending.cliente.id}/pacchetti/nuovo`}>Nuovo pacchetto</ButtonLink>
              <Button variant="secondary" onClick={() => setPending(null)}>
                Annulla
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </>
  )
}
