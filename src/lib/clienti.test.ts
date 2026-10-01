import { describe, expect, it } from 'vitest'
import type { Cliente } from '../data/types'
import {
  clienteToForm,
  countByDisciplina,
  EMPTY_CLIENTE_FORM,
  hasDisciplina,
  matchesQuery,
  nameKey,
  validateClienteForm,
  type ClienteForm,
} from './clienti'

const TODAY = new Date(2026, 9, 1, 10, 0)

const cliente = (overrides: Partial<Cliente>): Cliente => ({
  id: 'c1',
  nome: 'Mario',
  cognome: 'Rossi',
  discipline: [],
  consensoPrivacy: true,
  archiviato: false,
  createdAt: '2026-01-01T10:00:00.000Z',
  ...overrides,
})

describe('matchesQuery', () => {
  const nicolo = cliente({ nome: 'Nicolò', cognome: 'De Luca' })

  it.each(['', 'nic', 'NICOLO', 'de lu', 'luca nicolò', '  de   luca '])('finds %j', (q) => {
    expect(matchesQuery(nicolo, q)).toBe(true)
  })

  it.each(['rossi', 'nicola', 'de x'])('does not find %j', (q) => {
    expect(matchesQuery(nicolo, q)).toBe(false)
  })
})

describe('nameKey', () => {
  it('ignores case, accents and spaces', () => {
    expect(nameKey({ nome: ' NICOLÒ ', cognome: 'de  luca' })).toBe(
      nameKey({ nome: 'Nicolo', cognome: 'De Luca' }),
    )
  })
})

describe('discipline filters', () => {
  const clienti = [
    cliente({ id: '1', discipline: ['fisio'] }),
    cliente({ id: '2', discipline: ['fisio', 'yoga'] }),
    cliente({ id: '3', discipline: [] }),
  ]

  it('"tutti" matches everyone, a discipline only who has it', () => {
    expect(clienti.filter((c) => hasDisciplina(c, 'tutti'))).toHaveLength(3)
    expect(clienti.filter((c) => hasDisciplina(c, 'yoga')).map((c) => c.id)).toEqual(['2'])
  })

  it('counts multi-discipline clients in every tab', () => {
    expect(countByDisciplina(clienti)).toEqual({ tutti: 3, fisio: 2, posturale: 0, yoga: 1 })
  })
})

describe('validateClienteForm', () => {
  const form = (overrides: Partial<ClienteForm>): ClienteForm => ({
    ...EMPTY_CLIENTE_FORM,
    nome: 'Maria',
    cognome: 'Rossi',
    ...overrides,
  })

  it('requires nome and cognome', () => {
    const result = validateClienteForm(form({ nome: ' ', cognome: '' }), TODAY)
    expect(result).toEqual({
      ok: false,
      errors: { nome: 'Inserisci il nome', cognome: 'Inserisci il cognome' },
    })
  })

  it('cleans up values and normalizes the phone', () => {
    const result = validateClienteForm(
      form({
        nome: '  Maria  Grazia ',
        telefono: '333 123 4567',
        email: ' maria@example.com ',
        note: '  ',
      }),
      TODAY,
    )
    expect(result).toEqual({
      ok: true,
      value: {
        nome: 'Maria Grazia',
        cognome: 'Rossi',
        telefono: '+393331234567',
        email: 'maria@example.com',
        dataNascita: undefined,
        note: undefined,
        consensoPrivacy: false,
        consensoData: undefined,
      },
    })
  })

  it('rejects invalid phone, email and birth dates', () => {
    const result = validateClienteForm(
      form({ telefono: 'boh', email: 'maria@', dataNascita: '2026-10-02' }),
      TODAY,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(['dataNascita', 'email', 'telefono'])
    }
    expect(validateClienteForm(form({ dataNascita: '1899-12-31' }), TODAY).ok).toBe(false)
    expect(validateClienteForm(form({ dataNascita: '2026-10-01' }), TODAY).ok).toBe(true)
  })

  it('dates the privacy consent today unless a date is given', () => {
    const today = validateClienteForm(form({ consensoPrivacy: true }), TODAY)
    expect(today.ok && today.value.consensoData).toBe('2026-10-01')
    const given = validateClienteForm(form({ consensoPrivacy: true, consensoData: '2025-03-01' }), TODAY)
    expect(given.ok && given.value.consensoData).toBe('2025-03-01')
    const none = validateClienteForm(form({ consensoPrivacy: false, consensoData: '2025-03-01' }), TODAY)
    expect(none.ok && none.value.consensoData).toBeUndefined()
  })

  it('round-trips an existing client through the form', () => {
    const existing = cliente({
      telefono: '+393331234567',
      email: 'mario@example.com',
      dataNascita: '1980-05-20',
      discipline: ['posturale'],
      consensoData: '2026-01-01',
      note: 'Spalla destra',
    })
    const result = validateClienteForm(clienteToForm(existing), TODAY)
    expect(result.ok && result.value).toEqual({
      nome: 'Mario',
      cognome: 'Rossi',
      telefono: '+393331234567',
      email: 'mario@example.com',
      dataNascita: '1980-05-20',
      note: 'Spalla destra',
      consensoPrivacy: true,
      consensoData: '2026-01-01',
    })
  })
})
