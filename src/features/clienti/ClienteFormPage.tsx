import { useId, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRepository } from '../../app/dataSource'
import { useGoBack } from '../../app/useGoBack'
import { BackButton } from '../../components/BackButton'
import { Button } from '../../components/Button'
import { CheckboxRow } from '../../components/CheckboxRow'
import { DisciplinaToggle } from '../../components/DisciplinaToggle'
import { EmptyState } from '../../components/EmptyState'
import { TextAreaField, TextField } from '../../components/fields'
import { PageTitle } from '../../components/PageTitle'
import type { Cliente } from '../../data'
import {
  clienteToForm,
  EMPTY_CLIENTE_FORM,
  validateClienteForm,
  type ClienteForm,
  type ClienteFormErrors,
} from '../../lib/clienti'
import { toIsoDate } from '../../lib/dates'
import { useCliente } from './useClienti'

/** /clienti/nuovo and /clienti/:id/modifica */
export function ClienteFormPage() {
  const { id } = useParams()
  const { cliente, error } = useCliente(id)
  const goBack = useGoBack(id ? `/clienti/${id}` : '/clienti')

  if (!id) return <ClienteFormView goBack={goBack} />
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
  return <ClienteFormView key={cliente.id} cliente={cliente} goBack={goBack} />
}

// Order in which the first invalid field gets focus.
const FIELD_ORDER: (keyof ClienteFormErrors)[] = [
  'nome',
  'cognome',
  'telefono',
  'email',
  'dataNascita',
  'consensoData',
]

function ClienteFormView({ cliente, goBack }: { cliente?: Cliente; goBack: () => void }) {
  const repository = useRepository()
  const navigate = useNavigate()
  const ids = useId()
  const fieldId = (name: string) => `${ids}-${name}`
  const [today] = useState(() => new Date())
  const [form, setForm] = useState<ClienteForm>(() =>
    cliente ? clienteToForm(cliente) : EMPTY_CLIENTE_FORM,
  )
  const [errors, setErrors] = useState<ClienteFormErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  const set = <K extends keyof ClienteForm>(key: K, value: ClienteForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const result = validateClienteForm(form, today)
    if (!result.ok) {
      setErrors(result.errors)
      const first = FIELD_ORDER.find((f) => result.errors[f])
      if (first) document.getElementById(fieldId(first))?.focus()
      return
    }
    setSaving(true)
    try {
      if (cliente) {
        await repository.updateCliente(cliente.id, result.value)
        goBack()
      } else {
        const created = await repository.createCliente(result.value)
        navigate(`/clienti/${created.id}`, { replace: true })
      }
    } catch {
      setSaving(false)
      setSaveError(true)
    }
  }

  const todayIso = toIsoDate(today)

  return (
    <>
      <BackButton label="Annulla" onClick={goBack} />
      <PageTitle>{cliente ? 'Modifica cliente' : 'Nuovo cliente'}</PageTitle>

      <form noValidate onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
        <TextField
          id={fieldId('nome')}
          label="Nome *"
          value={form.nome}
          onChange={(e) => set('nome', e.target.value)}
          error={errors.nome}
          autoCapitalize="words"
          autoComplete="off"
        />
        <TextField
          id={fieldId('cognome')}
          label="Cognome *"
          value={form.cognome}
          onChange={(e) => set('cognome', e.target.value)}
          error={errors.cognome}
          autoCapitalize="words"
          autoComplete="off"
        />

        <div>
          <p id={fieldId('discipline')} className="mb-1.5 font-semibold">
            Discipline
          </p>
          <DisciplinaToggle
            value={form.discipline}
            onChange={(discipline) => set('discipline', discipline)}
            labelledBy={fieldId('discipline')}
          />
          <p className="mt-1.5 text-brand-600">Puoi sceglierne anche più di una.</p>
        </div>

        <TextField
          id={fieldId('telefono')}
          label="Telefono"
          type="tel"
          inputMode="tel"
          value={form.telefono}
          onChange={(e) => set('telefono', e.target.value)}
          error={errors.telefono}
          placeholder="333 123 4567"
          autoComplete="off"
        />
        <TextField
          id={fieldId('email')}
          label="Email"
          type="email"
          inputMode="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          error={errors.email}
          autoCapitalize="off"
          autoComplete="off"
        />
        <TextField
          id={fieldId('dataNascita')}
          label="Data di nascita"
          type="date"
          max={todayIso}
          value={form.dataNascita}
          onChange={(e) => set('dataNascita', e.target.value)}
          error={errors.dataNascita}
        />
        <TextAreaField
          id={fieldId('note')}
          label="Note"
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
        />

        <div className="flex flex-col gap-3">
          <CheckboxRow
            checked={form.consensoPrivacy}
            onChange={(checked) => {
              set('consensoPrivacy', checked)
              if (checked && !form.consensoData) set('consensoData', todayIso)
            }}
          >
            Consenso privacy firmato
          </CheckboxRow>
          {form.consensoPrivacy && (
            <TextField
              id={fieldId('consensoData')}
              label="Data del consenso"
              type="date"
              max={todayIso}
              value={form.consensoData}
              onChange={(e) => set('consensoData', e.target.value)}
              error={errors.consensoData}
            />
          )}
        </div>

        {saveError && (
          <p role="alert" className="font-semibold text-danger-700">
            Non sono riuscito a salvare. Riprova.
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Button type="submit" disabled={saving}>
            {cliente ? 'Salva modifiche' : 'Salva cliente'}
          </Button>
          <Button variant="secondary" onClick={goBack}>
            Annulla
          </Button>
        </div>
      </form>
    </>
  )
}
