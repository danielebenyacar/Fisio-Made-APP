import type { Disciplina } from '../data/types'

type Style = { solid: string; soft: string; accent: string; dot: string }

/** Full class strings so Tailwind can find them. Colors are tokens from tailwind.config.ts. */
export const DISCIPLINA_STYLE: Record<Disciplina, Style> = {
  fisio: {
    solid: 'border-fisio-600 bg-fisio-600 text-white',
    soft: 'border-fisio-200 bg-fisio-50 text-fisio-800',
    accent: 'border-l-fisio-500',
    dot: 'bg-fisio-500',
  },
  posturale: {
    solid: 'border-posturale-600 bg-posturale-600 text-white',
    soft: 'border-posturale-200 bg-posturale-50 text-posturale-800',
    accent: 'border-l-posturale-500',
    dot: 'bg-posturale-500',
  },
  yoga: {
    solid: 'border-yoga-600 bg-yoga-600 text-white',
    soft: 'border-yoga-200 bg-yoga-50 text-yoga-800',
    accent: 'border-l-yoga-500',
    dot: 'bg-yoga-500',
  },
}
