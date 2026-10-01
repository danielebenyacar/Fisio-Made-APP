import { addDays, format, getISODay, isValid, parseISO } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { toIsoDate } from '../../lib/dates'
import { pacchettiInEvidenza, settimaneAbbonamento, statoPacchetto } from '../../lib/packages'
import type { Cliente } from '../types'
import { createSeed, type DemoData } from './seed'

const byName = (data: DemoData, nome: string) => data.clienti.find((c) => c.nome === nome)!
const pacchettiOf = (data: DemoData, c: Cliente) => data.pacchetti.filter((p) => p.clienteId === c.id)
const lezioniOf = (data: DemoData, c: Cliente) => data.lezioni.filter((l) => l.clienteId === c.id)

const DATES = [
  new Date(2026, 9, 1, 8, 30), // a regular day
  new Date(2028, 1, 27, 12, 0), // +2 days is Feb 29
  new Date(2026, 11, 30, 20, 0), // birthdays wrap into next year
  new Date(2027, 0, 1, 0, 0),
]

describe.each(DATES)('createSeed(%s)', (now) => {
  const data = createSeed(now)
  const monthDay = (offset: number) => format(addDays(now, offset), 'MM-dd')

  it('has about 15 clients with unique ids', () => {
    expect(data.clienti.length).toBeGreaterThanOrEqual(14)
    expect(data.clienti.length).toBeLessThanOrEqual(17)
    const ids = [...data.clienti, ...data.pacchetti, ...data.lezioni].map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps references consistent', () => {
    const clienteIds = new Set(data.clienti.map((c) => c.id))
    for (const p of data.pacchetti) expect(clienteIds.has(p.clienteId)).toBe(true)
    for (const l of data.lezioni) {
      const p = data.pacchetti.find((x) => x.id === l.pacchettoId)
      expect(p?.clienteId).toBe(l.clienteId)
    }
  })

  it('keeps lessons inside their package: count, validity, one per week, discipline', () => {
    for (const p of data.pacchetti) {
      const own = data.lezioni.filter((l) => l.pacchettoId === p.id)
      for (const l of own) {
        expect(l.disciplina).toBe(p.disciplina)
        expect(toIsoDate(parseISO(l.data)) >= p.dataInizio).toBe(true)
        expect(parseISO(l.data).getTime()).toBeLessThan(now.getTime())
      }
      const fatte = own.filter((l) => l.stato === 'fatta')
      if (p.modalita === 'sedute') {
        expect(fatte.length).toBeLessThanOrEqual(p.lezioniTotali!)
      } else {
        expect(p.scadenza).toBeDefined()
        for (const l of fatte) expect(toIsoDate(parseISO(l.data)) <= p.scadenza!).toBe(true)
        const weeksDone = settimaneAbbonamento(p, data.lezioni, now).filter((w) => w.stato === 'fatta')
        expect(weeksDone).toHaveLength(fatte.length) // never two lessons in the same week
      }
    }
  })

  it('uses valid dates and E.164 phone numbers', () => {
    for (const c of data.clienti) {
      if (c.dataNascita) expect(isValid(parseISO(c.dataNascita))).toBe(true)
      if (c.telefono) expect(c.telefono).toMatch(/^\+39300\d{7}$/)
    }
    for (const p of data.pacchetti) {
      for (const d of [p.dataInizio, p.dataAcquisto, p.scadenza]) if (d) expect(isValid(parseISO(d))).toBe(true)
    }
  })

  it('links every package to an entry of the price list', () => {
    const tipi = new Map(data.tipiPacchetto.map((t) => [t.id, t]))
    for (const p of data.pacchetti) expect(tipi.get(p.tipoId!)?.disciplina).toBe(p.disciplina)
    for (const d of ['fisio', 'posturale', 'yoga'] as const) {
      expect(data.tipiPacchetto.some((t) => t.disciplina === d && t.attivo)).toBe(true)
    }
    expect(data.tipiPacchetto.some((t) => !t.attivo)).toBe(true)
  })

  it('covers the package scenarios', () => {
    const inEvidenza = (nome: string) => {
      const c = byName(data, nome)
      return pacchettiInEvidenza(pacchettiOf(data, c), lezioniOf(data, c), now)
    }
    expect(inEvidenza('Giulia').get('fisio')?.stato).toMatchObject({ residue: 0, esaurito: true })
    expect(inEvidenza('Marco').get('fisio')?.stato).toMatchObject({ residue: 1, daRinnovare: true })
    expect(inEvidenza('Francesca').get('fisio')?.stato).toMatchObject({ residue: 2, daRinnovare: true })
    expect(inEvidenza('Francesca').get('yoga')?.stato).toMatchObject({ attivo: true, inScadenza: false })
    expect(inEvidenza('Alessandro').get('posturale')?.stato).toMatchObject({ attivo: true, inScadenza: true })
    expect(inEvidenza('Simone').get('posturale')?.stato).toMatchObject({ scaduto: true })
    expect(data.pacchetti.filter((p) => !p.pagato).map((p) => byName(data, 'Luca').id === p.clienteId)).toEqual([true])
    expect(pacchettiOf(data, byName(data, 'Paolo'))).toEqual([])

    // Matteo: the old package (2 left) is still the one in use, a newer one is waiting.
    const matteo = pacchettiOf(data, byName(data, 'Matteo'))
    expect(matteo).toHaveLength(2)
    expect(inEvidenza('Matteo').get('fisio')).toMatchObject({ pacchetto: { id: matteo[0].id }, stato: { residue: 2 } })
  })

  it('has a client absent for more than 14 days with lessons left', () => {
    const chiara = byName(data, 'Chiara')
    const last = lezioniOf(data, chiara).at(-1)!
    const [p] = pacchettiOf(data, chiara)
    expect(statoPacchetto(p, data.lezioni, now).residue).toBeGreaterThan(0)
    expect(parseISO(last.data).getTime()).toBeLessThan(addDays(now, -14).getTime())
    expect(settimaneAbbonamento(p, data.lezioni, now).some((w) => w.stato === 'persa')).toBe(true)
  })

  it('has an absence that does not count as a lesson done', () => {
    const valentina = byName(data, 'Valentina')
    expect(lezioniOf(data, valentina).filter((l) => l.stato === 'assente')).toHaveLength(1)
    const [p] = pacchettiOf(data, valentina)
    expect(statoPacchetto(p, data.lezioni, now).residue).toBe(7)
  })

  it('has weekly classes and attaches subscription lessons to them', () => {
    expect(data.corsi.filter((c) => c.attivo && c.disciplina === 'yoga').length).toBeGreaterThan(2)
    expect(data.corsi.filter((c) => c.attivo && c.disciplina === 'posturale').length).toBeGreaterThan(2)
    expect(data.corsi.some((c) => !c.attivo)).toBe(true)
    const withCorso = data.lezioni.filter((l) => l.corsoId)
    expect(withCorso.length).toBeGreaterThan(10)
    for (const l of withCorso) {
      const corso = data.corsi.find((c) => c.id === l.corsoId)!
      const when = parseISO(l.data)
      expect(corso.disciplina).toBe(l.disciplina)
      expect(getISODay(when)).toBe(corso.giorno)
      expect(format(when, 'HH:mm')).toBe(corso.ora)
    }
  })

  it('enrolls subscribers in a fixed group, with one change of group', () => {
    for (const corso of data.corsi) {
      for (const id of corso.iscritti) {
        const c = data.clienti.find((x) => x.id === id)!
        expect(c.archiviato).toBe(false)
        expect(data.pacchetti.some((p) => p.clienteId === id && p.disciplina === corso.disciplina)).toBe(true)
      }
    }
    for (const nome of ['Chiara', 'Sara', 'Alessandro', 'Luca']) {
      expect(data.corsi.some((c) => c.iscritti.includes(byName(data, nome).id))).toBe(true)
    }
    // Federica's yoga lessons are in a group she is not enrolled in.
    const federica = byName(data, 'Federica')
    const [gruppo] = data.corsi.filter((c) => c.disciplina === 'yoga' && c.iscritti.includes(federica.id))
    const yoga = lezioniOf(data, federica).filter((l) => l.disciplina === 'yoga' && l.corsoId)
    expect(yoga.length).toBeGreaterThan(0)
    expect(yoga.every((l) => l.corsoId !== gruppo.id)).toBe(true)
  })

  it('links every fisio lesson to an appointment, and has upcoming ones', () => {
    for (const l of data.lezioni.filter((x) => x.disciplina === 'fisio')) {
      const app = data.appuntamenti.find((a) => a.id === l.appuntamentoId)!
      expect(app).toMatchObject({ lezioneId: l.id, clienteId: l.clienteId, inizio: l.data })
      expect(app.stato).toBe(l.stato === 'fatta' ? 'fatto' : 'assente')
    }
    const future = data.appuntamenti.filter((a) => a.stato === 'programmato' && parseISO(a.inizio) > now)
    expect(future.length).toBeGreaterThanOrEqual(4)
    expect(data.appuntamenti.some((a) => a.stato === 'annullato')).toBe(true)
    const paolo = byName(data, 'Paolo')
    expect(data.appuntamenti.find((a) => a.clienteId === paolo.id)).toMatchObject({ valutazione: true, stato: 'programmato' })
    expect(data.appuntamenti.some((a) => a.valutazione && a.stato === 'fatto')).toBe(true)
  })

  it('has birthdays today, in 2, 3 and 5 days', () => {
    const birthdays = (offset: number) =>
      data.clienti.filter((c) => !c.archiviato && c.dataNascita?.slice(5) === monthDay(offset))
    expect(birthdays(0).map((c) => c.nome)).toEqual(['Alessandro'])
    expect(birthdays(2).map((c) => c.nome)).toEqual(['Sara'])
    expect(birthdays(3).map((c) => c.nome)).toEqual(['Davide'])
    expect(birthdays(5).map((c) => c.nome)).toEqual(['Elena'])
  })

  it('tags clients with every discipline, alone and combined', () => {
    for (const c of data.clienti) {
      expect(c.discipline.every((d) => ['fisio', 'posturale', 'yoga'].includes(d))).toBe(true)
    }
    const count = (n: number) => data.clienti.filter((c) => c.discipline.length === n).length
    expect(count(0)).toBeGreaterThan(0)
    expect(count(1)).toBeGreaterThan(0)
    expect(count(2)).toBeGreaterThan(0)
    expect(count(3)).toBeGreaterThan(0)
    for (const d of ['fisio', 'posturale', 'yoga'] as const) {
      expect(data.clienti.filter((c) => !c.archiviato && c.discipline.includes(d)).length).toBeGreaterThan(2)
    }
  })

  it('has a client still missing the privacy consent', () => {
    const missing = data.clienti.filter((c) => !c.consensoPrivacy)
    expect(missing.map((c) => c.nome)).toEqual(['Paolo'])
    expect(missing[0].consensoData).toBeUndefined()
  })

  it('has a client without phone and an archived client', () => {
    expect(data.clienti.filter((c) => !c.telefono).map((c) => c.nome)).toEqual(['Simone'])
    expect(data.clienti.filter((c) => c.archiviato).map((c) => c.nome)).toEqual(['Martina'])
  })
})
