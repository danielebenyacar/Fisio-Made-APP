import { useId, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useRepository } from '../../app/dataSource'
import { useGoBack } from '../../app/useGoBack'
import { BackButton } from '../../components/BackButton'
import { Button } from '../../components/Button'
import { CheckboxRow } from '../../components/CheckboxRow'
import { DisciplinaPicker } from '../../components/DisciplinaPicker'
import { EmptyState } from '../../components/EmptyState'
import { TextField } from '../../components/fields'
import { PageTitle } from '../../components/PageTitle'
import { SegmentedControl } from '../../components/SegmentedControl'
import type { ModalitaPacchetto, TipoPacchetto } from '../../data'
import {
  EMPTY_TIPO_FORM,
  MODALITA_LABEL,
  tipoToForm,
  validateTipoForm,
  type TipoForm,
  type TipoFormErrors,
} from '../../lib/listino'
import { useTipoPacchetto } from './usePacchetti'

/** /altro/listino/nuovo and /altro/listino/:tipoId */
export function TipoPacchettoFormPage() {
  const { tipoId } = useParams()
  const { tipo, error } = useTipoPacchetto(tipoId)
  const goBack = useGoBack('/altro/listino')

  if (!tipoId) return <TipoPacchettoForm goBack={goBack} />
  if (error) return <EmptyState>Non riesco a caricare i prezzi. Riprova tra poco.</EmptyState>
  if (tipo === undefined) return null
  if (tipo === null) {
    return (
      <>
        <BackButton label="Prezzi" onClick={goBack} />
        <EmptyState>Pacchetto non trovato.</EmptyState>
      </>
    )
  }
  return <TipoPacchettoForm key={tipo.id} tipo={tipo} goBack={goBack} />
}

const MODALITA_OPTIONS = (['sedute', 'abbonamento'] as ModalitaPacchetto[]).map((value) => ({
  value,
  label: MODALITA_LABEL[value],
}))

function TipoPacchettoForm({ tipo, goBack }: { tipo?: TipoPacchetto; goBack: () => void }) {
  const repository = useRepository()
  const ids = useId()
  const fieldId = (name: string) => `${ids}-${name}`
  const [form, setForm] = useState<TipoForm>(() => (tipo ? tipoToForm(tipo) : EMPTY_TIPO_FORM))
  const [errors, setErrors] = useState<TipoFormErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  const set = <K extends keyof TipoForm>(key: K, value: TipoForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const result = validateTipoForm(form)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setSaving(true)
    try {
      if (tipo) await repository.updateTipoPacchetto(tipo.id, result.value)
      else await repository.createTipoPacchetto(result.value)
      goBack()
    } catch {
      setSaving(false)
      setSaveError(true)
    }
  }

  return (
    <>
      <BackButton label="Annulla" onClick={goBack} />
      <PageTitle>{tipo ? tipo.nome : 'Nuova voce'}</PageTitle>

      <form noValidate onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
        <TextField
          id={fieldId('nome')}
          label="Nome *"
          value={form.nome}
          onChange={(e) => set('nome', e.target.value)}
          error={errors.nome}
          placeholder="Es. 10 sedute fisio"
          autoComplete="off"
        />

        <TextField
          id={fieldId('prezzo')}
          label="Prezzo in €"
          inputMode="decimal"
          value={form.prezzo}
          onChange={(e) => set('prezzo', e.target.value)}
          error={errors.prezzo}
          placeholder="Es. 60"
        />

        <div>
          <p id={fieldId('disciplina')} className="mb-1.5 font-semibold">
            Disciplina *
          </p>
          <DisciplinaPicker
            value={form.disciplina}
            onChange={(d) => set('disciplina', d)}
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
            onChange={(m) => set('modalita', m)}
            labelledBy={fieldId('modalita')}
          />
          <p className="mt-1.5 text-brand-600">
            {form.modalita === 'sedute'
              ? 'Un numero di sedute pagate in anticipo, da usare quando servono.'
              : 'Vale per un periodo e dà diritto a 1 lezione a settimana: la settimana saltata è persa.'}
          </p>
        </div>

        {form.modalita === 'sedute' ? (
          <>
            <TextField
              id={fieldId('lezioni')}
              label="Numero di sedute *"
              inputMode="numeric"
              value={form.lezioni}
              onChange={(e) => set('lezioni', e.target.value)}
              error={errors.lezioni}
            />
            <TextField
              id={fieldId('durataMesi')}
              label="Validità in mesi (facoltativa)"
              inputMode="numeric"
              value={form.durataMesi}
              onChange={(e) => set('durataMesi', e.target.value)}
              error={errors.durataMesi}
              placeholder="Vuoto = non scade"
            />
          </>
        ) : (
          <TextField
            id={fieldId('durataMesi')}
            label="Durata in mesi *"
            inputMode="numeric"
            value={form.durataMesi}
            onChange={(e) => set('durataMesi', e.target.value)}
            error={errors.durataMesi}
            placeholder="Es. 1 = mensile, 3 = trimestrale"
          />
        )}

        <CheckboxRow checked={form.attivo} onChange={(attivo) => set('attivo', attivo)}>
          In vendita (compare quando assegni un pacchetto)
        </CheckboxRow>

        {saveError && (
          <p role="alert" className="font-semibold text-danger-700">
            Non sono riuscito a salvare. Riprova.
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Button type="submit" disabled={saving}>
            Salva
          </Button>
          <Button variant="secondary" onClick={goBack}>
            Annulla
          </Button>
        </div>
      </form>
    </>
  )
}
