import { describe, expect, it } from 'vitest'
import { createSeed } from '../data/mock/seed'
import { fogliEsportazione, nomeFileEsportazione } from './esporta'
import { analyzeImport, type Cell } from './importClienti'

const NOW = new Date(2026, 9, 1, 11, 0)
const dati = createSeed(NOW)
const fogli = fogliEsportazione(dati, NOW)
const foglio = (nome: string) => fogli.find((f) => f.nome === nome)!

describe('fogliEsportazione', () => {
  it('has one sheet per kind of data, with a title row and one row per item', () => {
    expect(fogli.map((f) => f.nome)).toEqual(['Clienti', 'Pacchetti', 'Lezioni', 'Appuntamenti', 'Corsi', 'Prezzi'])
    expect(foglio('Clienti').righe).toHaveLength(dati.clienti.length + 1)
    expect(foglio('Pacchetti').righe).toHaveLength(dati.pacchetti.length + 1)
    expect(foglio('Lezioni').righe).toHaveLength(dati.lezioni.length + 1)
    expect(foglio('Appuntamenti').righe).toHaveLength(dati.appuntamenti.length + 1)
    expect(foglio('Corsi').righe).toHaveLength(dati.corsi.length + 1)
    expect(foglio('Prezzi').righe).toHaveLength(dati.tipiPacchetto.length + 1)
    for (const f of fogli) for (const riga of f.righe) expect(riga).toHaveLength(f.righe[0].length)
  })

  it('writes readable values: names, Italian dates, Sì/No', () => {
    const [, ...righe] = foglio('Clienti').righe
    const giulia = righe.find((r) => r[0] === 'Giulia')!
    expect(giulia.slice(0, 3)).toEqual(['Giulia', 'Bianchi', '+39 300 000 0101'])
    expect(giulia[4]).toMatch(/^\d\d\/\d\d\/\d{4}$/)
    expect(giulia[5]).toBe('Fisio')
    expect(righe.find((r) => r[0] === 'Martina')!.at(-1)).toBe('Sì')

    const pacchetto = foglio('Pacchetti').righe.find((r) => r[0] === 'Giulia Bianchi')!
    expect(pacchetto.slice(1, 4)).toEqual(['10 sedute fisio', 'Fisio', 'Sedute'])
    expect(pacchetto.slice(6, 10)).toEqual([10, 10, 0, 'Sì'])
  })

  it('counts a skipped week kept valid among the lessons left', () => {
    const sara = foglio('Pacchetti').righe.find((r) => r[0] === 'Sara Greco')!
    expect(sara[8]).toBeGreaterThan(0)
  })

  it('exports clients in a form the import reads back', () => {
    const result = analyzeImport(foglio('Clienti').righe as Cell[][], [], NOW)
    if (!result.ok) throw new Error(result.errore)
    expect(result.daImportare).toHaveLength(dati.clienti.length)
    expect(result.colonneIgnorate).toEqual(['Gruppo fisso', 'Archiviato'])
    const back = result.daImportare.find((r) => r.cliente.nome === 'Giulia')!.cliente
    const giulia = dati.clienti.find((c) => c.nome === 'Giulia')!
    expect(back).toMatchObject({ telefono: giulia.telefono, dataNascita: giulia.dataNascita, discipline: giulia.discipline })
  })

  it('names the file with the date', () => {
    expect(nomeFileEsportazione(NOW)).toBe('fisiomade-dati-2026-10-01.xlsx')
  })
})
