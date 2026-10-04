import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useRepository } from '../../app/dataSource'
import { useGoBack } from '../../app/useGoBack'
import { BackButton } from '../../components/BackButton'
import { Button } from '../../components/Button'
import { ButtonLink } from '../../components/ButtonLink'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { DisciplinaPills } from '../../components/DisciplinaPill'
import { EmptyState } from '../../components/EmptyState'
import { CalendarIcon, TicketIcon, UsersIcon } from '../../components/icons'
import { PageTitle } from '../../components/PageTitle'
import type { Cliente } from '../../data'
import { fullName } from '../../lib/clienti'
import { ageOn, formatDateIt } from '../../lib/dates'
import { formatPhone } from '../../lib/whatsapp'
import { ClienteAgenda } from '../agenda/ClienteAgenda'
import { ClientePacchetti } from '../pacchetti/ClientePacchetti'
import { useCliente } from './useClienti'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3">
      <dt className="shrink-0 text-brand-600">{label}</dt>
      <dd className="min-w-0 text-right font-semibold">{children}</dd>
    </div>
  )
}

const AZIONE =
  'flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-white px-1 py-2 font-semibold shadow-sm active:bg-brand-100'

export function ClienteDetailPage() {
  const { id } = useParams()
  const { cliente, error, setCliente } = useCliente(id)
  const goBack = useGoBack('/clienti')
  const [today] = useState(() => new Date())

  if (error) return <EmptyState>Non riesco a caricare il cliente. Riprova tra poco.</EmptyState>
  if (cliente === undefined) return null
  if (cliente === null) {
    return (
      <>
        <BackButton label="Clienti" onClick={goBack} />
        <EmptyState>Cliente non trovato.</EmptyState>
      </>
    )
  }

  return (
    <ClienteDetail
      key={cliente.id}
      cliente={cliente}
      today={today}
      onChange={setCliente}
      goBack={goBack}
    />
  )
}

type DetailProps = {
  cliente: Cliente
  today: Date
  onChange: (cliente: Cliente) => void
  goBack: () => void
}

function ClienteDetail({ cliente, today, onChange, goBack }: DetailProps) {
  const repository = useRepository()
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [scegliGruppo, setScegliGruppo] = useState(false)
  const haDati = Boolean(cliente.telefono || cliente.email || cliente.dataNascita || cliente.note)

  async function save(patch: Partial<Cliente>): Promise<boolean> {
    const previous = cliente
    onChange({ ...cliente, ...patch }) // optimistic: the button reacts at once
    try {
      onChange(await repository.updateCliente(cliente.id, patch))
      setSaveError(false)
      return true
    } catch {
      onChange(previous)
      setSaveError(true)
      return false
    }
  }

  /** Disciplines change when groups change: read the client again. */
  async function refresh() {
    const fresh = await repository.getCliente(cliente.id)
    if (fresh) onChange(fresh)
  }

  async function archive() {
    setConfirmArchive(false)
    if (await save({ archiviato: true })) goBack()
  }

  return (
    <>
      <BackButton label="Clienti" onClick={goBack} />
      <PageTitle>{fullName(cliente)}</PageTitle>
      {cliente.archiviato && (
        <p className="mt-2 inline-block rounded-full bg-brand-200 px-3 py-0.5 font-semibold text-brand-800">
          Archiviato
        </p>
      )}
      {saveError && (
        <p role="alert" className="mt-2 font-semibold text-danger-700">
          Modifica non salvata, riprova.
        </p>
      )}

      {cliente.discipline.length > 0 && (
        <div className="mt-2" role="group" aria-label="Discipline">
          <DisciplinaPills discipline={cliente.discipline} />
        </div>
      )}

      {!cliente.archiviato && (
        <>
          <nav aria-label="Azioni" className="mt-5 grid grid-cols-[1.3fr_1fr_1fr] gap-2">
            <Link to={`/agenda/appuntamenti/nuovo?cliente=${cliente.id}`} className={AZIONE}>
              <CalendarIcon className="text-fisio-700" />
              Appuntamento
            </Link>
            <Link to={`/clienti/${cliente.id}/pacchetti/nuovo`} className={AZIONE}>
              <TicketIcon className="text-brand-700" />
              Pacchetto
            </Link>
            <button type="button" onClick={() => setScegliGruppo(true)} className={AZIONE}>
              <UsersIcon className="text-yoga-700" />
              Gruppo
            </button>
          </nav>
          <ClienteAgenda
            clienteId={cliente.id}
            now={today}
            onClienteChange={refresh}
            scegliGruppo={scegliGruppo}
            onChiudiScegliGruppo={() => setScegliGruppo(false)}
          >
            <ClientePacchetti clienteId={cliente.id} today={today} />
          </ClienteAgenda>
        </>
      )}

      {haDati && (
        <>
          <h2 className="mt-8 mb-2 text-xl font-bold">Dati</h2>
          <dl className="divide-y divide-brand-200 rounded-2xl bg-white px-4 shadow-sm">
            {cliente.telefono && (
              <Row label="Telefono">
                <a href={`tel:${cliente.telefono}`} className="text-brand-900 underline">
                  {formatPhone(cliente.telefono)}
                </a>
              </Row>
            )}
            {cliente.email && (
              <Row label="Email">
                <a href={`mailto:${cliente.email}`} className="break-all text-brand-900 underline">
                  {cliente.email}
                </a>
              </Row>
            )}
            {cliente.dataNascita && (
              <Row label="Nascita">
                {formatDateIt(cliente.dataNascita)} · {ageOn(cliente.dataNascita, today)} anni
              </Row>
            )}
            {cliente.note && (
              <div className="py-3">
                <dt className="text-brand-600">Nota</dt>
                <dd className="mt-0.5 whitespace-pre-line">{cliente.note}</dd>
              </div>
            )}
          </dl>
        </>
      )}

      <div className={`${haDati ? 'mt-4' : 'mt-8'} flex flex-col gap-2`}>
        <ButtonLink to={`/clienti/${cliente.id}/modifica`} variant="secondary">
          Modifica dati
        </ButtonLink>
        {cliente.archiviato ? (
          <Button variant="secondary" onClick={() => save({ archiviato: false })}>
            Ripristina cliente
          </Button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmArchive(true)}
            className="min-h-12 font-semibold text-brand-600 underline"
          >
            Archivia cliente
          </button>
        )}
      </div>

      <ConfirmSheet
        open={confirmArchive}
        title={`Archiviare ${fullName(cliente)}?`}
        message="Non comparirà più nella lista clienti né negli avvisi. Potrai ripristinarlo in qualsiasi momento da “Vedi archiviati”."
        confirmLabel="Archivia"
        onConfirm={archive}
        onCancel={() => setConfirmArchive(false)}
      />
    </>
  )
}
