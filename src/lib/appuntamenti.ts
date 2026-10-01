import { addHours, addMinutes, isSameDay, startOfHour } from 'date-fns'
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

/** Other non-cancelled appointments overlapping [inizio, inizio + durata). */
export function sovrapposizioni(
  inizio: Date,
  durataMinuti: number,
  appuntamenti: Appuntamento[],
  ignoraId?: string,
): Appuntamento[] {
  const start = inizio.getTime()
  const end = addMinutes(inizio, durataMinuti).getTime()
  return appuntamenti.filter((a) => {
    if (a.id === ignoraId || a.stato === 'annullato') return false
    const aStart = new Date(a.inizio).getTime()
    const aEnd = addMinutes(new Date(a.inizio), a.durataMinuti).getTime()
    return aStart < end && start < aEnd
  })
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

/** Default start: next full hour if the day is today, otherwise 09:00. */
export function oraProposta(giorno: string, now: Date): string {
  if (giorno !== toIsoDate(now)) return '09:00'
  const next = startOfHour(addHours(now, 1))
  return isSameDay(next, now) ? oraDi(next) : '20:00'
}

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
  const time = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(form.ora)
  if (!time) errors.ora = 'Orario non valido'
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
