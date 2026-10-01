import { describe, expect, it } from 'vitest'
import { parseDiscipline, sortDiscipline, toggleDisciplina } from './discipline'

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
