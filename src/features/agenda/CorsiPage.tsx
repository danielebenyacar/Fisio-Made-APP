import { Link } from 'react-router-dom'
import { useGoBack } from '../../app/useGoBack'
import { BackButton } from '../../components/BackButton'
import { ButtonLink } from '../../components/ButtonLink'
import { DisciplinaPill } from '../../components/DisciplinaPill'
import { DISCIPLINA_STYLE } from '../../components/disciplinaStyles'
import { EmptyState } from '../../components/EmptyState'
import { ChevronRightIcon, PlusIcon } from '../../components/icons'
import { PageTitle } from '../../components/PageTitle'
import { dataOra, GIORNI } from '../../lib/agenda'
import { orario } from '../../lib/appuntamenti'
import { useCorsi } from './useCorsi'

/** Altro → Corsi: the weekly group classes, by day. */
export function CorsiPage() {
  const { corsi, error } = useCorsi()
  const goBack = useGoBack('/altro')

  return (
    <>
      <BackButton label="Indietro" onClick={goBack} />
      <div className="flex items-center justify-between gap-3">
        <PageTitle>Corsi</PageTitle>
        <ButtonLink to="/altro/corsi/nuovo" className="shrink-0">
          <PlusIcon width={20} height={20} strokeWidth={2.5} />
          Nuovo
        </ButtonLink>
      </div>
      <p className="mt-2 text-brand-700">
        I gruppi che si ripetono ogni settimana. Compaiono da soli in agenda: lì segni chi è venuto.
      </p>

      {error && <EmptyState>Non riesco a caricare i corsi. Riprova tra poco.</EmptyState>}
      {corsi && corsi.length === 0 && (
        <div className="mt-6">
          <EmptyState>Nessun corso. Tocca “Nuovo” per aggiungere il primo.</EmptyState>
        </div>
      )}
      {corsi &&
        GIORNI.map((nomeGiorno, i) => {
          const items = corsi.filter((c) => c.giorno === i + 1)
          if (items.length === 0) return null
          return (
            <section key={nomeGiorno} className="mt-6">
              <h2 className="mb-2 text-xl font-bold first-letter:uppercase">{nomeGiorno}</h2>
              <ul className="flex flex-col gap-2">
                {items.map((corso) => (
                  <li key={corso.id}>
                    <Link
                      to={`/altro/corsi/${corso.id}`}
                      className={`flex min-h-16 items-center gap-3 rounded-2xl border-l-4 bg-white px-4 py-3 shadow-sm active:bg-brand-100 ${DISCIPLINA_STYLE[corso.disciplina].accent} ${corso.attivo ? '' : 'opacity-60'}`}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="font-semibold">{corso.nome}</span>
                        <span className="flex flex-wrap items-center gap-2 text-brand-600">
                          {orario(dataOra('2026-01-05', corso.ora), corso.durataMinuti)}
                          <DisciplinaPill disciplina={corso.disciplina} />
                          {!corso.attivo && <span className="font-semibold">Sospeso</span>}
                        </span>
                      </span>
                      <ChevronRightIcon className="shrink-0 text-brand-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
    </>
  )
}
