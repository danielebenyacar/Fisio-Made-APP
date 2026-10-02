import { describe, expect, it } from 'vitest'
import type { Appuntamento, Corso, Lezione, Pacchetto } from '../data/types'
import {
  disciplinaInUso,
  disciplineInUso,
  parseDiscipline,
  sortDiscipline,
  toggleDisciplina,
  type AttivitaCliente,
} from './discipline'

describe('sortDiscipline', () => {
  it('dedupes and keeps the canonical order', () => {
    expect(sortDiscipline(['yoga', 'fisio', 'yoga'])).toEqual(['fisio', 'yoga'])
  })
})

describe('toggleDisciplina', () => {
  it('adds a missing discipline in canonical order', () => {
    expect(toggleDisciplina(['yoga'], 'fisio')).toEqual(['fisio', 'yoga'])
  })

  it('removes a present discipline', () => {
    expect(toggleDisciplina(['fisio', 'posturale'], 'fisio')).toEqual(['posturale'])
  })
})

describe('parseDiscipline', () => {
  it.each([
    ['Fisio', ['fisio']],
    ['Posturale, Yoga', ['posturale', 'yoga']],
    ['Fisio + Posturale', ['fisio', 'posturale']],
    ['YOGA; fisioterapia', ['fisio', 'yoga']],
    ['ginnastica posturale', ['posturale']],
    ['Fisio, Posturale, Yoga', ['fisio', 'posturale', 'yoga']],
    ['pilates', []],
    ['', []],
  ])('%j → %j', (text, expected) => {
    expect(parseDiscipline(text)).toEqual(expected)
  })
})

describe('disciplines from what the client does', () => {
  const nessuna: AttivitaCliente = { corsi: [], appuntamenti: [], pacchetti: [], lezioni: [] }
  const corso = { id: 'k', disciplina: 'yoga', iscritti: ['c1'] } as Corso
  const appuntamento = (stato: Appuntamento['stato']) =>
    ({ id: 'a', clienteId: 'c1', disciplina: 'fisio', stato }) as Appuntamento
  const pacchetto = { id: 'p', clienteId: 'c1', disciplina: 'posturale' } as Pacchetto
  const lezione = { id: 'l', clienteId: 'c1', disciplina: 'posturale' } as Lezione

  it('comes from the fixed group', () => {
    expect(disciplineInUso('c1', { ...nessuna, corsi: [corso] })).toEqual(['yoga'])
    expect(disciplineInUso('c2', { ...nessuna, corsi: [corso] })).toEqual([])
  })

  it('comes from a booked fisio session, unless cancelled', () => {
    expect(disciplineInUso('c1', { ...nessuna, appuntamenti: [appuntamento('programmato')] })).toEqual(['fisio'])
    expect(disciplineInUso('c1', { ...nessuna, appuntamenti: [appuntamento('annullato')] })).toEqual([])
  })

  it('comes from packages and past lessons', () => {
    expect(disciplinaInUso('c1', 'posturale', { ...nessuna, pacchetti: [pacchetto] })).toBe(true)
    expect(disciplinaInUso('c1', 'posturale', { ...nessuna, lezioni: [lezione] })).toBe(true)
  })

  it('combines everything in the canonical order', () => {
    expect(
      disciplineInUso('c1', { corsi: [corso], appuntamenti: [appuntamento('fatto')], pacchetti: [pacchetto], lezioni: [] }),
    ).toEqual(['fisio', 'posturale', 'yoga'])
  })
})
