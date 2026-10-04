import { useId, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRepository } from '../../app/dataSource'
import { useGoBack } from '../../app/useGoBack'
import { BackButton } from '../../components/BackButton'
import { Button } from '../../components/Button'
import { AggiungiButton, NotaField } from '../../components/CampoFacoltativo'
import { CheckboxRow } from '../../components/CheckboxRow'
import { EmptyState } from '../../components/EmptyState'
import { TextField } from '../../components/fields'
import { focusSoon } from '../../components/focusSoon'
import { CalendarIcon } from '../../components/icons'
import { PageTitle } from '../../components/PageTitle'
import type { Cliente } from '../../data'
import { dataOra } from '../../lib/agenda'
import {
  clienteToForm,
  EMPTY_CLIENTE_FORM,
  validateClienteForm,
  type ClienteForm,
  type ClienteFormErrors,
} from '../../lib/clienti'
import { toIsoDate } from '../../lib/dates'
import { ScegliOrario } from '../agenda/ScegliOrario'
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
const FIELD_ORDER: (keyof ClienteFormErrors)[] = ['nome', 'cognome', 'telefono', 'dataNascita', 'email']

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
  // Secondary fields stay hidden until asked for (or already filled).
  const [showEmail, setShowEmail] = useState(form.email !== '')
  // New client only: book the first appointment right away, seeing when there is time.
  const [primo, setPrimo] = useState<{ giorno: string; ora: string; valutazione: boolean } | null>(null)
  const conAppuntamento = primo !== null && /^\d{2}:\d{2}$/.test(primo.ora)

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
      if (first === 'email') setShowEmail(true)
      if (first) focusSoon(fieldId(first))
      return
    }
    setSaving(true)
    try {
      if (cliente) {
        await repository.updateCliente(cliente.id, result.value)
        goBack()
      } else {
        // Disciplines come from groups, sessions and packages: a booked session makes it fisio.
        const created = await repository.createCliente({ ...result.value, discipline: conAppuntamento ? ['fisio'] : [] })
        if (primo && conAppuntamento) {
          await repository.createAppuntamento({
            clienteId: created.id,
            disciplina: 'fisio',
            inizio: dataOra(primo.giorno, primo.ora).toISOString(),
            durataMinuti: 60,
            valutazione: primo.valutazione,
          })
        }
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
          id={fieldId('dataNascita')}
          label="Data di nascita"
          type="date"
          max={todayIso}
          value={form.dataNascita}
          onChange={(e) => set('dataNascita', e.target.value)}
          error={errors.dataNascita}
        />

        <div className="flex flex-col gap-2">
          {showEmail ? (
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
          ) : (
            <AggiungiButton
              onClick={() => {
                setShowEmail(true)
                focusSoon(fieldId('email'))
              }}
            >
              Aggiungi email
            </AggiungiButton>
          )}
          <NotaField value={form.note} onChange={(note) => set('note', note)} />
        </div>

        {!cliente &&
          (primo ? (
            <section aria-labelledby={fieldId('primo')} className="rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-200">
              <div className="flex items-center justify-between gap-2">
                <h2 id={fieldId('primo')} className="text-lg font-bold">
                  Primo appuntamento
                </h2>
                <button
                  type="button"
                  onClick={() => setPrimo(null)}
                  className="min-h-12 px-1 font-semibold text-brand-700 underline"
                >
                  Non ora
                </button>
              </div>
              <p className="mb-3 text-brand-600">Seduta fisio di 1 ora. Tocca un orario libero.</p>
              <ScegliOrario
                giorno={primo.giorno}
                ora={primo.ora}
                durataMinuti={60}
                now={today}
                onChange={(giorno, ora) => setPrimo((p) => p && { ...p, giorno, ora })}
              />
              <div className="mt-3">
                <CheckboxRow checked={primo.valutazione} onChange={(valutazione) => setPrimo((p) => p && { ...p, valutazione })}>
                  Valutazione posturale (prima seduta)
                </CheckboxRow>
              </div>
            </section>
          ) : (
            <Button variant="secondary" onClick={() => setPrimo({ giorno: todayIso, ora: '', valutazione: true })}>
              <CalendarIcon width={20} height={20} />
              Fissa il primo appuntamento
            </Button>
          ))}

        {saveError && (
          <p role="alert" className="font-semibold text-danger-700">
            Non sono riuscito a salvare. Riprova.
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Button type="submit" disabled={saving}>
            {cliente ? 'Salva modifiche' : conAppuntamento ? 'Salva cliente e appuntamento' : 'Salva cliente'}
          </Button>
          <Button variant="secondary" onClick={goBack}>
            Annulla
          </Button>
        </div>
      </form>
    </>
  )
}
