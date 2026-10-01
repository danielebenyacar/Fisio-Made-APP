import { DISCIPLINE, type Disciplina } from '../data/types'
import { normalizeText } from './text'

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
