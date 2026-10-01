import { DISCIPLINE, type Disciplina } from '../data/types'
import { DISCIPLINA_LABEL, toggleDisciplina } from '../lib/discipline'
import { DISCIPLINA_STYLE } from './disciplinaStyles'
import { CheckIcon } from './icons'

type Props = {
  value: Disciplina[]
  onChange: (value: Disciplina[]) => void
  labelledBy?: string
}

/** One colored button per discipline; any combination can be on. */
export function DisciplinaToggle({ value, onChange, labelledBy }: Props) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="grid grid-cols-3 gap-2">
      {DISCIPLINE.map((d) => {
        const on = value.includes(d)
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(toggleDisciplina(value, d))}
            className={`flex min-h-12 items-center justify-center gap-1 rounded-xl border-2 px-1 text-base font-semibold ${
              on ? DISCIPLINA_STYLE[d].solid : DISCIPLINA_STYLE[d].soft
            }`}
          >
            {on && <CheckIcon width={16} height={16} strokeWidth={3} className="shrink-0" />}
            {DISCIPLINA_LABEL[d]}
          </button>
        )
      })}
    </div>
  )
}
