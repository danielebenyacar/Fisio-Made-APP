import { useState } from 'react'
import { useRepository } from '../../app/dataSource'
import { Button } from '../../components/Button'
import { ClientePicker } from '../../components/ClientePicker'
import { EmptyState } from '../../components/EmptyState'
import type { Corso } from '../../data'
import { useClienti } from '../clienti/useClienti'
import { useDisciplineAutomatiche } from '../clienti/useDisciplineAutomatiche'

/** Enrolled clients of a class, saved as soon as they change. */
export function IscrittiCorso({ corso }: { corso: Corso }) {
  const repository = useRepository()
  const { aggiungi, rimuoviSeNonUsata } = useDisciplineAutomatiche()
  const { clienti } = useClienti()
  const [iscritti, setIscritti] = useState(corso.iscritti)
  const [adding, setAdding] = useState(false)

  async function save(next: string[], cambiato: { clienteId: string; iscritto: boolean }) {
    setIscritti(next)
    await repository.updateCorso(corso.id, { iscritti: next })
    // Joining a group makes the client do its discipline; leaving the last one undoes it.
    if (cambiato.iscritto) await aggiungi(cambiato.clienteId, corso.disciplina)
    else await rimuoviSeNonUsata(cambiato.clienteId, corso.disciplina)
  }

  if (!clienti) return null
  const enrolled = iscritti.map((id) => clienti.find((c) => c.id === id)).filter((c) => c !== undefined)
  // Everyone can join; clients already doing this discipline come first.
  const candidates = clienti.filter((c) => !iscritti.includes(c.id))
  const ordered = [
    ...candidates.filter((c) => c.discipline.includes(corso.disciplina)),
    ...candidates.filter((c) => !c.discipline.includes(corso.disciplina)),
  ]

  return (
    <section className="mt-8 border-t border-brand-200 pt-6">
      <h2 className="mb-1 text-xl font-bold">Iscritti fissi ({enrolled.length})</h2>
      <p className="mb-3 text-brand-600">
        Chi viene di solito a questo gruppo: in agenda li trovi già elencati. Chi cambia gruppo una settimana si
        aggiunge dal corso di quel giorno.
      </p>
      {enrolled.length === 0 ? (
        <EmptyState>Nessun iscritto.</EmptyState>
      ) : (
        <ul className="divide-y divide-brand-200 overflow-hidden rounded-2xl bg-white shadow-sm">
          {enrolled.map((c) => (
            <li key={c.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
              <span className={`flex-1 text-lg ${c.archiviato ? 'text-brand-500' : ''}`}>
                {c.nome} <strong className="font-semibold">{c.cognome}</strong>
                {c.archiviato && ' (archiviato)'}
              </span>
              <button
                type="button"
                onClick={() => save(iscritti.filter((id) => id !== c.id), { clienteId: c.id, iscritto: false })}
                className="min-h-12 rounded-xl px-2 font-semibold text-danger-700 underline"
              >
                Togli
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        {adding ? (
          <div className="flex flex-col gap-3">
            <ClientePicker
              clienti={ordered}
              autoFocus
              placeholder="Chi aggiungere al gruppo?"
              onSelect={(c) => {
                void save([...iscritti, c.id], { clienteId: c.id, iscritto: true })
                setAdding(false)
              }}
            />
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Chiudi
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            Aggiungi iscritto
          </Button>
        )}
      </div>
    </section>
  )
}
