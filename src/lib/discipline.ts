import {
  DISCIPLINE,
  type Appuntamento,
  type Corso,
  type Disciplina,
  type Lezione,
  type Pacchetto,
} from '../data/types'
import { normalizeText } from './text'

/** Disciplines taught in weekly groups. Fisio is always individual. */
export const DISCIPLINE_GRUPPO: Disciplina[] = ['posturale', 'yoga']

export const DISCIPLINA_LABEL: Record<Disciplina, string> = {
  fisio: 'Fisio',
  posturale: 'Posturale',
  yoga: 'Yoga',
}

/** Words that identify a discipline in free text ("fisioterapia", "ginnastica posturale"). */
const KEYWORDS: Record<Disciplina, string> = {
  fisio: 'fisio',
  posturale: 'postur',
  yoga: 'yoga',
}

/** Removes duplicates and keeps the canonical order (fisio, posturale, yoga). */
export function sortDiscipline(values: Iterable<Disciplina>): Disciplina[] {
  const set = new Set(values)
  return DISCIPLINE.filter((d) => set.has(d))
}

export function toggleDisciplina(values: Disciplina[], disciplina: Disciplina): Disciplina[] {
  return values.includes(disciplina)
    ? values.filter((d) => d !== disciplina)
    : sortDiscipline([...values, disciplina])
}

/** Reads disciplines from free text, e.g. "Fisio + Posturale" or "fisioterapia; yoga". */
export function parseDiscipline(text: string): Disciplina[] {
  const normalized = normalizeText(text)
  return DISCIPLINE.filter((d) => normalized.includes(KEYWORDS[d]))
}

export type AttivitaCliente = {
  corsi: Corso[]
  appuntamenti: Appuntamento[]
  pacchetti: Pacchetto[]
  lezioni: Lezione[]
}

/**
 * Whether a client still does a discipline: enrolled in a group of it, or
 * with a (not cancelled) appointment, a package or a lesson of it.
 * Disciplines are set automatically from these, never picked by hand.
 */
export function disciplinaInUso(clienteId: string, disciplina: Disciplina, attivita: AttivitaCliente): boolean {
  return (
    attivita.corsi.some((c) => c.disciplina === disciplina && c.iscritti.includes(clienteId)) ||
    attivita.appuntamenti.some((a) => a.clienteId === clienteId && a.disciplina === disciplina && a.stato !== 'annullato') ||
    attivita.pacchetti.some((p) => p.clienteId === clienteId && p.disciplina === disciplina) ||
    attivita.lezioni.some((l) => l.clienteId === clienteId && l.disciplina === disciplina)
  )
}

/** All disciplines a client does according to groups, appointments, packages and lessons. */
export function disciplineInUso(clienteId: string, attivita: AttivitaCliente): Disciplina[] {
  return DISCIPLINE.filter((d) => disciplinaInUso(clienteId, d, attivita))
}
