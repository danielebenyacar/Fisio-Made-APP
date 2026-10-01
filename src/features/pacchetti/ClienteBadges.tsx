import { DisciplinaPill } from '../../components/DisciplinaPill'
import { DISCIPLINA_STYLE } from '../../components/disciplinaStyles'
import { TONE_STYLE } from '../../components/toneStyles'
import type { Disciplina } from '../../data'
import { DISCIPLINA_LABEL, sortDiscipline } from '../../lib/discipline'
import { badgeBreve, etichettaStato } from '../../lib/pacchettoLabel'
import type { PacchettoInEvidenza } from '../../lib/packages'

type Props = {
  discipline: Disciplina[]
  inEvidenza: Map<Disciplina, PacchettoInEvidenza>
  daPagare: boolean
}

/** One pill per discipline with the state of its package ("Fisio 8/10", "Yoga al 31 ott"). */
export function ClienteBadges({ discipline, inEvidenza, daPagare }: Props) {
  const all = sortDiscipline([...discipline, ...inEvidenza.keys()])
  if (all.length === 0 && !daPagare) return null
  return (
    <span className="flex flex-wrap gap-1.5">
      {all.map((d) => {
        const current = inEvidenza.get(d)
        if (!current) return <DisciplinaPill key={d} disciplina={d} />
        const etichetta = etichettaStato(current.pacchetto, current.stato, current.rinnovato)
        const warn = etichetta && (etichetta.tono === 'avviso' || etichetta.tono === 'problema') ? etichetta : null
        return (
          <span
            key={d}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${
              warn ? TONE_STYLE[warn.tono] : DISCIPLINA_STYLE[d].soft
            }`}
          >
            <span className={`size-2 rounded-full ${DISCIPLINA_STYLE[d].dot}`} aria-hidden="true" />
            {DISCIPLINA_LABEL[d]} {badgeBreve(current.pacchetto, current.stato)}
            {warn && <span className="sr-only">: {warn.testo}</span>}
          </span>
        )
      })}
      {daPagare && (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold ${TONE_STYLE.problema}`}>
          Da pagare
        </span>
      )}
    </span>
  )
}
