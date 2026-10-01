import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useRepository } from '../../app/dataSource'
import { useGoBack } from '../../app/useGoBack'
import { BackButton } from '../../components/BackButton'
import { Button } from '../../components/Button'
import { ButtonLink } from '../../components/ButtonLink'
import { Card } from '../../components/Card'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { DisciplinaPill } from '../../components/DisciplinaPill'
import { EmptyState } from '../../components/EmptyState'
import { MessageIcon } from '../../components/icons'
import { PageTitle } from '../../components/PageTitle'
import { Sheet } from '../../components/Sheet'
import { TONE_STYLE } from '../../components/toneStyles'
import type { Appuntamento, Cliente } from '../../data'
import { orario, statoAppuntamentoLabel } from '../../lib/appuntamenti'
import { fullName } from '../../lib/clienti'
import { formatDayHeading } from '../../lib/dates'
import { messaggioPromemoria } from '../../lib/messaggi'
import { linkWhatsApp } from '../../lib/whatsapp'
import { useDisciplineAutomatiche } from '../clienti/useDisciplineAutomatiche'
import { useRegistraLezione } from '../lezioni/useRegistraLezione'

function useAppuntamento(id: string | undefined) {
  const repository = useRepository()
  const [state, setState] = useState<{ id?: string; appuntamento?: Appuntamento | null; cliente?: Cliente | null }>({})
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    repository.getAppuntamento(id).then(async (appuntamento) => {
      const cliente = appuntamento ? await repository.getCliente(appuntamento.clienteId) : null
      if (!cancelled) setState({ id, appuntamento, cliente })
    })
    return () => {
      cancelled = true
    }
  }, [repository, id, version])

  const current = state.id === id ? state : {}
  return { ...current, reload: () => setVersion((v) => v + 1) }
}

/** /agenda/appuntamenti/:appId */
export function AppuntamentoPage() {
  const { appId } = useParams()
  const { appuntamento, cliente, reload } = useAppuntamento(appId)
  const goBack = useGoBack('/agenda')

  if (appuntamento === undefined) return null
  if (!appuntamento || !cliente) {
    return (
      <>
        <BackButton label="Agenda" onClick={goBack} />
        <EmptyState>Appuntamento non trovato.</EmptyState>
      </>
    )
  }
  return <Dettaglio appuntamento={appuntamento} cliente={cliente} reload={reload} goBack={goBack} />
}

type DettaglioProps = { appuntamento: Appuntamento; cliente: Cliente; reload: () => void; goBack: () => void }

function Dettaglio({ appuntamento, cliente, reload, goBack }: DettaglioProps) {
  const repository = useRepository()
  const { registra } = useRegistraLezione()
  const { aggiungi, rimuoviSeNonUsata } = useDisciplineAutomatiche()
  const [now] = useState(() => new Date())
  const [confirm, setConfirm] = useState<'annulla' | 'riapri' | null>(null)
  const [senzaPacchetto, setSenzaPacchetto] = useState(false)
  const inizio = new Date(appuntamento.inizio)
  const label = statoAppuntamentoLabel(appuntamento, now)
  const cosa = appuntamento.valutazione ? 'Valutazione' : 'Seduta'

  const torna = async () => {
    await repository.updateAppuntamento(appuntamento.id, { stato: 'programmato', lezioneId: undefined })
  }

  async function segna(stato: 'fatta' | 'assente') {
    const esito = await registra(
      {
        cliente,
        disciplina: appuntamento.disciplina,
        quando: inizio,
        stato,
        appuntamentoId: appuntamento.id,
        forzaSettimana: true,
      },
      { onUndo: torna, onUndone: reload },
    )
    if (esito.tipo === 'ok') {
      await repository.updateAppuntamento(appuntamento.id, {
        stato: stato === 'fatta' ? 'fatto' : 'assente',
        lezioneId: esito.lezione.id,
      })
      reload()
    } else if (stato === 'assente') {
      // No package to attach the absence to: keep it on the appointment only.
      await repository.updateAppuntamento(appuntamento.id, { stato: 'assente' })
      reload()
    } else {
      setSenzaPacchetto(true)
    }
  }

  async function riapri() {
    setConfirm(null)
    if (appuntamento.lezioneId) await repository.deleteLezione(appuntamento.lezioneId)
    await torna()
    reload()
  }

  async function ripristina() {
    await torna()
    await aggiungi(cliente.id, appuntamento.disciplina)
    reload()
  }

  async function annulla() {
    setConfirm(null)
    await repository.updateAppuntamento(appuntamento.id, { stato: 'annullato' })
    // A cancelled first booking leaves the client without that discipline.
    await rimuoviSeNonUsata(cliente.id, appuntamento.disciplina)
    reload()
  }

  const promemoria = cliente.telefono
    ? linkWhatsApp(cliente.telefono, messaggioPromemoria(cliente.nome, inizio, now))
    : undefined

  return (
    <>
      <BackButton label="Indietro" onClick={goBack} />
      <PageTitle>
        <Link to={`/clienti/${cliente.id}`} className="underline decoration-2 underline-offset-4">
          {fullName(cliente)}
        </Link>
      </PageTitle>
      <p className="mt-1 text-lg first-letter:uppercase">
        {formatDayHeading(inizio)} · {orario(inizio, appuntamento.durataMinuti)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <DisciplinaPill disciplina={appuntamento.disciplina} />
        <span className="rounded-full border border-brand-300 bg-white px-2.5 py-0.5 text-sm font-semibold">{cosa}</span>
        {label && (
          <span className={`rounded-full border px-2.5 py-0.5 text-sm font-semibold ${TONE_STYLE[label.tono]}`}>
            {label.testo}
          </span>
        )}
      </div>
      {appuntamento.note && (
        <Card className="mt-4">
          <p className="whitespace-pre-line">{appuntamento.note}</p>
        </Card>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {appuntamento.stato === 'programmato' && (
          <>
            <Button onClick={() => segna('fatta')}>{cosa} fatta</Button>
            <Button variant="secondary" onClick={() => segna('assente')}>
              Assente
            </Button>
            <ButtonLink to={`/agenda/appuntamenti/${appuntamento.id}/modifica`} variant="secondary">
              Sposta o modifica
            </ButtonLink>
            {promemoria ? (
              <a
                href={promemoria}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-posturale-600 bg-white font-semibold text-posturale-800"
              >
                <MessageIcon width={20} height={20} />
                Manda promemoria su WhatsApp
              </a>
            ) : (
              <p className="text-center text-brand-600">Nessun numero di telefono: promemoria WhatsApp non disponibile.</p>
            )}
            <Button variant="secondary" onClick={() => setConfirm('annulla')}>
              Annulla appuntamento
            </Button>
          </>
        )}
        {(appuntamento.stato === 'fatto' || appuntamento.stato === 'assente') && (
          <Button variant="secondary" onClick={() => setConfirm('riapri')}>
            Rimetti da segnare
          </Button>
        )}
        {appuntamento.stato === 'annullato' && (
          <Button variant="secondary" onClick={ripristina}>
            Ripristina appuntamento
          </Button>
        )}
      </div>

      <ConfirmSheet
        open={confirm === 'annulla'}
        title="Annullare l’appuntamento?"
        message="Resta in agenda barrato. Potrai ripristinarlo."
        confirmLabel="Annulla appuntamento"
        onConfirm={annulla}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmSheet
        open={confirm === 'riapri'}
        title="Rimettere da segnare?"
        message="La lezione registrata viene cancellata e la seduta torna disponibile nel pacchetto."
        confirmLabel="Rimetti da segnare"
        onConfirm={riapri}
        onCancel={() => setConfirm(null)}
      />
      <Sheet open={senzaPacchetto} onClose={() => setSenzaPacchetto(false)} labelledBy="senza-pacchetto">
        <h2 id="senza-pacchetto" className="text-xl font-bold">
          Nessun pacchetto con sedute
        </h2>
        <p className="mt-2 text-brand-700">
          {cliente.nome} non ha sedute disponibili per questa data.{' '}
          {appuntamento.valutazione
            ? 'Crea prima il pacchetto “Valutazione posturale” dal listino.'
            : 'Crea prima un nuovo pacchetto.'}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <ButtonLink to={`/clienti/${cliente.id}/pacchetti/nuovo`}>Nuovo pacchetto</ButtonLink>
          <Button variant="secondary" onClick={() => setSenzaPacchetto(false)}>
            Chiudi
          </Button>
        </div>
      </Sheet>
    </>
  )
}
