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
import type { Corso } from '../../data'
import { GIORNI } from '../../lib/agenda'
import { corsoToForm, EMPTY_CORSO_FORM, validateCorsoForm, type CorsoForm, type CorsoFormErrors } from '../../lib/corsi'
import { useCorsi } from './useCorsi'

/** /altro/corsi/nuovo and /altro/corsi/:corsoId */
export function CorsoFormPage() {
  const { corsoId } = useParams()
  const { corsi, error } = useCorsi()
  const goBack = useGoBack('/altro/corsi')

  if (!corsoId) return <CorsoFormView goBack={goBack} />
  if (error) return <EmptyState>Non riesco a caricare il corso. Riprova tra poco.</EmptyState>
  if (!corsi) return null
  const corso = corsi.find((c) => c.id === corsoId)
  if (!corso) {
    return (
      <>
        <BackButton label="Corsi" onClick={goBack} />
        <EmptyState>Corso non trovato.</EmptyState>
      </>
    )
  }
  return <CorsoFormView key={corso.id} corso={corso} goBack={goBack} />
}

function CorsoFormView({ corso, goBack }: { corso?: Corso; goBack: () => void }) {
  const repository = useRepository()
  const ids = useId()
  const fieldId = (name: string) => `${ids}-${name}`
  const [form, setForm] = useState<CorsoForm>(() => (corso ? corsoToForm(corso) : EMPTY_CORSO_FORM))
  const [errors, setErrors] = useState<CorsoFormErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  const set = <K extends keyof CorsoForm>(key: K, value: CorsoForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const result = validateCorsoForm(form)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setSaving(true)
    try {
      if (corso) await repository.updateCorso(corso.id, result.value)
      else await repository.createCorso(result.value)
      goBack()
    } catch {
      setSaving(false)
      setSaveError(true)
    }
  }

  return (
    <>
      <BackButton label="Annulla" onClick={goBack} />
      <PageTitle>{corso ? 'Modifica corso' : 'Nuovo corso'}</PageTitle>

      <form noValidate onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
        <TextField
          id={fieldId('nome')}
          label="Nome *"
          value={form.nome}
          onChange={(e) => set('nome', e.target.value)}
          error={errors.nome}
          placeholder="Es. Yoga sera"
          autoComplete="off"
        />
        <div>
          <p id={fieldId('disciplina')} className="mb-1.5 font-semibold">
            Disciplina *
          </p>
          <DisciplinaPicker value={form.disciplina} onChange={(d) => set('disciplina', d)} labelledBy={fieldId('disciplina')} />
          {errors.disciplina && <p className="mt-1.5 font-semibold text-danger-700">{errors.disciplina}</p>}
        </div>
        <div>
          <p id={fieldId('giorno')} className="mb-1.5 font-semibold">
            Giorno *
          </p>
          <div role="radiogroup" aria-labelledby={fieldId('giorno')} className="grid grid-cols-4 gap-2">
            {GIORNI.map((nome, i) => (
              <button
                key={nome}
                type="button"
                role="radio"
                aria-checked={form.giorno === i + 1}
                aria-label={nome}
                onClick={() => set('giorno', i + 1)}
                className={`min-h-12 rounded-xl border-2 font-semibold first-letter:uppercase ${
                  form.giorno === i + 1 ? 'border-brand-800 bg-brand-800 text-white' : 'border-brand-300 bg-white'
                }`}
              >
                {nome.slice(0, 3)}
              </button>
            ))}
          </div>
          {errors.giorno && <p className="mt-1.5 font-semibold text-danger-700">{errors.giorno}</p>}
        </div>
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
        <CheckboxRow checked={form.attivo} onChange={(v) => set('attivo', v)}>
          Attivo (compare in agenda)
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
