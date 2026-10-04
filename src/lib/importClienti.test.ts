import { readSheet } from 'read-excel-file/node'
import { describe, expect, it } from 'vitest'
import { createSeed } from '../data/mock/seed'
import type { Cliente } from '../data/types'
import { analyzeImport, type Cell } from './importClienti'

const TODAY = new Date(2026, 9, 1, 10, 0)
const HEADER: Cell[] = ['Nome', 'Cognome', 'Telefono', 'Email', 'Data di nascita', 'Discipline', 'Note']

const existing: Cliente[] = [
  {
    id: 'c1',
    nome: 'Giulia',
    cognome: 'Bianchi',
    discipline: ['fisio'],
    archiviato: false,
    createdAt: '2026-01-01T10:00:00.000Z',
  },
]

const analyze = (rows: Cell[][]) => {
  const result = analyzeImport(rows, existing, TODAY)
  if (!result.ok) throw new Error(result.errore)
  return result
}

describe('analyzeImport', () => {
  it('maps a full row to a client', () => {
    const result = analyze([
      HEADER,
      ['Laura', 'Ferri', '333 123 4567', 'laura@example.com', new Date(Date.UTC(1988, 2, 14)), 'Fisio, Yoga', 'Preferisce la sera'],
    ])
    expect(result.daImportare).toEqual([
      {
        riga: 2,
        avvisi: [],
        cliente: {
          nome: 'Laura',
          cognome: 'Ferri',
          telefono: '+393331234567',
          email: 'laura@example.com',
          dataNascita: '1988-03-14',
          discipline: ['fisio', 'yoga'],
          note: 'Preferisce la sera',
        },
      },
    ])
  })

  it('recognizes alternative column titles in any order', () => {
    const result = analyze([
      ['Cellulare', 'COGNOME', 'E-mail', 'nome', 'Attività', 'Nato il'],
      [3331234567, 'Neri', 'n@example.com', 'Paola', 'posturale', '05/06/1970'],
    ])
    expect(result.daImportare[0].cliente).toEqual({
      nome: 'Paola',
      cognome: 'Neri',
      telefono: '+393331234567',
      email: 'n@example.com',
      dataNascita: '1970-06-05',
      discipline: ['posturale'],
    })
    expect(result.colonneIgnorate).toEqual([])
  })

  it('reports unknown columns as ignored', () => {
    expect(analyze([[...HEADER, 'Codice fiscale'], ['A', 'B']]).colonneIgnorate).toEqual(['Codice fiscale'])
  })

  it('fails with a clear message when nome or cognome columns are missing', () => {
    expect(analyzeImport([['Nome e cognome', 'Telefono']], existing, TODAY)).toEqual({
      ok: false,
      errore: 'Nella prima riga mancano le colonne: Nome, Cognome. Colonne trovate: Nome e cognome, Telefono.',
    })
    expect(analyzeImport([], existing, TODAY)).toEqual({ ok: false, errore: 'Il file è vuoto.' })
  })

  it('skips empty rows, discards incomplete ones and finds duplicates', () => {
    const result = analyze([
      [null, null],
      HEADER,
      ['GIULIA', 'bianchi'],
      [null, null, null],
      ['Francesco', null],
      [null, 'Verdi'],
      ['Luca', 'Neri'],
      ['luca', 'NERI'],
    ])
    expect(result.giaPresenti).toEqual([
      { riga: 3, nome: 'Giulia Bianchi' },
      { riga: 8, nome: 'Luca Neri' },
    ])
    expect(result.scartate).toEqual([
      { riga: 5, motivo: 'manca il cognome' },
      { riga: 6, motivo: 'manca il nome' },
    ])
    expect(result.daImportare.map((r) => r.riga)).toEqual([7])
  })

  it('drops invalid optional values with a warning', () => {
    const [row] = analyze([
      HEADER,
      ['Anna', 'Neri', 'boh', 'anna@example', '31/02/1990', '', ''],
    ]).daImportare
    expect(row.cliente).toEqual({ nome: 'Anna', cognome: 'Neri', discipline: [] })
    expect(row.avvisi).toEqual([
      'telefono "boh" non valido, non importato',
      'email "anna@example" non valida, non importata',
      'data di nascita "31/02/1990" non valida, non importata',
    ])
  })

  it('ignores an old privacy consent column', () => {
    const result = analyze([[...HEADER, 'Consenso privacy'], ['A', 'B', null, null, null, null, null, 'Sì']])
    expect(result.colonneIgnorate).toEqual(['Consenso privacy'])
    expect(result.daImportare[0].cliente).toEqual({ nome: 'A', cognome: 'B', discipline: [] })
  })

  it('reads birth dates stored as Excel serial numbers', () => {
    const [row] = analyze([HEADER, ['A', 'B', null, null, 32216]]).daImportare
    expect(row.cliente.dataNascita).toBe('1988-03-14')
  })
})

describe('public/esempio-clienti.xlsx', () => {
  it('imports 7 clients, skips Giulia Bianchi (in the demo data) and the row without cognome', async () => {
    const rows = (await readSheet('public/esempio-clienti.xlsx')) as unknown as Cell[][]
    const result = analyzeImport(rows, createSeed(TODAY).clienti, TODAY)
    if (!result.ok) throw new Error(result.errore)

    expect(result.daImportare.map((r) => `${r.cliente.nome} ${r.cliente.cognome}`)).toEqual([
      'Laura Ferri',
      'Giorgio Moretti',
      'Anna Barbieri',
      'Roberto Fontana',
      'Silvia Santoro',
      'Marco Villa',
      'Elisa Caruso',
    ])
    expect(result.giaPresenti).toEqual([{ riga: 9, nome: 'Giulia Bianchi' }])
    expect(result.scartate).toEqual([{ riga: 10, motivo: 'manca il cognome' }])

    const byName = (nome: string) => result.daImportare.find((r) => r.cliente.nome === nome)!
    expect(byName('Silvia').cliente.discipline).toEqual(['fisio', 'posturale', 'yoga'])
    expect(byName('Roberto').cliente.telefono).toBeUndefined()
    expect(byName('Marco').cliente.telefono).toBe('+393000000206')
    expect(byName('Anna').cliente).toMatchObject({ telefono: '+393000000203', dataNascita: '1990-04-12' })
    expect(byName('Elisa').avvisi).toHaveLength(1)
    for (const row of result.daImportare) expect(row.cliente.telefono ?? '').toMatch(/^(\+39300\d{7})?$/)
  })
})
