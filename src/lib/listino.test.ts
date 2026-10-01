import { describe, expect, it } from 'vitest'
import type { TipoPacchetto } from '../data/types'
import { descriviTipo, EMPTY_TIPO_FORM, parseIntIn, tipoToForm, validateTipoForm, type TipoForm } from './listino'

const nbsp = (s: string) => s.replace(/\s/g, ' ')

describe('descriviTipo', () => {
  it('describes sessions packages', () => {
    expect(nbsp(descriviTipo({ modalita: 'sedute', lezioni: 10, prezzo: 500 }))).toBe('10 sedute · 500 €')
    expect(nbsp(descriviTipo({ modalita: 'sedute', lezioni: 1, prezzo: 40 }))).toBe('1 seduta · 40 €')
    expect(descriviTipo({ modalita: 'sedute', lezioni: 5, durataMesi: 6 })).toBe('5 sedute, valide 6 mesi')
  })

  it('describes subscriptions', () => {
    expect(nbsp(descriviTipo({ modalita: 'abbonamento', durataMesi: 1, prezzo: 60 }))).toBe(
      '1 mese, 1 lezione a settimana · 60 €',
    )
    expect(descriviTipo({ modalita: 'abbonamento', durataMesi: 3 })).toBe('3 mesi, 1 lezione a settimana')
  })
})

describe('parseIntIn', () => {
  it('accepts whole numbers in range only', () => {
    expect(parseIntIn(' 10 ', 1, 200)).toBe(10)
    expect(parseIntIn('0', 1, 200)).toBeNull()
    expect(parseIntIn('2.5', 1, 200)).toBeNull()
    expect(parseIntIn('201', 1, 200)).toBeNull()
  })
})

describe('validateTipoForm', () => {
  const form = (overrides: Partial<TipoForm>): TipoForm => ({
    ...EMPTY_TIPO_FORM,
    nome: '10 sedute fisio',
    disciplina: 'fisio',
    lezioni: '10',
    prezzo: '500',
    ...overrides,
  })

  it('builds a sessions type, with optional validity', () => {
    expect(validateTipoForm(form({}))).toEqual({
      ok: true,
      value: {
        nome: '10 sedute fisio',
        disciplina: 'fisio',
        modalita: 'sedute',
        lezioni: 10,
        durataMesi: undefined,
        prezzo: 500,
        attivo: true,
      },
    })
    const withValidity = validateTipoForm(form({ durataMesi: '6' }))
    expect(withValidity.ok && withValidity.value.durataMesi).toBe(6)
  })

  it('builds a subscription, ignoring the sessions field', () => {
    const result = validateTipoForm(
      form({ nome: 'Yoga mensile', disciplina: 'yoga', modalita: 'abbonamento', durataMesi: '1', prezzo: '60,50' }),
    )
    expect(result).toEqual({
      ok: true,
      value: {
        nome: 'Yoga mensile',
        disciplina: 'yoga',
        modalita: 'abbonamento',
        lezioni: undefined,
        durataMesi: 1,
        prezzo: 60.5,
        attivo: true,
      },
    })
  })

  it('reports every missing or wrong field', () => {
    const result = validateTipoForm(
      form({ nome: ' ', disciplina: '', lezioni: '0', durataMesi: 'tre', prezzo: 'gratis' }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(['disciplina', 'durataMesi', 'lezioni', 'nome', 'prezzo'])
    }
    const noDuration = validateTipoForm(form({ modalita: 'abbonamento', durataMesi: '' }))
    expect(noDuration.ok).toBe(false)
  })

  it('round-trips an existing type', () => {
    const tipo: TipoPacchetto = {
      id: 't1',
      nome: 'Posturale trimestrale',
      disciplina: 'posturale',
      modalita: 'abbonamento',
      durataMesi: 3,
      prezzo: 165,
      attivo: false,
      createdAt: '',
    }
    const result = validateTipoForm(tipoToForm(tipo))
    expect(result.ok && result.value).toMatchObject({ nome: 'Posturale trimestrale', durataMesi: 3, prezzo: 165, attivo: false })
  })
})
