export type ButtonVariant = 'primary' | 'secondary' | 'danger'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-800 text-white active:bg-brand-900',
  secondary: 'border border-brand-300 bg-white text-brand-900 active:bg-brand-100',
  danger: 'bg-danger-600 text-white active:bg-danger-700',
}

/** Shared look of <Button> and <ButtonLink>. */
export function buttonClass(variant: ButtonVariant = 'primary', extra = ''): string {
  return `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold disabled:opacity-50 ${VARIANTS[variant]} ${extra}`
}
