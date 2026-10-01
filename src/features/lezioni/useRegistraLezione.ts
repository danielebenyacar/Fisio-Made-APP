import { useRepository } from '../../app/dataSource'
import { useToast } from '../../app/toastContext'
import type { Cliente, Disciplina, Lezione, LezioneStato, Pacchetto } from '../../data'
import { DISCIPLINA_LABEL } from '../../lib/discipline'
import { messaggioRiepilogo } from '../../lib/messaggi'
import { pacchettoPerLezione, statoPacchetto } from '../../lib/packages'
import { linkWhatsApp } from '../../lib/whatsapp'

export type RichiestaLezione = {
  cliente: Cliente
  disciplina: Disciplina
  quando: Date
  stato?: LezioneStato
  corsoId?: string
  appuntamentoId?: string
  /** Record even if the subscription's week is already used. */
  forzaSettimana?: boolean
}

export type EsitoLezione =
  | { tipo: 'ok'; lezione: Lezione; pacchetto: Pacchetto }
  | { tipo: 'settimana-gia-usata'; pacchetto: Pacchetto }
  | { tipo: 'nessuno' }

/**
 * Records a lesson on the right package (FIFO, weekly rule), then shows the
 * "Annulla" toast for 5 seconds and, if not undone, offers the WhatsApp summary.
 */
export function useRegistraLezione() {
  const repository = useRepository()
  const showToast = useToast()

  async function choose(req: RichiestaLezione) {
    const [pacchetti, lezioni] = await Promise.all([
      repository.listPacchetti({ clienteId: req.cliente.id }),
      repository.listLezioni({ clienteId: req.cliente.id }),
    ])
    return { scelta: pacchettoPerLezione(pacchetti, lezioni, req.disciplina, req.quando), pacchetti }
  }

  /** Which package would be used, without recording anything. */
  async function anteprima(req: RichiestaLezione) {
    return (await choose(req)).scelta
  }

  async function registra(
    req: RichiestaLezione,
    feedback: { onUndo?: () => Promise<void> | void; onUndone?: () => void } = {},
  ): Promise<EsitoLezione> {
    const { scelta } = await choose(req)
    if (scelta.tipo === 'nessuno') return scelta
    if (scelta.tipo === 'settimana-gia-usata' && !req.forzaSettimana) return scelta

    const stato = req.stato ?? 'fatta'
    const lezione = await repository.createLezione({
      clienteId: req.cliente.id,
      pacchettoId: scelta.pacchetto.id,
      disciplina: req.disciplina,
      data: req.quando.toISOString(),
      stato,
      corsoId: req.corsoId,
      appuntamentoId: req.appuntamentoId,
    })

    const label = stato === 'fatta' ? 'Lezione segnata' : 'Assenza segnata'
    showToast({
      message: `${label}: ${req.cliente.nome} ${req.cliente.cognome} (${DISCIPLINA_LABEL[req.disciplina]})`,
      action: {
        label: 'Annulla',
        onClick: async () => {
          await repository.deleteLezione(lezione.id)
          await feedback.onUndo?.()
          feedback.onUndone?.()
        },
      },
      durationMs: 5000,
      onExpire: () => {
        if (stato === 'fatta') void proponiWhatsApp(req.cliente, scelta.pacchetto)
      },
    })
    return { tipo: 'ok', lezione, pacchetto: scelta.pacchetto }
  }

  async function proponiWhatsApp(cliente: Cliente, pacchetto: Pacchetto) {
    const lezioni = await repository.listLezioni({ clienteId: cliente.id })
    const testo = messaggioRiepilogo(cliente.nome, pacchetto, statoPacchetto(pacchetto, lezioni, new Date()))
    showToast({
      message: `Mandare il riepilogo a ${cliente.nome}?`,
      link: {
        label: 'Invia su WhatsApp',
        href: cliente.telefono ? linkWhatsApp(cliente.telefono, testo) : undefined,
        disabledHint: 'Non c’è un numero di telefono: WhatsApp non disponibile.',
      },
      durationMs: 12000,
    })
  }

  return { registra, anteprima }
}
