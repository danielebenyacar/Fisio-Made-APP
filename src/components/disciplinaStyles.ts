import type { Disciplina } from '../data/types'

/** Full class strings so Tailwind can find them. Colors are tokens from tailwind.config.ts. */
export const DISCIPLINA_STYLE: Record<Disciplina, { solid: string; soft: string }> = {
  fisio: {
    solid: 'border-fisio-600 bg-fisio-600 text-white',
    soft: 'border-fisio-200 bg-fisio-50 text-fisio-800',
  },
  posturale: {
    solid: 'border-posturale-600 bg-posturale-600 text-white',
    soft: 'border-posturale-200 bg-posturale-50 text-posturale-800',
  },
  yoga: {
    solid: 'border-yoga-600 bg-yoga-600 text-white',
    soft: 'border-yoga-200 bg-yoga-50 text-yoga-800',
  },
}
