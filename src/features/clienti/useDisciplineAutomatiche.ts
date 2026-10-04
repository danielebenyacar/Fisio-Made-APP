import { useRepository } from '../../app/dataSource'
import type { Disciplina } from '../../data'
import { disciplinaInUso, sortDiscipline } from '../../lib/discipline'

/**
 * Keeps a client's disciplines in line with what they do: added when they join
 * a group, book a session or buy a package; removed when the last of those goes.
 */
export function useDisciplineAutomatiche() {
  const repository = useRepository()

  async function aggiungi(clienteId: string, disciplina: Disciplina) {
    const cliente = await repository.getCliente(clienteId)
    if (!cliente || cliente.discipline.includes(disciplina)) return
    await repository.updateCliente(clienteId, { discipline: sortDiscipline([...cliente.discipline, disciplina]) })
  }

  async function rimuoviSeNonUsata(clienteId: string, disciplina: Disciplina) {
    const [cliente, corsi, appuntamenti, pacchetti, lezioni] = await Promise.all([
      repository.getCliente(clienteId),
      repository.listCorsi(),
      repository.listAppuntamenti({ clienteId }),
      repository.listPacchetti({ clienteId }),
      repository.listLezioni({ clienteId }),
    ])
    if (!cliente?.discipline.includes(disciplina)) return
    if (disciplinaInUso(clienteId, disciplina, { corsi, appuntamenti, pacchetti, lezioni })) return
    await repository.updateCliente(clienteId, { discipline: cliente.discipline.filter((d) => d !== disciplina) })
  }

  return { aggiungi, rimuoviSeNonUsata }
}
