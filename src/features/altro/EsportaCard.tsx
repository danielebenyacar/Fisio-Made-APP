import { useState } from 'react'
import { useRepository } from '../../app/dataSource'
import { Button } from '../../components/Button'
import { DownloadIcon } from '../../components/icons'
import { fogliEsportazione, nomeFileEsportazione, type Foglio } from '../../lib/esporta'

/** Column widths from the longest text in each column, so the file is readable at once. */
function larghezze(foglio: Foglio) {
  return foglio.righe[0].map((_, col) => ({
    width: Math.min(40, Math.max(8, ...foglio.righe.map((r) => String(r[col] ?? '').length + 2))),
  }))
}

/** Altro → "Esporta i dati": one Excel file with everything, as a copy to keep. */
export function EsportaCard() {
  const repository = useRepository()
  const [stato, setStato] = useState<'pronto' | 'in-corso' | 'fatto' | 'errore'>('pronto')

  async function esporta() {
    setStato('in-corso')
    try {
      const [clienti, tipiPacchetto, pacchetti, lezioni, corsi, appuntamenti] = await Promise.all([
        repository.listClienti(),
        repository.listTipiPacchetto(),
        repository.listPacchetti(),
        repository.listLezioni(),
        repository.listCorsi(),
        repository.listAppuntamenti(),
      ])
      const now = new Date()
      const fogli = fogliEsportazione({ clienti, tipiPacchetto, pacchetti, lezioni, corsi, appuntamenti }, now)
      // Loaded only when needed: most days nobody exports.
      const { default: writeExcelFile } = await import('write-excel-file/browser')
      await writeExcelFile(
        fogli.map((foglio) => ({
          sheet: foglio.nome,
          data: foglio.righe.map((riga, i) =>
            i === 0 ? riga.map((value) => ({ value: value ?? '', fontWeight: 'bold' as const })) : riga,
          ),
          columns: larghezze(foglio),
          stickyRowsCount: 1,
        })),
      ).toFile(nomeFileEsportazione(now))
      setStato('fatto')
    } catch {
      setStato('errore')
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">Esporta i dati</h2>
      <p className="mt-2 text-brand-700">
        Un file Excel con clienti, pacchetti, lezioni, appuntamenti, corsi e prezzi. Tienilo come copia di
        sicurezza: il foglio Clienti si può anche reimportare.
      </p>
      <div className="mt-5">
        <Button variant="secondary" onClick={esporta} disabled={stato === 'in-corso'}>
          <DownloadIcon width={20} height={20} />
          {stato === 'in-corso' ? 'Preparo il file…' : 'Scarica tutto in Excel'}
        </Button>
      </div>
      {stato === 'fatto' && (
        <p role="status" className="mt-3 text-center font-semibold text-brand-800">
          ✓ File scaricato
        </p>
      )}
      {stato === 'errore' && (
        <p role="alert" className="mt-3 text-center font-semibold text-danger-700">
          Non sono riuscito a creare il file. Riprova.
        </p>
      )}
    </section>
  )
}
