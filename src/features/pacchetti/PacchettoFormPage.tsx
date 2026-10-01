import { useId, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useRepository } from '../../app/dataSource'
import { useGoBack } from '../../app/useGoBack'
import { BackButton } from '../../components/BackButton'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { CheckboxRow } from '../../components/CheckboxRow'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { DisciplinaPicker } from '../../components/DisciplinaPicker'
import { DisciplinaPill } from '../../components/DisciplinaPill'
import { DISCIPLINA_STYLE } from '../../components/disciplinaStyles'
import { EmptyState } from '../../components/EmptyState'
import { TextAreaField, TextField } from '../../components/fields'
import { ChevronRightIcon } from '../../components/icons'
import { PageTitle } from '../../components/PageTitle'
import { SegmentedControl } from '../../components/SegmentedControl'
import { TONE_STYLE } from '../../components/toneStyles'
import type { Cliente, ModalitaPacchetto, Pacchetto, TipoPacchetto } from '../../data'
import { DISCIPLINE } from '../../data'
import { fullName } from '../../lib/clienti'
import { toIsoDate } from '../../lib/dates'
import { sortDiscipline } from '../../lib/discipline'
import { descriviTipo, MODALITA_LABEL } from '../../lib/listino'
import {
  conDataInizio,
  formDaTipo,
  pacchettoToForm,
  validatePacchettoForm,
  type PacchettoForm,
  type PacchettoFormErrors,
  type PacchettoFormValue,
} from '../../lib/pacchettoForm'
import { descriviAvanzamento, etichettaStato } from '../../lib/pacchettoLabel'
import { haSuccessivo, statoPacchetto } from '../../lib/packages'
import { useCliente } from '../clienti/useClienti'
import { SettimaneBar } from './SettimaneBar'
import { useListino, usePacchetti } from './usePacchetti'

/** /clienti/:id/pacchetti/nuovo and /clienti/:id/pacchetti/:pacchettoId */
export function PacchettoFormPage() {
  const { id, pacchettoId } = useParams()
  const { cliente, error } = useCliente(id)
  const goBack = useGoBack(`/clienti/${id}`)

  if (error) return <EmptyState>Non riesco a caricare il cliente. Riprova tra poco.</EmptyState>
  if (cliente === undefined) return null
  if (cliente === null) {
    return (
      <>
        <BackButton label="Indietro" onClick={goBack} />
        <EmptyState>Cliente non trovato.</EmptyState>
      </>
    )
  }
  return pacchettoId ? (
    <ModificaPacchetto cliente={cliente} pacchettoId={pacchettoId} goBack={goBack} />
  ) : (
    <NuovoPacchetto cliente={cliente} goBack={goBack} />
  )
}

// --- New package: pick from the price list, then adjust -------------------

function NuovoPacchetto({ cliente, goBack }: { cliente: Cliente; goBack: () => void }) {
  const repository = useRepository()
  const { tipi } = useListino()
  const [today] = useState(() => new Date())
  const [form, setForm] = useState<PacchettoForm | null>(null)

  async function save(value: PacchettoFormValue) {
    await repository.createPacchetto({ ...value, clienteId: cliente.id })
    // Selling a package of a discipline the client wasn't tagged with adds the tag.
    if (!cliente.discipline.includes(value.disciplina)) {
      await repository.updateCliente(cliente.id, {
        discipline: sortDiscipline([...cliente.discipline, value.disciplina]),
      })
    }
    goBack()
  }

  if (!form) {
    // The client's own disciplines first.
    const order = [...cliente.discipline, ...DISCIPLINE.filter((d) => !cliente.discipline.includes(d))]
    const active = (tipi ?? []).filter((t) => t.attivo)
    return (
      <>
        <BackButton label="Annulla" onClick={goBack} />
        <PageTitle>Nuovo pacchetto</PageTitle>
        <p className="mt-1 text-brand-600">per {fullName(cliente)}</p>
        <p className="mt-4 font-semibold">Scegli dal listino</p>
        {tipi === undefined ? null : (
          <div className="mt-2 flex flex-col gap-2">
            {order.flatMap((d) =>
              active
                .filter((t) => t.disciplina === d)
                .map((tipo) => <TipoButton key={tipo.id} tipo={tipo} onClick={() => setForm(formDaTipo(tipo, today))} />),
            )}
            <button
              type="button"
              onClick={() => setForm(formDaTipo(null, today))}
              className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-dashed border-brand-300 px-4 py-3 text-left active:bg-brand-100"
            >
              <span className="flex-1">
                <span className="block font-semibold">Personalizzato</span>
                <span className="text-brand-600">Un pacchetto che non è nel listino</span>
              </span>
              <ChevronRightIcon className="shrink-0 text-brand-400" />
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <BackButton label="Cambia pacchetto" onClick={() => setForm(null)} />
      <PageTitle>Nuovo pacchetto</PageTitle>
      <p className="mt-1 text-brand-600">per {fullName(cliente)}</p>
      <PacchettoFields
        form={form}
        onChange={setForm}
        today={today}
        lockKind={form.tipoId !== ''}
        submitLabel="Salva pacchetto"
        onSubmit={save}
        onCancel={goBack}
      />
    </>
  )
}

function TipoButton({ tipo, onClick }: { tipo: TipoPacchetto; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-16 items-center gap-3 rounded-2xl border-l-4 bg-white px-4 py-3 text-left shadow-sm active:bg-brand-100 ${DISCIPLINA_STYLE[tipo.disciplina].accent}`}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">{tipo.nome}</span>
        <span className="text-brand-600">{descriviTipo(tipo)}</span>
      </span>
      <ChevronRightIcon className="shrink-0 text-brand-400" />
    </button>
  )
}

// --- Edit an existing package ---------------------------------------------

function ModificaPacchetto({
  cliente,
  pacchettoId,
  goBack,
}: {
  cliente: Cliente
  pacchettoId: string
  goBack: () => void
}) {
  const { pacchetti, lezioni, error } = usePacchetti({ clienteId: cliente.id })
  const [today] = useState(() => new Date())

  if (error) return <EmptyState>Non riesco a caricare il pacchetto. Riprova tra poco.</EmptyState>
  if (!pacchetti || !lezioni) return null
  const pacchetto = pacchetti.find((p) => p.id === pacchettoId)
  if (!pacchetto) {
    return (
      <>
        <BackButton label="Indietro" onClick={goBack} />
        <EmptyState>Pacchetto non trovato.</EmptyState>
      </>
    )
  }
  const lessonCount = lezioni.filter((l) => l.pacchettoId === pacchetto.id).length
  return (
    <ModificaPacchettoForm
      key={pacchetto.id}
      pacchetto={pacchetto}
      cliente={cliente}
      lessonCount={lessonCount}
      stato={statoPacchetto(pacchetto, lezioni, today)}
      rinnovato={haSuccessivo(pacchetto, pacchetti)}
      today={today}
      goBack={goBack}
    />
  )
}

function ModificaPacchettoForm({
  pacchetto,
  cliente,
  lessonCount,
  stato,
  rinnovato,
  today,
  goBack,
}: {
  pacchetto: Pacchetto
  cliente: Cliente
  lessonCount: number
  stato: ReturnType<typeof statoPacchetto>
  rinnovato: boolean
  today: Date
  goBack: () => void
}) {
  const repository = useRepository()
  const [form, setForm] = useState(() => pacchettoToForm(pacchetto))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
  const etichetta = etichettaStato(pacchetto, stato, rinnovato)

  async function save(value: PacchettoFormValue) {
    await repository.updatePacchetto(pacchetto.id, value)
    goBack()
  }

  async function remove() {
    setConfirmDelete(false)
    try {
      await repository.deletePacchetto(pacchetto.id)
      goBack()
    } catch {
      setDeleteError(true)
    }
  }

  return (
    <>
      <BackButton label="Indietro" onClick={goBack} />
      <PageTitle>{pacchetto.nome}</PageTitle>
      <p className="mt-1 text-brand-600">di {fullName(cliente)}</p>

      <Card className="mt-4">
        <div className="flex items-center gap-2">
          <DisciplinaPill disciplina={pacchetto.disciplina} />
          <span className="font-semibold text-brand-700">{MODALITA_LABEL[pacchetto.modalita]}</span>
        </div>
        {etichetta && (
          <p className={`mt-3 inline-block rounded-full border px-2.5 py-0.5 font-semibold ${TONE_STYLE[etichetta.tono]}`}>
            {etichetta.testo}
          </p>
        )}
        <p className="mt-2 text-brand-700">{descriviAvanzamento(pacchetto, stato)}</p>
        {stato.settimane.length > 0 && (
          <div className="mt-2">
            <SettimaneBar settimane={stato.settimane} disciplina={pacchetto.disciplina} />
          </div>
        )}
      </Card>

      <PacchettoFields
        form={form}
        onChange={setForm}
        today={today}
        lockKind
        submitLabel="Salva modifiche"
        onSubmit={save}
        onCancel={goBack}
      />

      <div className="mt-8 border-t border-brand-200 pt-6">
        {lessonCount === 0 ? (
          <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
            Elimina pacchetto
          </Button>
        ) : (
          <p className="text-brand-600">
            Ha {lessonCount === 1 ? '1 lezione registrata' : `${lessonCount} lezioni registrate`}: non si può
            eliminare.
          </p>
        )}
        {deleteError && (
          <p role="alert" className="mt-2 font-semibold text-danger-700">
            Non sono riuscito a eliminarlo. Riprova.
          </p>
        )}
      </div>

      <ConfirmSheet
        open={confirmDelete}
        title="Eliminare il pacchetto?"
        message={`“${pacchetto.nome}” verrà tolto da ${fullName(cliente)}. Usalo solo per un pacchetto inserito per errore.`}
        confirmLabel="Elimina"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

// --- Shared fields ----------------------------------------------------------

const MODALITA_OPTIONS = (['sedute', 'abbonamento'] as ModalitaPacchetto[]).map((value) => ({
  value,
  label: MODALITA_LABEL[value],
}))

type FieldsProps = {
  form: PacchettoForm
  onChange: (form: PacchettoForm) => void
  today: Date
  /** Discipline and kind come from the price list or an existing package. */
  lockKind: boolean
  submitLabel: string
  onSubmit: (value: PacchettoFormValue) => Promise<void>
  onCancel: () => void
}

function PacchettoFields({ form, onChange, today, lockKind, submitLabel, onSubmit, onCancel }: FieldsProps) {
  const ids = useId()
  const fieldId = (name: string) => `${ids}-${name}`
  const [errors, setErrors] = useState<PacchettoFormErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const todayIso = toIsoDate(today)

  const update = (next: PacchettoForm, field?: keyof PacchettoFormErrors) => {
    onChange(next)
    if (field) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const result = validatePacchettoForm(form, today)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setSaving(true)
    try {
      await onSubmit(result.value)
    } catch {
      setSaving(false)
      setSaveError(true)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
      <TextField
        id={fieldId('nome')}
        label="Nome *"
        value={form.nome}
        onChange={(e) => update({ ...form, nome: e.target.value }, 'nome')}
        error={errors.nome}
        autoComplete="off"
      />

      {!lockKind && (
        <>
          <div>
            <p id={fieldId('disciplina')} className="mb-1.5 font-semibold">
              Disciplina *
            </p>
            <DisciplinaPicker
              value={form.disciplina}
              onChange={(disciplina) => update({ ...form, disciplina }, 'disciplina')}
              labelledBy={fieldId('disciplina')}
            />
            {errors.disciplina && <p className="mt-1.5 font-semibold text-danger-700">{errors.disciplina}</p>}
          </div>
          <div>
            <p id={fieldId('modalita')} className="mb-1.5 font-semibold">
              Tipo
            </p>
            <SegmentedControl
              value={form.modalita}
              options={MODALITA_OPTIONS}
              onChange={(modalita) => update({ ...form, modalita })}
              labelledBy={fieldId('modalita')}
            />
          </div>
        </>
      )}

      {form.modalita === 'sedute' ? (
        <>
          <TextField
            id={fieldId('lezioni')}
            label="Numero di sedute *"
            inputMode="numeric"
            value={form.lezioni}
            onChange={(e) => update({ ...form, lezioni: e.target.value }, 'lezioni')}
            error={errors.lezioni}
          />
          <TextField
            id={fieldId('dataAcquisto')}
            label="Data di acquisto *"
            type="date"
            value={form.dataAcquisto}
            // Sessions are usable from the purchase day.
            onChange={(e) => update({ ...form, dataAcquisto: e.target.value, dataInizio: e.target.value }, 'dataAcquisto')}
            error={errors.dataAcquisto ?? errors.dataInizio}
          />
          <TextField
            id={fieldId('scadenza')}
            label="Scadenza (facoltativa)"
            type="date"
            min={form.dataInizio}
            value={form.scadenza}
            onChange={(e) => update({ ...form, scadenza: e.target.value }, 'scadenza')}
            error={errors.scadenza}
          />
        </>
      ) : (
        <>
          <TextField
            id={fieldId('dataInizio')}
            label="Inizio *"
            type="date"
            value={form.dataInizio}
            onChange={(e) => update(conDataInizio(form, e.target.value), 'dataInizio')}
            error={errors.dataInizio}
          />
          <TextField
            id={fieldId('scadenza')}
            label="Ultimo giorno valido *"
            type="date"
            min={form.dataInizio}
            value={form.scadenza}
            onChange={(e) => update({ ...form, scadenza: e.target.value }, 'scadenza')}
            error={errors.scadenza}
          />
          <TextField
            id={fieldId('dataAcquisto')}
            label="Data di acquisto *"
            type="date"
            value={form.dataAcquisto}
            onChange={(e) => update({ ...form, dataAcquisto: e.target.value }, 'dataAcquisto')}
            error={errors.dataAcquisto}
          />
        </>
      )}

      <TextField
        id={fieldId('prezzo')}
        label="Prezzo in €"
        inputMode="decimal"
        value={form.prezzo}
        onChange={(e) => update({ ...form, prezzo: e.target.value }, 'prezzo')}
        error={errors.prezzo}
      />

      <div className="flex flex-col gap-3">
        <CheckboxRow
          checked={form.pagato}
          onChange={(pagato) =>
            update({ ...form, pagato, dataPagamento: pagato ? form.dataPagamento || todayIso : '' })
          }
        >
          Già pagato
        </CheckboxRow>
        {form.pagato && (
          <TextField
            id={fieldId('dataPagamento')}
            label="Data del pagamento"
            type="date"
            max={todayIso}
            value={form.dataPagamento}
            onChange={(e) => update({ ...form, dataPagamento: e.target.value }, 'dataPagamento')}
            error={errors.dataPagamento}
          />
        )}
      </div>

      <TextAreaField
        id={fieldId('note')}
        label="Note"
        value={form.note}
        onChange={(e) => update({ ...form, note: e.target.value })}
      />

      {saveError && (
        <p role="alert" className="font-semibold text-danger-700">
          Non sono riuscito a salvare. Riprova.
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Button type="submit" disabled={saving}>
          {submitLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Annulla
        </Button>
      </div>
    </form>
  )
}
