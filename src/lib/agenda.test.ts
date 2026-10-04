import { describe, expect, it } from 'vitest'
import type { Appuntamento, Corso, Lezione } from '../data/types'
import {
  corsoPiuVicino,
  dataOra,
  daSegnare,
  giorniSettimana,
  gruppiDelCliente,
  lezioneAltraOccorrenza,
  occorrenzeCorsi,
  oraDi,
  presentiOccorrenza,
  presenzaInOccorrenza,
} from './agenda'
import { toIsoDate } from './dates'

const corso = (overrides: Partial<Corso>): Corso => ({
  id: 'c1',
  nome: 'Yoga sera',
  disciplina: 'yoga',
  giorno: 1,
  ora: '18:30',
  durataMinuti: 60,
  attivo: true,
  iscritti: [],
  createdAt: '',
  ...overrides,
})

// Thursday 1 October 2026; that week runs Mon 28 Sep – Sun 4 Oct.
const THURSDAY = new Date(2026, 9, 1, 12, 0)

describe('dates and times', () => {
  it('combines a day and a time in local time', () => {
    const d = dataOra('2026-10-01', '18:30')
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([1, 18, 30])
    expect(oraDi(d)).toBe('18:30')
  })

  it('lists the Monday–Sunday week of a date', () => {
    expect(giorniSettimana(THURSDAY).map(toIsoDate)).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ])
  })
})

describe('occorrenzeCorsi', () => {
  const corsi = [
    corso({ id: 'yoga-lun', giorno: 1, ora: '18:30' }),
    corso({ id: 'post-lun', nome: 'Posturale', disciplina: 'posturale', giorno: 1, ora: '10:00' }),
    corso({ id: 'yoga-gio', giorno: 4, ora: '09:30' }),
    corso({ id: 'sospeso', giorno: 4, ora: '20:00', attivo: false }),
  ]

  it('places active classes on their weekday, by time', () => {
    const week = occorrenzeCorsi(corsi, giorniSettimana(THURSDAY))
    expect(week.map((o) => `${o.giorno} ${oraDi(o.inizio)} ${o.corso.id}`)).toEqual([
      '2026-09-28 10:00 post-lun',
      '2026-09-28 18:30 yoga-lun',
      '2026-10-01 09:30 yoga-gio',
    ])
    expect(oraDi(week[0].fine)).toBe('11:00')
  })

  it('finds the closest class of the day for a discipline', () => {
    expect(corsoPiuVicino(corsi, 'yoga', THURSDAY)?.corso.id).toBe('yoga-gio')
    expect(corsoPiuVicino(corsi, 'posturale', THURSDAY)).toBeNull()
  })
})

describe('presentiOccorrenza', () => {
  it('keeps lessons of that class on that day', () => {
    const lezione = (id: string, corsoId: string | undefined, data: Date): Lezione => ({
      id,
      pacchettoId: 'p',
      clienteId: 'c',
      disciplina: 'yoga',
      data: data.toISOString(),
      stato: 'fatta',
      corsoId,
      createdAt: '',
    })
    const lezioni = [
      lezione('a', 'yoga-gio', new Date(2026, 9, 1, 9, 30)),
      lezione('b', 'yoga-gio', new Date(2026, 9, 8, 9, 30)),
      lezione('c', undefined, new Date(2026, 9, 1, 9, 30)),
    ]
    expect(presentiOccorrenza(lezioni, 'yoga-gio', '2026-10-01').map((l) => l.id)).toEqual(['a'])
  })
})

describe('daSegnare', () => {
  const app = (stato: Appuntamento['stato'], inizio: Date): Appuntamento => ({
    id: 'x',
    clienteId: 'c',
    disciplina: 'fisio',
    inizio: inizio.toISOString(),
    durataMinuti: 60,
    valutazione: false,
    stato,
    createdAt: '',
  })

  it('flags past appointments still scheduled', () => {
    expect(daSegnare(app('programmato', new Date(2026, 9, 1, 10)), THURSDAY)).toBe(true)
    expect(daSegnare(app('programmato', new Date(2026, 9, 1, 15)), THURSDAY)).toBe(false)
    expect(daSegnare(app('fatto', new Date(2026, 9, 1, 10)), THURSDAY)).toBe(false)
  })
})

describe('fixed groups and group changes', () => {
  const lezione = (id: string, clienteId: string, corsoId: string | undefined, data: Date, stato: Lezione['stato'] = 'fatta'): Lezione => ({
    id,
    pacchettoId: 'p',
    clienteId,
    disciplina: 'yoga',
    data: data.toISOString(),
    stato,
    corsoId,
    createdAt: '',
  })
  const lezioni = [
    lezione('a', 'maria', 'yoga-mar', new Date(2026, 8, 29, 9, 30)), // Tuesday of the week
    lezione('b', 'luca', 'yoga-gio', new Date(2026, 9, 1, 9, 30), 'assente'),
    lezione('c', 'maria', 'yoga-mar', new Date(2026, 8, 22, 9, 30)), // previous week
  ]

  it('finds the presence or absence of a client in a session', () => {
    expect(presenzaInOccorrenza(lezioni, 'maria', 'yoga-mar', '2026-09-29')?.id).toBe('a')
    expect(presenzaInOccorrenza(lezioni, 'luca', 'yoga-gio', '2026-10-01')?.stato).toBe('assente')
    expect(presenzaInOccorrenza(lezioni, 'maria', 'yoga-gio', '2026-10-01')).toBeUndefined()
  })

  it('finds a lesson done elsewhere the same week', () => {
    const thursday = new Date(2026, 9, 1, 9, 30)
    expect(lezioneAltraOccorrenza(lezioni, 'maria', 'yoga', thursday, 'yoga-gio')?.id).toBe('a')
    // Not the session itself, not absences, not other weeks.
    expect(lezioneAltraOccorrenza(lezioni, 'maria', 'yoga', new Date(2026, 8, 29, 9, 30), 'yoga-mar')).toBeUndefined()
    expect(lezioneAltraOccorrenza(lezioni, 'luca', 'yoga', thursday, 'yoga-mar')).toBeUndefined()
    expect(lezioneAltraOccorrenza(lezioni, 'maria', 'yoga', new Date(2026, 9, 6, 9, 30), 'yoga-mar')).toBeUndefined()
  })

  it('lists the groups of a client', () => {
    const corsi = [corso({ id: 'x', iscritti: ['maria'] }), corso({ id: 'y', iscritti: ['luca'] })]
    expect(gruppiDelCliente(corsi, 'maria').map((c) => c.id)).toEqual(['x'])
  })
})
