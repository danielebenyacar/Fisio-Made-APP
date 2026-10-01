import { format } from 'date-fns'
import { useEffect, useId, useState } from 'react'
import { useRepository } from '../../app/dataSource'
import { Button } from '../../components/Button'
import { ButtonLink } from '../../components/ButtonLink'
import { ClientePicker } from '../../components/ClientePicker'
import { DisciplinaPill, DisciplinaPills } from '../../components/DisciplinaPill'
import { DISCIPLINA_STYLE } from '../../components/disciplinaStyles'
import { PageTitle } from '../../components/PageTitle'
import { TONE_STYLE } from '../../components/toneStyles'
import type { Cliente, Corso, Disciplina, Lezione, Pacchetto } from '../../data'
import { corsoPiuVicino, occorrenzeCorsi } from '../../lib/agenda'
import { fullName } from '../../lib/clienti'
import { DISCIPLINA_LABEL, sortDiscipline } from '../../lib/discipline'
import { descriviAvanzamento } from '../../lib/pacchettoLabel'
import { pacchettoPerLezione, statoPacchetto } from '../../lib/packages'
import { useRegistraLezione } from './useRegistraLezione'

type Dati = { clienti: Cliente[]; pacchetti: Pacchetto[]; lezioni: Lezione[]; corsi: Corso[] }

/** The "+" flow: pick a client, then one tap on the discipline. */
export function SegnaLezionePage() {
  const repository = useRepository()
  const [dati, setDati] = useState<Dati | null>(null)
  const [version, setVersion] = useState(0)
  const [cliente, setCliente] = useState<Cliente | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([repository.listClienti(), repository.listPacchetti(), repository.listLezioni(), repository.listCorsi()]).then(
      ([clienti, pacchetti, lezioni, corsi]) => !cancelled && setDati({ clienti, pacchetti, lezioni, corsi }),
    )
    return () => {
      cancelled = true
    }
  }, [repository, version])

  return (
    <>
      <PageTitle>Segna lezione</PageTitle>
      <div className="mt-4">
        {!dati ? null : cliente ? (
          <Conferma
            key={`${cliente.id}-${version}`}
            cliente={cliente}
            dati={dati}
            onChange={() => setCliente(null)}
            onDone={() => {
              setCliente(null)
              setVersion((v) => v + 1)
            }}
          />
        ) : (
          <ClientePicker
            clienti={dati.clienti}
            onSelect={setCliente}
            placeholder="Chi ha fatto lezione?"
            dettaglio={(c) => <DisciplinaPills discipline={c.discipline} />}
          />
        )}
      </div>
    </>
  )
}

type ConfermaProps = { cliente: Cliente; dati: Dati; onChange: () => void; onDone: () => void }

function Conferma({ cliente, dati, onChange, onDone }: ConfermaProps) {
  const { registra } = useRegistraLezione()
  const [now] = useState(() => new Date())
  const pacchetti = dati.pacchetti.filter((p) => p.clienteId === cliente.id)
  const lezioni = dati.lezioni.filter((l) => l.clienteId === cliente.id)
  const discipline = sortDiscipline([...cliente.discipline, ...pacchetti.map((p) => p.disciplina)])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 py-2 shadow-sm">
        <span className="flex-1 text-xl font-semibold">{fullName(cliente)}</span>
        <button type="button" onClick={onChange} className="min-h-12 px-2 font-semibold underline">
          Cambia
        </button>
      </div>

      {discipline.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-brand-300 p-5 text-center">
          <p className="text-brand-700">{cliente.nome} non ha ancora un pacchetto.</p>
          <div className="mt-4">
            <ButtonLink to={`/clienti/${cliente.id}/pacchetti/nuovo`}>Nuovo pacchetto</ButtonLink>
          </div>
        </div>
      )}

      {discipline.map((disciplina) => (
        <DisciplinaRiga
          key={disciplina}
          disciplina={disciplina}
          cliente={cliente}
          pacchetti={pacchetti}
          lezioni={lezioni}
          corsi={dati.corsi}
          now={now}
          onRegistra={async (corsoId, forza) => {
            const esito = await registra({ cliente, disciplina, quando: new Date(), corsoId, forzaSettimana: forza })
            if (esito.tipo === 'ok') onDone()
          }}
        />
      ))}
    </div>
  )
}

type RigaProps = {
  disciplina: Disciplina
  cliente: Cliente
  pacchetti: Pacchetto[]
  lezioni: Lezione[]
  corsi: Corso[]
  now: Date
  onRegistra: (corsoId: string | undefined, forza: boolean) => Promise<void>
}

function DisciplinaRiga({ disciplina, cliente, pacchetti, lezioni, corsi, now, onRegistra }: RigaProps) {
  const selectId = useId()
  const scelta = pacchettoPerLezione(pacchetti, lezioni, disciplina, now)
  const oggi = occorrenzeCorsi(corsi.filter((c) => c.disciplina === disciplina), [now])
  const [corsoId, setCorsoId] = useState(
    () =>
      oggi.find((o) => o.corso.iscritti.includes(cliente.id))?.corso.id ??
      corsoPiuVicino(corsi, disciplina, now)?.corso.id ??
      '',
  )
  const [busy, setBusy] = useState(false)
  const label = DISCIPLINA_LABEL[disciplina]

  const go = async (forza: boolean) => {
    setBusy(true)
    await onRegistra(corsoId || undefined, forza)
    setBusy(false)
  }

  return (
    <section className={`rounded-2xl border-l-4 bg-white p-4 shadow-sm ${DISCIPLINA_STYLE[disciplina].accent}`}>
      <DisciplinaPill disciplina={disciplina} />
      {scelta.tipo === 'nessuno' ? (
        <>
          <p className={`mt-3 inline-block rounded-full border px-2.5 py-0.5 font-semibold ${TONE_STYLE.problema}`}>
            Nessun pacchetto valido
          </p>
          <div className="mt-3">
            <ButtonLink to={`/clienti/${cliente.id}/pacchetti/nuovo`} variant="secondary">
              Nuovo pacchetto
            </ButtonLink>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 font-semibold">{scelta.pacchetto.nome}</p>
          <p className="text-brand-600">{descriviAvanzamento(scelta.pacchetto, statoPacchetto(scelta.pacchetto, lezioni, now))}</p>
          {scelta.tipo === 'settimana-gia-usata' && (
            <p className={`mt-3 inline-block rounded-full border px-2.5 py-0.5 font-semibold ${TONE_STYLE.avviso}`}>
              Lezione della settimana già fatta
            </p>
          )}
          {oggi.length > 0 && (
            <div className="mt-3">
              <label htmlFor={selectId} className="mb-1 block font-semibold">
                Corso
              </label>
              <select
                id={selectId}
                value={corsoId}
                onChange={(e) => setCorsoId(e.target.value)}
                className="block min-h-12 w-full rounded-xl border border-brand-300 bg-white px-3 text-base"
              >
                {oggi.map((o) => (
                  <option key={o.corso.id} value={o.corso.id}>
                    {o.corso.nome} · {format(o.inizio, 'HH:mm')}
                    {o.corso.iscritti.includes(cliente.id) ? ' (il suo gruppo)' : ''}
                  </option>
                ))}
                <option value="">Nessun corso (lezione a parte)</option>
              </select>
            </div>
          )}
          <div className="mt-3">
            <Button
              variant={scelta.tipo === 'ok' ? 'primary' : 'secondary'}
              disabled={busy}
              onClick={() => go(scelta.tipo === 'settimana-gia-usata')}
            >
              {scelta.tipo === 'ok' ? `Segna lezione di ${label}` : 'Segna comunque'}
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
