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
  const { repository, resetDemoData, svuotaDemoData } = source
  const [activeCount, setActiveCount] = useState<number | null>(null)
  const [confirming, setConfirming] = useState<'reset' | 'svuota' | null>(null)
  const [done, setDone] = useState<string | null>(null)
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

  async function handleConfirm() {
    const action = confirming
    setConfirming(null)
    if (action === 'reset') await resetDemoData()
    if (action === 'svuota') await svuotaDemoData()
    setVersion((v) => v + 1)
    setDone(action === 'reset' ? '✓ Dati demo reimpostati' : '✓ Demo vuota: puoi partire da zero')
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">Dati di prova</h2>
      <p className="mt-2 text-brand-700">
        Stai usando la versione dimostrativa
        {activeCount === 0 ? ', per ora vuota' : activeCount !== null && <> con {activeCount} clienti</>}. Puoi
        modificare tutto liberamente: le modifiche restano salvate solo su questo telefono.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <Button variant="secondary" onClick={() => setConfirming('svuota')}>
          Inizia da zero
        </Button>
        <Button variant="secondary" onClick={() => setConfirming('reset')}>
          Reimposta dati demo
        </Button>
      </div>
      {done && (
        <p role="status" className="mt-3 text-center font-semibold text-brand-800">
          {done}
        </p>
      )}
      <ConfirmSheet
        open={confirming === 'reset'}
        title="Reimpostare i dati demo?"
        message="Tutte le modifiche fatte verranno cancellate e torneranno i clienti e i corsi di prova iniziali."
        confirmLabel="Reimposta"
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(null)}
      />
      <ConfirmSheet
        open={confirming === 'svuota'}
        title="Partire da zero?"
        message="Spariscono tutti i clienti, i pacchetti, le lezioni, i corsi e gli appuntamenti. Restano solo i prezzi di esempio. Potrai sempre tornare ai dati di prova con “Reimposta dati demo”."
        confirmLabel="Inizia da zero"
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(null)}
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
          <h2 className="text-xl font-bold">Prezzi</h2>
          <p className="mt-2 text-brand-700">
            Pacchetti di sedute e abbonamenti che vendi, con il loro prezzo. I prezzi si vedono e si cambiano
            solo qui.
          </p>
          <div className="mt-5">
            <ButtonLink to="/altro/listino" variant="secondary">
              Apri i prezzi
            </ButtonLink>
          </div>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Corsi settimanali</h2>
          <p className="mt-2 text-brand-700">I gruppi di yoga e posturale con giorno e orario fissi.</p>
          <div className="mt-5">
            <ButtonLink to="/altro/corsi" variant="secondary">
              Apri i corsi
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
