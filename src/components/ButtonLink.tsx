import { Link, type LinkProps } from 'react-router-dom'
import { buttonClass, type ButtonVariant } from './buttonClass'

type Props = LinkProps & { variant?: ButtonVariant }

export function ButtonLink({ variant = 'primary', className = 'w-full', ...props }: Props) {
  return <Link className={buttonClass(variant, className)} {...props} />
}
