import { describe, expect, it } from 'vitest'
import type { Lezione, Pacchetto } from '../data/types'
import {
  haSuccessivo,
  ordinaPacchetti,
  pacchettiInEvidenza,
  residue,
  scadenzaDopoMesi,
  settimaneAbbonamento,
  statoPacchetto,
} from './packages'

// Thursday 1 October 2026. Weeks: Mon 28/09, Mon 05/10, Mon 12/10, Mon 19/10, Mon 26/10.
const TODAY = new Date(2026, 9, 1, 10, 0)

const sedute = (overrides: Partial<Pacchetto> = {}): Pacchetto => ({
  id: 'p1',
  clienteId: 'c1',
  nome: '10 sedute fisio',
  disciplina: 'fisio',
  modalita: 'sedute',
  lezioniTotali: 10,
  dataInizio: '2026-09-01',
  dataAcquisto: '2026-09-01',
  pagato: true,
  createdAt: '2026-09-01T08:00:00.000Z',
  ...overrides,
})

const abbonamento = (overrides: Partial<Pacchetto> = {}): Pacchetto => ({
  id: 'a1',
  clienteId: 'c1',
  nome: 'Yoga mensile',
  disciplina: 'yoga',
  modalita: 'abbonamento',
  dataInizio: '2026-10-01',
  scadenza: '2026-10-31',
  dataAcquisto: '2026-10-01',
  pagato: true,
  createdAt: '2026-10-01T08:00:00.000Z',
  ...overrides,
})

let seq = 0
const lezione = (pacchettoId: string, when: Date, stato: Lezione['stato'] = 'fatta'): Lezione => ({
  id: `l${++seq}`,
  pacchettoId,
  clienteId: 'c1',
  disciplina: 'fisio',
  data: when.toISOString(),
  stato,
  createdAt: when.toISOString(),
})

const times = (n: number, pacchettoId = 'p1') =>
  Array.from({ length: n }, (_, i) => lezione(pacchettoId, new Date(2026, 8, 2 + i, 10)))

describe('scadenzaDopoMesi', () => {
  it('ends the day before the same date N months later', () => {
    expect(scadenzaDopoMesi('2026-10-01', 1)).toBe('2026-10-31')
    expect(scadenzaDopoMesi('2026-10-15', 1)).toBe('2026-11-14')
    expect(scadenzaDopoMesi('2026-10-01', 3)).toBe('2026-12-31')
    expect(scadenzaDopoMesi('2026-12-01', 1)).toBe('2026-12-31')
  })
})

describe('residue — sedute', () => {
  it('is sessions bought minus lessons done', () => {
    expect(residue(sedute(), times(8), TODAY)).toBe(2)
    expect(residue(sedute(), times(10), TODAY)).toBe(0)
  })

  it('ignores absences and other packages', () => {
    const lezioni = [
      ...times(3),
      lezione('p1', new Date(2026, 8, 20), 'assente'),
      lezione('other', new Date(2026, 8, 21)),
    ]
    expect(residue(sedute(), lezioni, TODAY)).toBe(7)
  })
})

describe('settimaneAbbonamento', () => {
  it('covers every Monday–Sunday week touching the period', () => {
    const weeks = settimaneAbbonamento(abbonamento(), [], TODAY)
    expect(weeks.map((w) => w.inizio)).toEqual([
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
    ])
    expect(weeks.every((w) => w.stato === 'da-fare')).toBe(true)
  })

  it('marks weeks with a lesson as done and past empty weeks as lost', () => {
    const today = new Date(2026, 9, 21) // Wednesday of the 4th week
    const lezioni = [
      lezione('a1', new Date(2026, 9, 2, 18)), // week 1
      lezione('a1', new Date(2026, 9, 3, 18)), // week 1 again: still one week
      lezione('a1', new Date(2026, 9, 6, 18)), // week 2
      lezione('a1', new Date(2026, 9, 14, 18), 'assente'), // week 3: absence → lost
    ]
    expect(settimaneAbbonamento(abbonamento(), lezioni, today).map((w) => w.stato)).toEqual([
      'fatta',
      'fatta',
      'persa',
      'da-fare', // current week, can still come
      'da-fare',
    ])
    expect(residue(abbonamento(), lezioni, today)).toBe(2)
  })

  it('loses every unused week once expired, even in the expiry week', () => {
    const afterEnd = new Date(2026, 10, 1) // Sunday 1 Nov, same week as 31 Oct
    expect(settimaneAbbonamento(abbonamento(), [], afterEnd).every((w) => w.stato === 'persa')).toBe(true)
    expect(residue(abbonamento(), [], afterEnd)).toBe(0)
  })

  it('is empty for sessions packages', () => {
    expect(settimaneAbbonamento(sedute(), [], TODAY)).toEqual([])
  })
})

describe('statoPacchetto', () => {
  it('flags sessions packages to renew at 2 left, and finished at 0', () => {
    expect(statoPacchetto(sedute(), times(7), TODAY)).toMatchObject({ residue: 3, daRinnovare: false, attivo: true })
    expect(statoPacchetto(sedute(), times(8), TODAY)).toMatchObject({ residue: 2, daRinnovare: true, attivo: true })
    expect(statoPacchetto(sedute(), times(10), TODAY)).toMatchObject({
      fatte: 10,
      totali: 10,
      residue: 0,
      esaurito: true,
      attivo: false,
      daRinnovare: false,
    })
  })

  it('counts days to expiry and warns in the last 7 days', () => {
    const p = abbonamento()
    expect(statoPacchetto(p, [], new Date(2026, 9, 23))).toMatchObject({ giorniAllaScadenza: 8, inScadenza: false })
    expect(statoPacchetto(p, [], new Date(2026, 9, 24))).toMatchObject({
      giorniAllaScadenza: 7,
      inScadenza: true,
      daRinnovare: true,
    })
    expect(statoPacchetto(p, [], new Date(2026, 9, 31, 23))).toMatchObject({ giorniAllaScadenza: 0, scaduto: false })
    expect(statoPacchetto(p, [], new Date(2026, 10, 1))).toMatchObject({
      scaduto: true,
      esaurito: true,
      attivo: false,
      inScadenza: false,
    })
  })

  it('expires sessions packages with a validity date', () => {
    const p = sedute({ scadenza: '2026-09-30' })
    expect(statoPacchetto(p, times(2), TODAY)).toMatchObject({ residue: 8, scaduto: true, attivo: false })
  })

  it('knows when a subscription has not started yet', () => {
    expect(statoPacchetto(abbonamento({ dataInizio: '2026-10-05' }), [], TODAY).nonIniziato).toBe(true)
  })
})

describe('pacchettiInEvidenza', () => {
  it('shows the oldest usable package per discipline', () => {
    const old = sedute({ id: 'old', dataInizio: '2026-08-01', dataAcquisto: '2026-08-01' })
    const recent = sedute({ id: 'new', dataInizio: '2026-09-25', dataAcquisto: '2026-09-25' })
    const yoga = abbonamento()
    const result = pacchettiInEvidenza([recent, yoga, old], times(4, 'old'), TODAY)
    expect(result.get('fisio')).toMatchObject({ pacchetto: { id: 'old' }, rinnovato: true })
    expect(result.get('yoga')).toMatchObject({ pacchetto: { id: 'a1' }, rinnovato: false })
    expect(result.has('posturale')).toBe(false)
  })

  it('falls back to the most recent package when none is usable', () => {
    const first = sedute({ id: 'first', lezioniTotali: 1, dataInizio: '2026-08-01', dataAcquisto: '2026-08-01' })
    const second = sedute({ id: 'second', lezioniTotali: 1 })
    const lezioni = [...times(1, 'first'), ...times(1, 'second')]
    const result = pacchettiInEvidenza([first, second], lezioni, TODAY)
    expect(result.get('fisio')).toMatchObject({ pacchetto: { id: 'second' }, stato: { esaurito: true } })
  })
})

describe('haSuccessivo', () => {
  it('looks for a later package of the same client and discipline', () => {
    const old = sedute({ id: 'old', dataInizio: '2026-08-01' })
    const recent = sedute({ id: 'new', dataInizio: '2026-09-25' })
    const otherClient = sedute({ id: 'x', clienteId: 'c2', dataInizio: '2026-09-30' })
    expect(haSuccessivo(old, [old, recent])).toBe(true)
    expect(haSuccessivo(recent, [old, recent, otherClient])).toBe(false)
    expect(haSuccessivo(old, [old, abbonamento()])).toBe(false)
  })
})

describe('ordinaPacchetti', () => {
  it('sorts by start date, then purchase, then creation', () => {
    const a = sedute({ id: 'a', dataInizio: '2026-09-02' })
    const b = sedute({ id: 'b', dataInizio: '2026-09-01', createdAt: '2026-09-01T09:00:00.000Z' })
    const c = sedute({ id: 'c', dataInizio: '2026-09-01', createdAt: '2026-09-01T08:00:00.000Z' })
    expect(ordinaPacchetti([a, b, c]).map((p) => p.id)).toEqual(['c', 'b', 'a'])
  })
})
