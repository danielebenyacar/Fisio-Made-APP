import { useEffect, useState } from 'react'
import { useDataSource } from '../../app/dataSource'
import { Button } from '../../components/Button'
import { ButtonLink } from '../../components/ButtonLink'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { UploadIcon } from '../../components/icons'
import { PageTitle } from '../../components/PageTitle'
import type { DataSource } from '../../data'

type MockSource = Extract<DataSource, { mode: 'mock' }>

function DemoDataCard({ source }: { source: MockSource }) {
  const { repository, resetDemoData } = source
  const [activeCount, setActiveCount] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    repository.listClienti().then((clienti) => {
      if (!cancelled) setActiveCount(clienti.filter((c) => !c.archiviato).length)
    })
    return () => {
      cancelled = true
    }
  }, [repository, version])

  async function handleReset() {
    setConfirming(false)
    await resetDemoData()
    setVersion((v) => v + 1)
    setResetDone(true)
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">Dati di prova</h2>
      <p className="mt-2 text-brand-700">
        Stai usando la versione dimostrativa
        {activeCount !== null && <> con {activeCount} clienti finti</>}. Puoi modificare tutto
        liberamente: le modifiche restano salvate solo su questo telefono.
      </p>
      <div className="mt-5">
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          Reimposta dati demo
        </Button>
      </div>
      {resetDone && (
        <p role="status" className="mt-3 text-center font-semibold text-brand-800">
          ✓ Dati demo reimpostati
        </p>
      )}
      <ConfirmSheet
        open={confirming}
        title="Reimpostare i dati demo?"
        message="Tutte le modifiche fatte verranno cancellate e torneranno i clienti di prova iniziali."
        confirmLabel="Reimposta"
        onConfirm={handleReset}
        onCancel={() => setConfirming(false)}
      />
    </section>
  )
}

export function AltroPage() {
  const source = useDataSource()
  return (
    <>
      <PageTitle>Altro</PageTitle>
      <div className="mt-6 flex flex-col gap-4">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Listino</h2>
          <p className="mt-2 text-brand-700">
            Pacchetti di sedute e abbonamenti che vendi, con durata e prezzo.
          </p>
          <div className="mt-5">
            <ButtonLink to="/altro/listino" variant="secondary">
              Apri il listino
            </ButtonLink>
          </div>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Importa clienti</h2>
          <p className="mt-2 text-brand-700">
            Aggiungi in un colpo solo i clienti che hai già in un file Excel.
          </p>
          <div className="mt-5">
            <ButtonLink to="/altro/importa" variant="secondary">
              <UploadIcon width={20} height={20} />
              Importa da Excel
            </ButtonLink>
          </div>
        </section>
        {source.mode === 'mock' && <DemoDataCard source={source} />}
      </div>
    </>
  )
}
