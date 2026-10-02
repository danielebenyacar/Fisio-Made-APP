import { describe, expect, it } from 'vitest'
import type { Lezione, Pacchetto } from '../data/types'
import { badgeBreve, descriviAvanzamento, etichettaStato } from './pacchettoLabel'
import { statoPacchetto } from './packages'

const sedute: Pacchetto = {
  id: 'p1',
  clienteId: 'c1',
  nome: '10 sedute fisio',
  disciplina: 'fisio',
  modalita: 'sedute',
  lezioniTotali: 10,
  dataInizio: '2026-09-01',
  dataAcquisto: '2026-09-01',
  pagato: true,
  createdAt: '',
}

const abbonamento: Pacchetto = {
  ...sedute,
  id: 'a1',
  nome: 'Yoga mensile',
  disciplina: 'yoga',
  modalita: 'abbonamento',
  lezioniTotali: undefined,
  dataInizio: '2026-10-01',
  scadenza: '2026-10-31',
}

const fatte = (pacchettoId: string, dates: Date[]): Lezione[] =>
  dates.map((d, i) => ({
    id: `l${i}`,
    pacchettoId,
    clienteId: 'c1',
    disciplina: 'fisio',
    data: d.toISOString(),
    stato: 'fatta',
    createdAt: '',
  }))

const tenSessions = (n: number) => fatte('p1', Array.from({ length: n }, (_, i) => new Date(2026, 8, 2 + i, 10)))
const label = (p: Pacchetto, lezioni: Lezione[], today: Date) => {
  const stato = statoPacchetto(p, lezioni, today)
  return { etichetta: etichettaStato(p, stato), avanzamento: descriviAvanzamento(p, stato), badge: badgeBreve(p, stato) }
}

describe('package labels — sessions', () => {
  const today = new Date(2026, 9, 1)

  it('says nothing special while plenty is left', () => {
    expect(label(sedute, tenSessions(3), today)).toEqual({
      etichetta: null,
      avanzamento: '3 di 10 fatte · ne restano 7',
      badge: '3/10',
    })
  })

  it('asks to renew with 2 or 1 left, says finished at 0', () => {
    expect(label(sedute, tenSessions(8), today).etichetta).toEqual({ testo: 'Da rinnovare', tono: 'avviso' })
    expect(label(sedute, tenSessions(9), today).avanzamento).toBe('9 di 10 fatte · ne resta 1')
    expect(label(sedute, tenSessions(10), today).etichetta).toEqual({ testo: 'Esaurito', tono: 'problema' })
  })

  it('reports unused sessions when expired', () => {
    const expired = { ...sedute, scadenza: '2026-09-30' }
    expect(label(expired, tenSessions(7), today).etichetta).toEqual({
      testo: 'Scaduto il 30/09/2026 con 3 sedute non usate',
      tono: 'problema',
    })
  })
})

describe('package labels — subscriptions', () => {
  it('counts weeks and dates the period', () => {
    const lezioni = fatte('a1', [new Date(2026, 9, 2, 18), new Date(2026, 9, 6, 18)])
    expect(label(abbonamento, lezioni, new Date(2026, 9, 21))).toEqual({
      etichetta: null,
      avanzamento: 'Dal 1 ott al 31 ott · 2 fatte, 1 persa, 2 da fare',
      badge: 'al 31 ott',
    })
  })

  it('counts down the last days', () => {
    expect(label(abbonamento, [], new Date(2026, 9, 29)).etichetta).toEqual({ testo: 'Scade tra 2 giorni', tono: 'avviso' })
    expect(label(abbonamento, [], new Date(2026, 9, 30)).etichetta?.testo).toBe('Scade domani')
    expect(label(abbonamento, [], new Date(2026, 9, 31)).etichetta?.testo).toBe('Scade oggi')
    expect(label(abbonamento, [], new Date(2026, 10, 1)).etichetta).toEqual({
      testo: 'Scaduto il 31/10/2026',
      tono: 'problema',
    })
  })

  it('tells when all weeks are used before the end', () => {
    // Last week (26 Oct–1 Nov) already used on Tuesday 27: nothing left until 31 Oct.
    const lezioni = fatte('a1', [new Date(2026, 9, 27, 18)])
    expect(label(abbonamento, lezioni, new Date(2026, 9, 29)).etichetta).toEqual({
      testo: 'Settimane finite, scade il 31/10/2026',
      tono: 'problema',
    })
  })

  it('announces a future start', () => {
    expect(label(abbonamento, [], new Date(2026, 8, 28)).etichetta).toEqual({ testo: 'Inizia il 01/10/2026', tono: 'neutro' })
  })
})

describe('renewed packages', () => {
  const today = new Date(2026, 9, 1)

  it('turns "to renew" into "already renewed"', () => {
    const stato = statoPacchetto(sedute, tenSessions(8), today)
    expect(etichettaStato(sedute, stato, true)).toEqual({ testo: 'Già rinnovato', tono: 'ok' })
  })

  it('keeps the text of finished packages but makes it calm', () => {
    const stato = statoPacchetto(sedute, tenSessions(10), today)
    expect(etichettaStato(sedute, stato, true)).toEqual({ testo: 'Esaurito', tono: 'neutro' })
  })

  it('changes nothing when there is no warning', () => {
    expect(etichettaStato(sedute, statoPacchetto(sedute, tenSessions(1), today), true)).toBeNull()
  })
})
