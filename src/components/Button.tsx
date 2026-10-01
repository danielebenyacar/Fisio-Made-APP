import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-800 text-white active:bg-brand-900',
  secondary: 'border border-brand-300 bg-white text-brand-900 active:bg-brand-100',
  danger: 'bg-danger-600 text-white active:bg-danger-700',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      className={`min-h-12 w-full rounded-xl px-4 text-base font-semibold disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}
