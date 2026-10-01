import type { Disciplina } from '../data/types'
import { DISCIPLINA_LABEL } from '../lib/discipline'
import { DISCIPLINA_STYLE } from './disciplinaStyles'

export function DisciplinaPill({ disciplina }: { disciplina: Disciplina }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold ${DISCIPLINA_STYLE[disciplina].soft}`}
    >
      {DISCIPLINA_LABEL[disciplina]}
    </span>
  )
}

export function DisciplinaPills({ discipline }: { discipline: Disciplina[] }) {
  if (discipline.length === 0) return null
  return (
    <span className="flex flex-wrap gap-1.5">
      {discipline.map((d) => (
        <DisciplinaPill key={d} disciplina={d} />
      ))}
    </span>
  )
}
