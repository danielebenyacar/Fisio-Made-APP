import { describe, expect, it } from 'vitest'
import type { Appuntamento } from '../data/types'
import {
  appuntamentoToForm,
  oraProposta,
  orario,
  sovrapposizioni,
  statoAppuntamentoLabel,
  validateAppuntamentoForm,
  type AppuntamentoForm,
} from './appuntamenti'

const app = (overrides: Partial<Appuntamento>): Appuntamento => ({
  id: 'a',
  clienteId: 'c',
  disciplina: 'fisio',
  inizio: new Date(2026, 9, 1, 10, 0).toISOString(),
  durataMinuti: 60,
  valutazione: false,
  stato: 'programmato',
  createdAt: '',
  ...overrides,
})

const NOON = new Date(2026, 9, 1, 12, 0)

describe('statoAppuntamentoLabel', () => {
  it('asks to mark past scheduled appointments', () => {
    expect(statoAppuntamentoLabel(app({}), NOON)).toEqual({ testo: 'Da segnare', tono: 'avviso' })
    expect(statoAppuntamentoLabel(app({ inizio: new Date(2026, 9, 1, 15).toISOString() }), NOON)).toBeNull()
  })

  it('names the final states', () => {
    expect(statoAppuntamentoLabel(app({ stato: 'fatto' }), NOON)?.testo).toBe('Seduta fatta')
    expect(statoAppuntamentoLabel(app({ stato: 'fatto', valutazione: true }), NOON)?.testo).toBe('Valutazione fatta')
    expect(statoAppuntamentoLabel(app({ stato: 'assente' }), NOON)?.testo).toBe('Assente')
    expect(statoAppuntamentoLabel(app({ stato: 'annullato' }), NOON)?.testo).toBe('Annullato')
  })
})

describe('orario', () => {
  it('shows start and end', () => {
    expect(orario(new Date(2026, 9, 1, 9, 30), 60)).toBe('09:30–10:30')
    expect(orario(new Date(2026, 9, 1, 18, 0), 90)).toBe('18:00–19:30')
  })
})

describe('sovrapposizioni', () => {
  const others = [
    app({ id: 'x' }), // 10:00–11:00
    app({ id: 'y', inizio: new Date(2026, 9, 1, 11, 0).toISOString() }), // 11:00–12:00
    app({ id: 'z', inizio: new Date(2026, 9, 1, 10, 30).toISOString(), stato: 'annullato' }),
  ]

  it('finds overlapping appointments, not touching or cancelled ones', () => {
    expect(sovrapposizioni(new Date(2026, 9, 1, 10, 30), 60, others).map((a) => a.id)).toEqual(['x', 'y'])
    expect(sovrapposizioni(new Date(2026, 9, 1, 12, 0), 60, others)).toEqual([])
    expect(sovrapposizioni(new Date(2026, 9, 1, 9, 0), 60, others)).toEqual([])
  })

  it('ignores the appointment being edited', () => {
    expect(sovrapposizioni(new Date(2026, 9, 1, 10, 0), 60, others, 'x')).toEqual([])
  })
})

describe('oraProposta', () => {
  it('proposes the next full hour today, 09:00 on other days', () => {
    expect(oraProposta('2026-10-01', new Date(2026, 9, 1, 10, 20))).toBe('11:00')
    expect(oraProposta('2026-10-02', new Date(2026, 9, 1, 10, 20))).toBe('09:00')
    expect(oraProposta('2026-10-01', new Date(2026, 9, 1, 23, 30))).toBe('20:00')
  })
})

describe('validateAppuntamentoForm', () => {
  const form = (overrides: Partial<AppuntamentoForm>): AppuntamentoForm => ({
    clienteId: 'c1',
    disciplina: 'fisio',
    giorno: '2026-10-02',
    ora: '10:30',
    durataMinuti: '60',
    valutazione: true,
    note: ' Prima visita ',
    ...overrides,
  })

  it('builds the appointment in local time', () => {
    expect(validateAppuntamentoForm(form({}))).toEqual({
      ok: true,
      value: {
        clienteId: 'c1',
        disciplina: 'fisio',
        inizio: new Date(2026, 9, 2, 10, 30).toISOString(),
        durataMinuti: 60,
        valutazione: true,
        note: 'Prima visita',
      },
    })
  })

  it('reports missing client, bad time and duration', () => {
    const result = validateAppuntamentoForm(form({ clienteId: '', ora: '25:00', durataMinuti: '5', giorno: '' }))
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(['clienteId', 'durataMinuti', 'giorno', 'ora'])
  })

  it('round-trips an existing appointment', () => {
    const existing = app({ inizio: new Date(2026, 9, 2, 16, 15).toISOString(), durataMinuti: 45, note: 'Spalla' })
    const result = validateAppuntamentoForm(appuntamentoToForm(existing))
    expect(result.ok && result.value).toMatchObject({ inizio: existing.inizio, durataMinuti: 45, note: 'Spalla' })
  })
})
