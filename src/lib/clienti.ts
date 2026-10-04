import { DISCIPLINE, type Cliente, type Disciplina, type NewCliente } from '../data/types'
import { toIsoDate } from './dates'
import { collapseSpaces, normalizeText } from './text'
import { normalizePhone } from './whatsapp'

export function fullName(cliente: Pick<Cliente, 'nome' | 'cognome'>): string {
  return `${cliente.nome} ${cliente.cognome}`
}

/** Same person, ignoring case, accents and extra spaces. */
export function nameKey(cliente: Pick<Cliente, 'nome' | 'cognome'>): string {
  return `${normalizeText(collapseSpaces(cliente.nome))}|${normalizeText(collapseSpaces(cliente.cognome))}`
}

/** Every word of the query must appear in nome or cognome ("ros mar" finds Mario Rossi). */
export function matchesQuery(cliente: Cliente, query: string): boolean {
  const haystack = normalizeText(fullName(cliente))
  return normalizeText(query)
    .split(/\s+/)
    .every((word) => haystack.includes(word))
}

export type FiltroDisciplina = Disciplina | 'tutti'

export function hasDisciplina(cliente: Cliente, filtro: FiltroDisciplina): boolean {
  return filtro === 'tutti' || cliente.discipline.includes(filtro)
}

/** How many clients each list tab would show. A client with two disciplines counts in both. */
export function countByDisciplina(clienti: Cliente[]): Record<FiltroDisciplina, number> {
  const counts = { tutti: clienti.length } as Record<FiltroDisciplina, number>
  for (const d of DISCIPLINE) counts[d] = clienti.filter((c) => c.discipline.includes(d)).length
  return counts
}

// --- Create / edit form ---------------------------------------------------

/** Personal data only: disciplines are set automatically (see disciplinaInUso). */
export type ClienteForm = {
  nome: string
  cognome: string
  telefono: string
  email: string
  dataNascita: string // YYYY-MM-DD from <input type="date">, or ''
  note: string
}

export type ClienteFormErrors = Partial<
  Record<'nome' | 'cognome' | 'telefono' | 'email' | 'dataNascita', string>
>

/** Cliente fields set by the form. Cleared fields are explicitly undefined so an update clears them. */
export type ClienteFormValue = Omit<NewCliente, 'archiviato' | 'discipline'>

export const EMPTY_CLIENTE_FORM: ClienteForm = {
  nome: '',
  cognome: '',
  telefono: '',
  email: '',
  dataNascita: '',
  note: '',
}

export function clienteToForm(cliente: Cliente): ClienteForm {
  return {
    nome: cliente.nome,
    cognome: cliente.cognome,
    telefono: cliente.telefono ?? '',
    email: cliente.email ?? '',
    dataNascita: cliente.dataNascita ?? '',
    note: cliente.note ?? '',
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidEmail(email: string): boolean {
  return EMAIL.test(email)
}

/** A YYYY-MM-DD date that is not in the future and not before 1900. */
export function isPlausiblePastDate(isoDate: string, today: Date): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(isoDate) && isoDate >= '1900-01-01' && isoDate <= toIsoDate(today)
}

export function validateClienteForm(
  form: ClienteForm,
  today: Date,
): { ok: true; value: ClienteFormValue } | { ok: false; errors: ClienteFormErrors } {
  const errors: ClienteFormErrors = {}
  const nome = collapseSpaces(form.nome)
  const cognome = collapseSpaces(form.cognome)
  const email = form.email.trim()
  const note = form.note.trim()

  if (!nome) errors.nome = 'Inserisci il nome'
  if (!cognome) errors.cognome = 'Inserisci il cognome'

  const telefono = form.telefono.trim() ? normalizePhone(form.telefono) : undefined
  if (telefono === null) errors.telefono = 'Numero non valido'

  if (email && !isValidEmail(email)) errors.email = 'Email non valida'

  if (form.dataNascita && !isPlausiblePastDate(form.dataNascita, today)) {
    errors.dataNascita = 'Data non valida'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      nome,
      cognome,
      telefono: telefono ?? undefined,
      email: email || undefined,
      dataNascita: form.dataNascita || undefined,
      note: note || undefined,
    },
  }
}
