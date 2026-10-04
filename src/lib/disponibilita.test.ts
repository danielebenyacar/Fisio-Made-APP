import { describe, expect, it } from 'vitest'
import type { Appuntamento, Corso } from '../data/types'
import { oraDi } from './agenda'
import { fasceDelGiorno, impegniDelGiorno, impegniSovrapposti, type Fascia } from './disponibilita'

const corso = (overrides: Partial<Corso>): Corso => ({
  id: 'c1',
  nome: 'Yoga sera',
  disciplina: 'yoga',
  giorno: 4, // Thursday
  ora: '18:30',
  durataMinuti: 60,
  attivo: true,
  iscritti: [],
  createdAt: '',
  ...overrides,
})

const app = (overrides: Partial<Appuntamento>): Appuntamento => ({
  id: 'a1',
  clienteId: 'maria',
  disciplina: 'fisio',
  inizio: new Date(2026, 9, 1, 11, 0).toISOString(),
  durataMinuti: 60,
  valutazione: false,
  stato: 'programmato',
  createdAt: '',
  ...overrides,
})

// Thursday 1 October 2026.
const GIORNO = '2026-10-01'
const MORNING = new Date(2026, 9, 1, 7, 0)
const nome = (id: string) => (id === 'maria' ? 'Maria Rossi' : 'Luca Bianchi')

/** "08:00 09:00 | 11:00–12:00 Maria Rossi | 12:00 …" for readable expectations. */
const describeFasce = (fasce: Fascia[]) =>
  fasce.map((f) =>
    f.tipo === 'liberi'
      ? f.orari.map(oraDi).join(' ')
      : `${oraDi(f.impegno.inizio)}–${oraDi(f.impegno.fine)} ${f.impegno.titolo}`,
  )

describe('impegniDelGiorno', () => {
  const corsi = [
    corso({ id: 'yoga', ora: '18:30' }),
    corso({ id: 'post', nome: 'Posturale mattina', disciplina: 'posturale', ora: '09:30' }),
    corso({ id: 'lun', giorno: 1 }),
    corso({ id: 'sospeso', ora: '12:00', attivo: false }),
  ]
  const appuntamenti = [
    app({ id: 'a1' }),
    app({ id: 'a2', clienteId: 'luca', inizio: new Date(2026, 9, 1, 15, 0).toISOString(), stato: 'annullato' }),
    app({ id: 'a3', inizio: new Date(2026, 9, 2, 11, 0).toISOString() }),
    app({ id: 'a4', clienteId: 'luca', inizio: new Date(2026, 9, 1, 16, 0).toISOString(), durataMinuti: 90 }),
  ]

  it('lists the active classes of the weekday and the appointments not cancelled, by time', () => {
    const impegni = impegniDelGiorno(GIORNO, corsi, appuntamenti, nome)
    expect(impegni.map((i) => [i.tipo, i.titolo, oraDi(i.inizio), oraDi(i.fine)])).toEqual([
      ['corso', 'Posturale mattina', '09:30', '10:30'],
      ['appuntamento', 'Maria Rossi', '11:00', '12:00'],
      ['appuntamento', 'Luca Bianchi', '16:00', '17:30'],
      ['corso', 'Yoga sera', '18:30', '19:30'],
    ])
  })

  it('leaves out the appointment being edited', () => {
    const impegni = impegniDelGiorno(GIORNO, corsi, appuntamenti, nome, 'a1')
    expect(impegni.map((i) => i.id)).not.toContain('a1')
  })
})

describe('impegniSovrapposti', () => {
  const impegni = impegniDelGiorno(GIORNO, [], [app({})], nome) // 11:00–12:00

  it('finds overlaps but not commitments that just touch', () => {
    expect(impegniSovrapposti(impegni, new Date(2026, 9, 1, 10, 30), 60)).toHaveLength(1)
    expect(impegniSovrapposti(impegni, new Date(2026, 9, 1, 11, 45), 30)).toHaveLength(1)
    expect(impegniSovrapposti(impegni, new Date(2026, 9, 1, 10, 0), 60)).toEqual([])
    expect(impegniSovrapposti(impegni, new Date(2026, 9, 1, 12, 0), 60)).toEqual([])
  })
})

describe('fasceDelGiorno', () => {
  it('offers every full hour of an empty day, until the last one that fits', () => {
    expect(describeFasce(fasceDelGiorno(GIORNO, [], 60, MORNING))).toEqual([
      '08:00 09:00 10:00 11:00 12:00 13:00 14:00 15:00 16:00 17:00 18:00 19:00 20:00',
    ])
    expect(describeFasce(fasceDelGiorno(GIORNO, [], 90, MORNING, { apertura: '09:00', chiusura: '13:00' }))).toEqual([
      '09:00 10:00 11:00',
    ])
  })

  it('puts commitments in between and proposes the times right before and after them', () => {
    const impegni = impegniDelGiorno(
      GIORNO,
      [corso({ ora: '18:30' }), corso({ id: 'post', nome: 'Posturale', disciplina: 'posturale', ora: '09:30' })],
      [app({})],
      nome,
    )
    expect(describeFasce(fasceDelGiorno(GIORNO, impegni, 60, MORNING))).toEqual([
      '08:00 08:30',
      '09:30–10:30 Posturale',
      // 10:30–11:00 is free but too short for one hour.
      '11:00–12:00 Maria Rossi',
      '12:00 13:00 14:00 15:00 16:00 17:00 17:30',
      '18:30–19:30 Yoga sera',
      '19:30 20:00',
    ])
  })

  it('skips times already past and commitments already over', () => {
    const impegni = impegniDelGiorno(GIORNO, [corso({ ora: '09:30' })], [app({})], nome)
    const at = new Date(2026, 9, 1, 11, 20)
    expect(describeFasce(fasceDelGiorno(GIORNO, impegni, 60, at))).toEqual([
      '11:00–12:00 Maria Rossi',
      '12:00 13:00 14:00 15:00 16:00 17:00 18:00 19:00 20:00',
    ])
    // A day in the past has nothing left.
    expect(fasceDelGiorno('2026-09-30', [], 60, at)).toEqual([])
  })

  it('handles overlapping commitments and has no free time inside them', () => {
    const impegni = impegniDelGiorno(
      GIORNO,
      [corso({ ora: '18:00' })],
      [app({ inizio: new Date(2026, 9, 1, 18, 30).toISOString() })],
      nome,
    )
    expect(describeFasce(fasceDelGiorno(GIORNO, impegni, 60, new Date(2026, 9, 1, 16, 0)))).toEqual([
      '16:00 17:00',
      '18:00–19:00 Yoga sera',
      '18:30–19:30 Maria Rossi',
      '19:30 20:00',
    ])
  })

  it('keeps commitments outside opening hours visible', () => {
    const impegni = impegniDelGiorno(GIORNO, [corso({ ora: '21:00' })], [], nome)
    const fasce = describeFasce(fasceDelGiorno(GIORNO, impegni, 60, new Date(2026, 9, 1, 19, 10)))
    expect(fasce).toEqual(['20:00', '21:00–22:00 Yoga sera'])
  })
})
