import { DISCIPLINE, type Disciplina } from '../data/types'
import { DISCIPLINA_LABEL } from '../lib/discipline'
import { DISCIPLINA_STYLE } from './disciplinaStyles'
import { CheckIcon } from './icons'

type Props = {
  value: Disciplina | ''
  onChange: (value: Disciplina) => void
  labelledBy?: string
}

/** Exactly one discipline, as colored buttons. */
export function DisciplinaPicker({ value, onChange, labelledBy }: Props) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid grid-cols-3 gap-2">
      {DISCIPLINE.map((d) => {
        const on = value === d
        return (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(d)}
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
