import { addMinutes } from 'date-fns'
import type { Appuntamento, Disciplina, NewAppuntamento } from '../data/types'
import { daSegnare, dataOra, oraDi } from './agenda'
import { toIsoDate } from './dates'
import { parseIntIn } from './listino'
import type { Etichetta } from './pacchettoLabel'

/** Status chip of an appointment, or null while simply scheduled. */
export function statoAppuntamentoLabel(app: Appuntamento, now: Date): Etichetta | null {
  if (daSegnare(app, now)) return { testo: 'Da segnare', tono: 'avviso' }
  switch (app.stato) {
    case 'fatto':
      return { testo: app.valutazione ? 'Valutazione fatta' : 'Seduta fatta', tono: 'ok' }
    case 'assente':
      return { testo: 'Assente', tono: 'neutro' }
    case 'annullato':
      return { testo: 'Annullato', tono: 'neutro' }
    default:
      return null
  }
}

/** "10:00–11:00". */
export function orario(inizio: Date, durataMinuti: number): string {
  return `${oraDi(inizio)}–${oraDi(addMinutes(inizio, durataMinuti))}`
}

export type AppuntamentoForm = {
  clienteId: string
  disciplina: Disciplina | ''
  giorno: string // YYYY-MM-DD
  ora: string // HH:mm
  durataMinuti: string
  valutazione: boolean
  note: string
}

export type AppuntamentoFormErrors = Partial<Record<'clienteId' | 'disciplina' | 'giorno' | 'ora' | 'durataMinuti', string>>

export function appuntamentoToForm(app: Appuntamento): AppuntamentoForm {
  const inizio = new Date(app.inizio)
  return {
    clienteId: app.clienteId,
    disciplina: app.disciplina,
    giorno: toIsoDate(inizio),
    ora: oraDi(inizio),
    durataMinuti: String(app.durataMinuti),
    valutazione: app.valutazione,
    note: app.note ?? '',
  }
}

export function validateAppuntamentoForm(
  form: AppuntamentoForm,
): { ok: true; value: NewAppuntamento } | { ok: false; errors: AppuntamentoFormErrors } {
  const errors: AppuntamentoFormErrors = {}
  if (!form.clienteId) errors.clienteId = 'Scegli il cliente'
  if (!form.disciplina) errors.disciplina = 'Scegli la disciplina'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.giorno)) errors.giorno = 'Data non valida'
  if (!form.ora) errors.ora = 'Scegli un orario'
  else if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(form.ora)) errors.ora = 'Orario non valido'
  const durata = parseIntIn(form.durataMinuti, 15, 240)
  if (durata === null) errors.durataMinuti = 'Durata in minuti, da 15 a 240'

  if (Object.keys(errors).length > 0 || !form.disciplina || durata === null) return { ok: false, errors }
  return {
    ok: true,
    value: {
      clienteId: form.clienteId,
      disciplina: form.disciplina,
      inizio: dataOra(form.giorno, form.ora).toISOString(),
      durataMinuti: durata,
      valutazione: form.valutazione,
      note: form.note.trim() || undefined,
    },
  }
}
