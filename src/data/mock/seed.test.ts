import { addDays, format, isValid, parseISO } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { Cliente, Pacchetto } from '../types'
import { createSeed, type DemoData } from './seed'

// Fixture-only helpers: the real residue rule lives in src/lib/packages.ts (M2).
const fatte = (data: DemoData, p: Pacchetto) =>
  data.lezioni.filter((l) => l.pacchettoId === p.id && l.stato === 'fatta').length
const pacchettiOf = (data: DemoData, c: Cliente) =>
  data.pacchetti.filter((p) => p.clienteId === c.id)
const latest = (data: DemoData, c: Cliente) => pacchettiOf(data, c).at(-1)!
const residueOfLatest = (data: DemoData, c: Cliente) => {
  const p = latest(data, c)
  return p.lezioniTotali - fatte(data, p)
}
const byName = (data: DemoData, nome: string) => data.clienti.find((c) => c.nome === nome)!

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

  it('never uses more lessons than a package has, nor dates in the future', () => {
    for (const p of data.pacchetti) expect(fatte(data, p)).toBeLessThanOrEqual(p.lezioniTotali)
    for (const l of data.lezioni) expect(parseISO(l.data).getTime()).toBeLessThan(now.getTime())
  })

  it('uses valid dates and E.164 phone numbers', () => {
    for (const c of data.clienti) {
      if (c.dataNascita) expect(isValid(parseISO(c.dataNascita))).toBe(true)
      if (c.telefono) expect(c.telefono).toMatch(/^\+39300\d{7}$/)
    }
  })

  it('covers the package scenarios', () => {
    expect(residueOfLatest(data, byName(data, 'Giulia'))).toBe(0)
    expect(residueOfLatest(data, byName(data, 'Marco'))).toBe(1)
    expect(residueOfLatest(data, byName(data, 'Francesca'))).toBe(2)
    expect(data.pacchetti.some((p) => !p.pagato)).toBe(true)

    const matteo = pacchettiOf(data, byName(data, 'Matteo'))
    expect(matteo).toHaveLength(2)
    expect(matteo[0].lezioniTotali - fatte(data, matteo[0])).toBeGreaterThan(0)
    expect(matteo[1].dataAcquisto > matteo[0].dataAcquisto).toBe(true)
  })

  it('has a client absent for more than 14 days with lessons left', () => {
    const chiara = byName(data, 'Chiara')
    const last = data.lezioni.filter((l) => l.clienteId === chiara.id).at(-1)!
    expect(residueOfLatest(data, chiara)).toBeGreaterThan(0)
    expect(parseISO(last.data).getTime()).toBeLessThan(addDays(now, -14).getTime())
  })

  it('has an absence that does not count as a lesson done', () => {
    const valentina = byName(data, 'Valentina')
    const lezioni = data.lezioni.filter((l) => l.clienteId === valentina.id)
    expect(lezioni.filter((l) => l.stato === 'assente')).toHaveLength(1)
    expect(residueOfLatest(data, valentina)).toBe(7)
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
