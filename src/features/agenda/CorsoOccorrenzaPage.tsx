import { addDays } from 'date-fns'
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
import { PageTitle } from '../../components/PageTitle'
import { Sheet } from '../../components/Sheet'
import { TONE_STYLE } from '../../components/toneStyles'
import type { Cliente, Disciplina, Lezione, Pacchetto } from '../../data'
import { dataOra, presentiOccorrenza } from '../../lib/agenda'
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
  if (!dati || !pacchettiState.pacchetti || !pacchettiState.lezioni) return null
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
      corsoNome={corso.nome}
      corsoId={corso.id}
      disciplina={corso.disciplina}
      inizio={dataOra(giorno, corso.ora)}
      durataMinuti={corso.durataMinuti}
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
  corsoNome: string
  corsoId: string
  disciplina: Disciplina
  inizio: Date
  durataMinuti: number
  giorno: string
  clienti: Cliente[]
  lezioni: Lezione[]
  pacchetti: Pacchetto[]
  onChange: () => void
  goBack: () => void
}

function Occorrenza(props: Props) {
  const { corsoNome, corsoId, disciplina, inizio, durataMinuti, giorno, clienti, lezioni, pacchetti, onChange, goBack } =
    props
  const repository = useRepository()
  const { registra } = useRegistraLezione()
  const [now] = useState(() => new Date())
  const [adding, setAdding] = useState(false)
  const [toRemove, setToRemove] = useState<Lezione | null>(null)
  const [pending, setPending] = useState<{ cliente: Cliente; scelta: SceltaPacchetto } | null>(null)

  const presenti = presentiOccorrenza(lezioni, corsoId, giorno)
  const presentIds = new Set(presenti.map((l) => l.clienteId))
  const futuro = inizio.getTime() - now.getTime() > 60 * 60 * 1000 // more than an hour ahead
  const clienteById = (id: string) => clienti.find((c) => c.id === id)
  const sceltaPer = (cliente: Cliente) =>
    pacchettoPerLezione(
      pacchetti.filter((p) => p.clienteId === cliente.id),
      lezioni.filter((l) => l.clienteId === cliente.id),
      disciplina,
      inizio,
    )
  // People who do this discipline (tag or package) first, not already present.
  const candidati = clienti.filter(
    (c) =>
      !presentIds.has(c.id) &&
      (c.discipline.includes(disciplina) || pacchetti.some((p) => p.clienteId === c.id && p.disciplina === disciplina)),
  )

  async function aggiungi(cliente: Cliente, forza = false) {
    const esito = await registra(
      { cliente, disciplina, quando: inizio, corsoId, forzaSettimana: forza },
      { onUndone: onChange },
    )
    if (esito.tipo === 'ok') {
      setPending(null)
      setAdding(false)
      onChange()
    } else {
      setPending({ cliente, scelta: esito })
    }
  }

  async function togli() {
    if (!toRemove) return
    await repository.deleteLezione(toRemove.id)
    setToRemove(null)
    onChange()
  }

  return (
    <>
      <BackButton label="Agenda" onClick={goBack} />
      <PageTitle>{corsoNome}</PageTitle>
      <p className="mt-1 text-brand-700 first-letter:uppercase">
        {formatDayHeading(inizio)} · {orario(inizio, durataMinuti)}
      </p>
      <div className="mt-2">
        <DisciplinaPill disciplina={disciplina} />
      </div>

      <h2 className="mt-6 mb-2 text-xl font-bold">
        Presenti {presenti.length > 0 && <span className="text-brand-600">({presenti.length})</span>}
      </h2>
      {presenti.length === 0 ? (
        <EmptyState>{futuro ? 'Il corso non è ancora iniziato.' : 'Nessuna presenza segnata.'}</EmptyState>
      ) : (
        <ul className="divide-y divide-brand-200 overflow-hidden rounded-2xl bg-white shadow-sm">
          {presenti.map((l) => {
            const cliente = clienteById(l.clienteId)
            return (
              <li key={l.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <span className="flex-1 text-lg">{cliente ? fullName(cliente) : 'Cliente non trovato'}</span>
                <button
                  type="button"
                  onClick={() => setToRemove(l)}
                  className="min-h-12 rounded-xl px-3 font-semibold text-danger-700 underline"
                >
                  Togli
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-4">
        {futuro ? (
          <p className="text-brand-600">Le presenze si segnano dal giorno del corso.</p>
        ) : adding ? (
          <div className="flex flex-col gap-3">
            <ClientePicker
              clienti={candidati.length > 0 ? candidati : clienti.filter((c) => !presentIds.has(c.id))}
              autoFocus
              placeholder="Chi è venuto?"
              onSelect={(cliente) => aggiungi(cliente)}
              dettaglio={(cliente) => {
                const label = SCELTA_LABEL[sceltaPer(cliente).tipo]
                return (
                  <span className={`self-start rounded-full border px-2.5 py-0.5 text-sm font-semibold ${TONE_STYLE[label.tono]}`}>
                    {label.testo}
                  </span>
                )
              }}
            />
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Chiudi
            </Button>
          </div>
        ) : (
          <Button onClick={() => setAdding(true)}>Aggiungi presente</Button>
        )}
      </div>

      <ConfirmSheet
        open={toRemove !== null}
        title="Togliere la presenza?"
        message={`La lezione di ${toRemove ? fullName(clienteById(toRemove.clienteId) ?? { nome: '', cognome: '' }) : ''} viene cancellata e torna disponibile nel suo abbonamento.`}
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
              <Button onClick={() => aggiungi(pending.cliente, true)}>Segna comunque</Button>
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
