import { describe, expect, it } from 'vitest'
import type { Pacchetto } from '../data/types'
import { messaggioAuguri, messaggioPromemoria, messaggioRiepilogo } from './messaggi'
import type { StatoPacchetto } from './packages'

const stato = (overrides: Partial<StatoPacchetto>): StatoPacchetto => ({
  fatte: 0,
  totali: 10,
  residue: 10,
  settimane: [],
  nonIniziato: false,
  scaduto: false,
  esaurito: false,
  attivo: true,
  inScadenza: false,
  daRinnovare: false,
  ...overrides,
})

const sedute = { modalita: 'sedute', nome: '10 sedute fisio' } as Pacchetto
const abbonamento = { modalita: 'abbonamento', nome: 'Yoga mensile', scadenza: '2026-10-31' } as Pacchetto

describe('messaggioRiepilogo', () => {
  it('uses the sessions template', () => {
    expect(messaggioRiepilogo('Maria', sedute, stato({ fatte: 5, residue: 5 }))).toBe(
      'Ciao Maria! Lezione di oggi registrata ✅ Hai fatto 5 lezioni su 10, te ne restano 5.',
    )
  })

  it('adds the renewal line with 2 sessions left or fewer', () => {
    expect(messaggioRiepilogo('Maria', sedute, stato({ fatte: 8, residue: 2 }))).toBe(
      'Ciao Maria! Lezione di oggi registrata ✅ Hai fatto 8 lezioni su 10, te ne restano 2. Il pacchetto sta per finire, ne parliamo alla prossima lezione 😊',
    )
  })

  it('uses the subscription template, with a reminder near the end', () => {
    expect(messaggioRiepilogo('Luca', abbonamento, stato({}))).toBe(
      'Ciao Luca! Lezione di oggi registrata ✅ Il tuo abbonamento Yoga mensile è valido fino al 31/10/2026.',
    )
    expect(messaggioRiepilogo('Luca', abbonamento, stato({ inScadenza: true }))).toContain('sta per scadere')
  })
})

describe('messaggioAuguri', () => {
  it('fills the name', () => {
    expect(messaggioAuguri('Sara')).toBe('Tanti auguri Sara! 🎉 Un abbraccio da Fisio Made.')
  })
})

describe('messaggioPromemoria', () => {
  const now = new Date(2026, 9, 1, 12, 0)
  it('says today, tomorrow or the date', () => {
    expect(messaggioPromemoria('Marco', new Date(2026, 9, 1, 17, 0), now)).toBe(
      'Ciao Marco! Ti ricordo l’appuntamento da Fisio Made oggi alle 17:00. A presto!',
    )
    expect(messaggioPromemoria('Marco', new Date(2026, 9, 2, 10, 0), now)).toContain('domani alle 10:00')
    expect(messaggioPromemoria('Marco', new Date(2026, 9, 5, 9, 30), now)).toContain('lunedì 5 ottobre alle 09:30')
  })
})
