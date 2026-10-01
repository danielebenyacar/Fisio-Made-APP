import { describe, expect, it } from 'vitest'
import type { Corso } from '../data/types'
import { corsoToForm, EMPTY_CORSO_FORM, validateCorsoForm } from './corsi'

describe('validateCorsoForm', () => {
  it('builds a weekly class', () => {
    const result = validateCorsoForm({ ...EMPTY_CORSO_FORM, nome: ' Yoga  sera ', disciplina: 'yoga', giorno: 3 })
    expect(result).toEqual({
      ok: true,
      value: { nome: 'Yoga sera', disciplina: 'yoga', giorno: 3, ora: '18:30', durataMinuti: 60, attivo: true },
    })
  })

  it('reports every missing field', () => {
    const result = validateCorsoForm({ ...EMPTY_CORSO_FORM, ora: '9', durataMinuti: '0' })
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(['disciplina', 'durataMinuti', 'giorno', 'nome', 'ora'])
  })

  it('round-trips an existing class', () => {
    const corso: Corso = {
      id: 'c',
      nome: 'Posturale mattina',
      disciplina: 'posturale',
      giorno: 1,
      ora: '10:00',
      durataMinuti: 75,
      attivo: false,
      createdAt: '',
    }
    const result = validateCorsoForm(corsoToForm(corso))
    expect(result.ok && result.value).toEqual({
      nome: 'Posturale mattina',
      disciplina: 'posturale',
      giorno: 1,
      ora: '10:00',
      durataMinuti: 75,
      attivo: false,
    })
  })
})
