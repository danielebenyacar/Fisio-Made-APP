import { useRef, useState, type ReactNode } from 'react'
import { useRepository } from '../../app/dataSource'
import { useGoBack } from '../../app/useGoBack'
import { BackButton } from '../../components/BackButton'
import { Button } from '../../components/Button'
import { ButtonLink } from '../../components/ButtonLink'
import { DisciplinaPills } from '../../components/DisciplinaPill'
import { AlertIcon, CheckIcon, UploadIcon } from '../../components/icons'
import { PageTitle } from '../../components/PageTitle'
import { fullName } from '../../lib/clienti'
import { analyzeImport, type ImportAnalysis, type ImportRow } from '../../lib/importClienti'
import { formatPhone } from '../../lib/whatsapp'
import { readSpreadsheet } from './readSpreadsheet'

type Analysis = Extract<ImportAnalysis, { ok: true }>

type State =
  | { step: 'scegli' }
  | { step: 'lettura' }
  | { step: 'errore'; message: string }
  | { step: 'anteprima'; fileName: string; analysis: Analysis }
  | { step: 'importazione' }
  | { step: 'fatto'; imported: number; failed: number }

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function Card({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}

export function ImportaClientiPage() {
  const repository = useRepository()
  const goBack = useGoBack('/altro')
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<State>({ step: 'scegli' })

  async function handleFile(file: File) {
    setState({ step: 'lettura' })
    try {
      const rows = await readSpreadsheet(file)
      const analysis = analyzeImport(rows, await repository.listClienti(), new Date())
      setState(
        analysis.ok
          ? { step: 'anteprima', fileName: file.name, analysis }
          : { step: 'errore', message: analysis.errore },
      )
    } catch {
      setState({
        step: 'errore',
        message: 'Non riesco a leggere il file. Controlla che sia un file Excel in formato .xlsx.',
      })
    }
  }

  async function handleImport(rows: ImportRow[]) {
    setState({ step: 'importazione' })
    let imported = 0
    for (const row of rows) {
      try {
        await repository.createCliente(row.cliente)
        imported += 1
      } catch {
        // counted below as failed
      }
    }
    setState({ step: 'fatto', imported, failed: rows.length - imported })
  }

  const chooseFile = () => inputRef.current?.click()

  return (
    <>
      <BackButton label="Altro" onClick={goBack} />
      <PageTitle>Importa clienti</PageTitle>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        aria-label="File Excel"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = '' // lets the same file be chosen again
          if (file) handleFile(file)
        }}
      />

      <div className="mt-5 flex flex-col gap-4">
        {(state.step === 'scegli' || state.step === 'errore' || state.step === 'lettura') && (
          <Card title="Da un file Excel">
            <p className="text-brand-700">
              Nella prima riga del file servono i titoli delle colonne. Obbligatorie:{' '}
              <strong>Nome</strong> e <strong>Cognome</strong>. Se ci sono, vengono lette anche:
              Telefono, Email, Data di nascita, Discipline, Note.
            </p>
            <p className="mt-2 text-brand-700">
              Prima di salvare vedrai l’anteprima: non viene aggiunto nulla finché non confermi.
            </p>
            {state.step === 'errore' && (
              <p role="alert" className="mt-4 flex gap-2 font-semibold text-danger-700">
                <AlertIcon className="mt-0.5 shrink-0" width={20} height={20} />
                {state.message}
              </p>
            )}
            <div className="mt-5 flex flex-col gap-3">
              <Button onClick={chooseFile} disabled={state.step === 'lettura'}>
                <UploadIcon width={20} height={20} />
                {state.step === 'lettura' ? 'Lettura in corso…' : 'Scegli file Excel'}
              </Button>
              <a
                href="/esempio-clienti.xlsx"
                download
                className="flex min-h-12 items-center justify-center font-semibold text-brand-800 underline"
              >
                Scarica un file di esempio
              </a>
            </div>
          </Card>
        )}

        {state.step === 'anteprima' && (
          <Preview
            fileName={state.fileName}
            analysis={state.analysis}
            onImport={() => handleImport(state.analysis.daImportare)}
            onChooseAnother={chooseFile}
          />
        )}

        {state.step === 'importazione' && (
          <p role="status" className="text-center font-semibold">
            Importazione in corso…
          </p>
        )}

        {state.step === 'fatto' && (
          <Card
            title={
              <span className="flex items-center gap-2">
                <CheckIcon className="text-posturale-700" strokeWidth={3} />
                {plural(state.imported, 'cliente importato', 'clienti importati')}
              </span>
            }
          >
            {state.failed > 0 && (
              <p role="alert" className="font-semibold text-danger-700">
                {plural(state.failed, 'cliente non è stato salvato', 'clienti non sono stati salvati')}
                . Riprova a importare lo stesso file: chi è già presente verrà saltato.
              </p>
            )}
            <div className="mt-4 flex flex-col gap-3">
              <ButtonLink to="/clienti">Vai ai clienti</ButtonLink>
              <Button variant="secondary" onClick={() => setState({ step: 'scegli' })}>
                Importa un altro file
              </Button>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}

type PreviewProps = {
  fileName: string
  analysis: Analysis
  onImport: () => void
  onChooseAnother: () => void
}

function Preview({ fileName, analysis, onImport, onChooseAnother }: PreviewProps) {
  const { daImportare, giaPresenti, scartate, colonneIgnorate } = analysis
  return (
    <>
      <p className="break-all text-brand-600">File: {fileName}</p>

      <Card title={plural(daImportare.length, 'cliente da importare', 'clienti da importare')}>
        {daImportare.length === 0 ? (
          <p className="text-brand-700">Nel file non ci sono clienti nuovi.</p>
        ) : (
          <ul className="divide-y divide-brand-200">
            {daImportare.map(({ riga, cliente, avvisi }) => (
              <li key={riga} className="flex flex-col gap-1 py-3">
                <span className="text-lg font-semibold">{fullName(cliente)}</span>
                <DisciplinaPills discipline={cliente.discipline} />
                <span className="text-brand-600">
                  {cliente.telefono ? formatPhone(cliente.telefono) : 'Senza telefono'}
                </span>
                {avvisi.map((avviso) => (
                  <span key={avviso} className="flex gap-1.5 text-danger-700">
                    <AlertIcon className="mt-0.5 shrink-0" width={18} height={18} />
                    Riga {riga}: {avviso}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {giaPresenti.length > 0 && (
        <Card title={`${plural(giaPresenti.length, 'già presente', 'già presenti')} (saltati)`}>
          <ul className="flex flex-col gap-1 text-brand-700">
            {giaPresenti.map(({ riga, nome }) => (
              <li key={riga}>
                Riga {riga}: {nome}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {scartate.length > 0 && (
        <Card title={plural(scartate.length, 'riga non importabile', 'righe non importabili')}>
          <ul className="flex flex-col gap-1 text-brand-700">
            {scartate.map(({ riga, motivo }) => (
              <li key={riga}>
                Riga {riga}: {motivo}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {colonneIgnorate.length > 0 && (
        <p className="text-brand-600">Colonne non usate: {colonneIgnorate.join(', ')}.</p>
      )}

      <div className="flex flex-col gap-3">
        {daImportare.length > 0 && (
          <Button onClick={onImport}>
            Importa {plural(daImportare.length, 'cliente', 'clienti')}
          </Button>
        )}
        <Button variant="secondary" onClick={onChooseAnother}>
          Scegli un altro file
        </Button>
      </div>
    </>
  )
}
