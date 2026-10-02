import { useEffect, useId, useState, type FormEvent } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useRepository } from '../../app/dataSource'
import { useGoBack } from '../../app/useGoBack'
import { BackButton } from '../../components/BackButton'
import { Button } from '../../components/Button'
import { CheckboxRow } from '../../components/CheckboxRow'
import { ClientePicker } from '../../components/ClientePicker'
import { EmptyState } from '../../components/EmptyState'
import { NotaField } from '../../components/CampoFacoltativo'
import { TextField } from '../../components/fields'
import { PageTitle } from '../../components/PageTitle'
import type { Appuntamento, Cliente, Pacchetto } from '../../data'
import {
  appuntamentoToForm,
  validateAppuntamentoForm,
  type AppuntamentoForm,
  type AppuntamentoFormErrors,
} from '../../lib/appuntamenti'
import { fullName } from '../../lib/clienti'
import { parseDateText, toIsoDate } from '../../lib/dates'
import { useDisciplineAutomatiche } from '../clienti/useDisciplineAutomatiche'
import { ScegliOrario } from './ScegliOrario'

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
  const { aggiungi } = useDisciplineAutomatiche()
  const durataId = useId()
  const [now] = useState(() => new Date())
  const [form, setForm] = useState<AppuntamentoForm>(() => {
    if (appuntamento) return appuntamentoToForm(appuntamento)
    const cliente = dati.clienti.find((c) => c.id === clienteId)
    return {
      clienteId: cliente?.id ?? '',
      // Individual sessions are fisio; groups are booked in Altro → Corsi.
      disciplina: 'fisio',
      giorno: giorno && giorno >= toIsoDate(now) ? giorno : toIsoDate(now),
      ora: '',
      durataMinuti: '60',
      valutazione: cliente ? primaVolta(cliente.id) : false,
      note: '',
    }
  })
  const [errors, setErrors] = useState<AppuntamentoFormErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  /** No fisio package yet: the first session is the postural assessment. */
  function primaVolta(id: string) {
    return !dati.pacchetti.some((p) => p.clienteId === id && p.disciplina === 'fisio')
  }

  const cliente = dati.clienti.find((c) => c.id === form.clienteId)
  const set = <K extends keyof AppuntamentoForm>(key: K, value: AppuntamentoForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
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
        const { inizio, durataMinuti, valutazione, note } = result.value
        await repository.updateAppuntamento(appuntamento.id, { inizio, durataMinuti, valutazione, note })
      } else {
        await repository.createAppuntamento(result.value)
      }
      // A booked fisio session makes the client a fisio client.
      await aggiungi(result.value.clienteId, result.value.disciplina)
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
                set('valutazione', primaVolta(c.id))
              }}
            />
          )}
          {errors.clienteId && <p className="mt-1.5 font-semibold text-danger-700">{errors.clienteId}</p>}
        </div>

        <div>
          <p className="mb-1.5 font-semibold">Quando *</p>
          <ScegliOrario
            giorno={form.giorno}
            ora={form.ora}
            durataMinuti={Number(form.durataMinuti) || 60}
            now={now}
            ignoraAppuntamentoId={appuntamento?.id}
            onChange={(g, o) => {
              setForm((f) => ({ ...f, giorno: g, ora: o }))
              setErrors((e) => ({ ...e, giorno: undefined, ora: undefined }))
            }}
            error={errors.ora ?? errors.giorno}
            extraManuale={
              <TextField
                id={durataId}
                label="Durata (min)"
                inputMode="numeric"
                value={form.durataMinuti}
                onChange={(e) => set('durataMinuti', e.target.value)}
                error={errors.durataMinuti}
              />
            }
          />
        </div>

        <CheckboxRow checked={form.valutazione} onChange={(v) => set('valutazione', v)}>
          Valutazione posturale (prima seduta)
        </CheckboxRow>

        <NotaField value={form.note} onChange={(note) => set('note', note)} />

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
