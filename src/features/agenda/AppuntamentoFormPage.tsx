import { addDays } from 'date-fns'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useRepository } from '../../app/dataSource'
import { useGoBack } from '../../app/useGoBack'
import { BackButton } from '../../components/BackButton'
import { Button } from '../../components/Button'
import { CheckboxRow } from '../../components/CheckboxRow'
import { ClientePicker } from '../../components/ClientePicker'
import { DisciplinaPicker } from '../../components/DisciplinaPicker'
import { EmptyState } from '../../components/EmptyState'
import { TextAreaField, TextField } from '../../components/fields'
import { AlertIcon } from '../../components/icons'
import { PageTitle } from '../../components/PageTitle'
import type { Appuntamento, Cliente, Pacchetto } from '../../data'
import { dataOra } from '../../lib/agenda'
import {
  appuntamentoToForm,
  oraProposta,
  orario,
  sovrapposizioni,
  validateAppuntamentoForm,
  type AppuntamentoForm,
  type AppuntamentoFormErrors,
} from '../../lib/appuntamenti'
import { fullName } from '../../lib/clienti'
import { parseDateText, toIsoDate } from '../../lib/dates'
import { parseIsoDate } from '../../lib/packages'

type Dati = { clienti: Cliente[]; pacchetti: Pacchetto[]; appuntamento?: Appuntamento | null }

/** /agenda/appuntamenti/nuovo?giorno=&cliente= and /agenda/appuntamenti/:appId/modifica */
export function AppuntamentoFormPage() {
  const { appId } = useParams()
  const [params] = useSearchParams()
  const repository = useRepository()
  const goBack = useGoBack('/agenda')
  const [dati, setDati] = useState<Dati | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      repository.listClienti(),
      repository.listPacchetti(),
      appId ? repository.getAppuntamento(appId) : Promise.resolve(undefined),
    ]).then(([clienti, pacchetti, appuntamento]) => !cancelled && setDati({ clienti, pacchetti, appuntamento }))
    return () => {
      cancelled = true
    }
  }, [repository, appId])

  if (!dati) return null
  if (appId && !dati.appuntamento) {
    return (
      <>
        <BackButton label="Indietro" onClick={goBack} />
        <EmptyState>Appuntamento non trovato.</EmptyState>
      </>
    )
  }
  const giornoParam = params.get('giorno')
  return (
    <FormView
      dati={dati}
      appuntamento={dati.appuntamento ?? undefined}
      giorno={giornoParam && parseDateText(giornoParam) === giornoParam ? giornoParam : undefined}
      clienteId={params.get('cliente') ?? undefined}
      goBack={goBack}
    />
  )
}

type FormViewProps = {
  dati: Dati
  appuntamento?: Appuntamento
  giorno?: string
  clienteId?: string
  goBack: () => void
}

function FormView({ dati, appuntamento, giorno, clienteId, goBack }: FormViewProps) {
  const repository = useRepository()
  const ids = useId()
  const fieldId = (name: string) => `${ids}-${name}`
  const [now] = useState(() => new Date())
  const [form, setForm] = useState<AppuntamentoForm>(() => {
    if (appuntamento) return appuntamentoToForm(appuntamento)
    const day = giorno ?? toIsoDate(now)
    const cliente = dati.clienti.find((c) => c.id === clienteId)
    return {
      clienteId: cliente?.id ?? '',
      disciplina: 'fisio',
      giorno: day,
      ora: oraProposta(day, now),
      durataMinuti: '60',
      valutazione: cliente ? !dati.pacchetti.some((p) => p.clienteId === cliente.id && p.disciplina === 'fisio') : false,
      note: '',
    }
  })
  const [errors, setErrors] = useState<AppuntamentoFormErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [sameDay, setSameDay] = useState<Appuntamento[]>([])

  // Appointments of the chosen day, to warn about overlaps.
  useEffect(() => {
    if (parseDateText(form.giorno) !== form.giorno) return
    let cancelled = false
    const start = parseIsoDate(form.giorno)
    repository
      .listAppuntamenti({ da: start.toISOString(), a: addDays(start, 1).toISOString() })
      .then((list) => !cancelled && setSameDay(list))
    return () => {
      cancelled = true
    }
  }, [repository, form.giorno])

  const cliente = dati.clienti.find((c) => c.id === form.clienteId)
  const set = <K extends keyof AppuntamentoForm>(key: K, value: AppuntamentoForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const durata = Number(form.durataMinuti) || 60
  const validTime = /^\d{2}:\d{2}$/.test(form.ora) && parseDateText(form.giorno) === form.giorno
  const conflicts = validTime ? sovrapposizioni(dataOra(form.giorno, form.ora), durata, sameDay, appuntamento?.id) : []
  const nameOf = (id: string) => {
    const c = dati.clienti.find((x) => x.id === id)
    return c ? fullName(c) : 'un altro cliente'
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const result = validateAppuntamentoForm(form)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setSaving(true)
    try {
      if (appuntamento) {
        const { disciplina, inizio, durataMinuti, valutazione, note } = result.value
        await repository.updateAppuntamento(appuntamento.id, { disciplina, inizio, durataMinuti, valutazione, note })
      } else {
        await repository.createAppuntamento(result.value)
      }
      goBack()
    } catch {
      setSaving(false)
      setSaveError(true)
    }
  }

  return (
    <>
      <BackButton label="Annulla" onClick={goBack} />
      <PageTitle>{appuntamento ? 'Modifica appuntamento' : 'Nuovo appuntamento'}</PageTitle>

      <form noValidate onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
        <div>
          <p className="mb-1.5 font-semibold">Cliente *</p>
          {cliente ? (
            <div className="flex min-h-12 items-center gap-3 rounded-xl border border-brand-300 bg-white px-4 py-2">
              <span className="flex-1 text-lg font-semibold">{fullName(cliente)}</span>
              {!appuntamento && (
                <button type="button" onClick={() => set('clienteId', '')} className="min-h-12 px-2 font-semibold underline">
                  Cambia
                </button>
              )}
            </div>
          ) : (
            <ClientePicker
              clienti={dati.clienti}
              onSelect={(c) => {
                set('clienteId', c.id)
                // First fisio appointment of someone without fisio packages: the assessment.
                set('valutazione', !dati.pacchetti.some((p) => p.clienteId === c.id && p.disciplina === 'fisio'))
              }}
            />
          )}
          {errors.clienteId && <p className="mt-1.5 font-semibold text-danger-700">{errors.clienteId}</p>}
        </div>

        <div>
          <p id={fieldId('disciplina')} className="mb-1.5 font-semibold">
            Disciplina
          </p>
          <DisciplinaPicker value={form.disciplina} onChange={(d) => set('disciplina', d)} labelledBy={fieldId('disciplina')} />
        </div>

        <TextField
          id={fieldId('giorno')}
          label="Giorno *"
          type="date"
          value={form.giorno}
          onChange={(e) => set('giorno', e.target.value)}
          error={errors.giorno}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            id={fieldId('ora')}
            label="Ora *"
            type="time"
            step={900}
            value={form.ora}
            onChange={(e) => set('ora', e.target.value)}
            error={errors.ora}
          />
          <TextField
            id={fieldId('durata')}
            label="Durata (min)"
            inputMode="numeric"
            value={form.durataMinuti}
            onChange={(e) => set('durataMinuti', e.target.value)}
            error={errors.durataMinuti}
          />
        </div>

        {conflicts.length > 0 && (
          <p role="alert" className="flex gap-2 rounded-xl border border-warning-300 bg-warning-50 p-3 font-semibold text-warning-900">
            <AlertIcon className="mt-0.5 shrink-0" width={20} height={20} />
            <span>
              Si sovrappone a:{' '}
              {conflicts
                .map((c) => `${nameOf(c.clienteId)} (${orario(new Date(c.inizio), c.durataMinuti)})`)
                .join(', ')}
            </span>
          </p>
        )}

        <CheckboxRow checked={form.valutazione} onChange={(v) => set('valutazione', v)}>
          Valutazione posturale (prima seduta)
        </CheckboxRow>

        <TextAreaField id={fieldId('note')} label="Note" value={form.note} onChange={(e) => set('note', e.target.value)} />

        {saveError && (
          <p role="alert" className="font-semibold text-danger-700">
            Non sono riuscito a salvare. Riprova.
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Button type="submit" disabled={saving}>
            {appuntamento ? 'Salva modifiche' : 'Salva appuntamento'}
          </Button>
          <Button variant="secondary" onClick={goBack}>
            Annulla
          </Button>
        </div>
      </form>
    </>
  )
}
