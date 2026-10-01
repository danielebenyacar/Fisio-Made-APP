import { useId, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useRepository } from '../../app/dataSource'
import { useGoBack } from '../../app/useGoBack'
import { BackButton } from '../../components/BackButton'
import { Button } from '../../components/Button'
import { ButtonLink } from '../../components/ButtonLink'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { DisciplinaToggle } from '../../components/DisciplinaToggle'
import { EmptyState } from '../../components/EmptyState'
import { AlertIcon, CheckIcon } from '../../components/icons'
import { PageTitle } from '../../components/PageTitle'
import type { Cliente, Disciplina } from '../../data'
import { fullName } from '../../lib/clienti'
import { ageOn, formatDateIt } from '../../lib/dates'
import { formatPhone } from '../../lib/whatsapp'
import { ClientePacchetti } from '../pacchetti/ClientePacchetti'
import { useCliente } from './useClienti'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-3">
      <dt className="text-brand-600">{label}</dt>
      <dd className="mt-0.5 font-semibold">{children}</dd>
    </div>
  )
}

const missing = <span className="font-normal text-brand-500">Non indicato</span>

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
  const disciplineLabelId = useId()
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [saveError, setSaveError] = useState(false)

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

      <section className="mt-5">
        <h2 id={disciplineLabelId} className="mb-1.5 font-semibold">
          Discipline
        </h2>
        <DisciplinaToggle
          value={cliente.discipline}
          onChange={(discipline: Disciplina[]) => save({ discipline })}
          labelledBy={disciplineLabelId}
        />
      </section>

      {!cliente.archiviato && <ClientePacchetti clienteId={cliente.id} today={today} />}

      <h2 className="mt-6 mb-2 text-xl font-bold">Dati</h2>
      <dl className="divide-y divide-brand-200 rounded-2xl bg-white px-4 shadow-sm">
        <Row label="Telefono">
          {cliente.telefono ? (
            <a href={`tel:${cliente.telefono}`} className="text-brand-900 underline">
              {formatPhone(cliente.telefono)}
            </a>
          ) : (
            missing
          )}
        </Row>
        <Row label="Email">
          {cliente.email ? (
            <a href={`mailto:${cliente.email}`} className="break-all text-brand-900 underline">
              {cliente.email}
            </a>
          ) : (
            missing
          )}
        </Row>
        <Row label="Data di nascita">
          {cliente.dataNascita
            ? `${formatDateIt(cliente.dataNascita)} · ${ageOn(cliente.dataNascita, today)} anni`
            : missing}
        </Row>
        <Row label="Consenso privacy">
          {cliente.consensoPrivacy ? (
            <span className="flex items-center gap-1.5">
              <CheckIcon width={20} height={20} strokeWidth={3} className="text-posturale-700" />
              Firmato{cliente.consensoData && ` il ${formatDateIt(cliente.consensoData)}`}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-danger-700">
              <AlertIcon width={20} height={20} />
              Da far firmare
            </span>
          )}
        </Row>
        {cliente.note && (
          <Row label="Note">
            <span className="font-normal whitespace-pre-line">{cliente.note}</span>
          </Row>
        )}
      </dl>

      <div className="mt-6 flex flex-col gap-3">
        <ButtonLink to={`/clienti/${cliente.id}/modifica`}>Modifica dati</ButtonLink>
        {cliente.archiviato ? (
          <Button variant="secondary" onClick={() => save({ archiviato: false })}>
            Ripristina cliente
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setConfirmArchive(true)}>
            Archivia cliente
          </Button>
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
