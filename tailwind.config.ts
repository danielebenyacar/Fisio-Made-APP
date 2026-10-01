import type { Config } from 'tailwindcss'
import colors from 'tailwindcss/colors'

// Design tokens. Use only these in the code, never raw hex values.
export default {
  theme: {
    extend: {
      colors: {
        // TODO: replace with the fisiomade.it palette (hex codes from the site).
        // Neutral placeholder until then.
        brand: colors.stone,
        demo: {
          bg: colors.amber[200],
          text: colors.amber[950],
        },
        danger: colors.red,
        // One color per discipline (client tags and list tabs).
        fisio: colors.sky,
        posturale: colors.emerald,
        yoga: colors.violet,
      },
    },
  },
} satisfies Config
