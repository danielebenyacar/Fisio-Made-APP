import type { Corso, Disciplina, NewCorso } from '../data/types'
import { parseIntIn } from './listino'
import { collapseSpaces } from './text'

export type CorsoForm = {
  nome: string
  disciplina: Disciplina | ''
  giorno: number // 1–7, 0 = not chosen
  ora: string
  durataMinuti: string
  attivo: boolean
}

export type CorsoFormErrors = Partial<Record<'nome' | 'disciplina' | 'giorno' | 'ora' | 'durataMinuti', string>>

export const EMPTY_CORSO_FORM: CorsoForm = {
  nome: '',
  disciplina: '',
  giorno: 0,
  ora: '18:30',
  durataMinuti: '60',
  attivo: true,
}

export function corsoToForm(corso: Corso): CorsoForm {
  return {
    nome: corso.nome,
    disciplina: corso.disciplina,
    giorno: corso.giorno,
    ora: corso.ora,
    durataMinuti: String(corso.durataMinuti),
    attivo: corso.attivo,
  }
}

/** Class fields set by the form; enrolled clients are managed separately. */
export type CorsoFormValue = Omit<NewCorso, 'iscritti'>

export function validateCorsoForm(
  form: CorsoForm,
): { ok: true; value: CorsoFormValue } | { ok: false; errors: CorsoFormErrors } {
  const errors: CorsoFormErrors = {}
  const nome = collapseSpaces(form.nome)
  if (!nome) errors.nome = 'Inserisci il nome'
  if (!form.disciplina) errors.disciplina = 'Scegli la disciplina'
  if (form.giorno < 1 || form.giorno > 7) errors.giorno = 'Scegli il giorno'
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(form.ora)) errors.ora = 'Orario non valido'
  const durata = parseIntIn(form.durataMinuti, 15, 240)
  if (durata === null) errors.durataMinuti = 'Durata in minuti, da 15 a 240'
  if (Object.keys(errors).length > 0 || !form.disciplina || durata === null) return { ok: false, errors }
  return {
    ok: true,
    value: { nome, disciplina: form.disciplina, giorno: form.giorno, ora: form.ora, durataMinuti: durata, attivo: form.attivo },
  }
}
