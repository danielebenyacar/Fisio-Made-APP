import type { ButtonHTMLAttributes } from 'react'
import { buttonClass, type ButtonVariant } from './buttonClass'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }

export function Button({ variant = 'primary', className = 'w-full', type = 'button', ...props }: Props) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />
}
