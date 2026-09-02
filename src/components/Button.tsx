import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}

const KLASSEN = {
  primary: 'knop knop--primair',
  ghost: 'knop knop--ghost',
  danger: 'knop knop--gevaar',
} as const

export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  return <button className={`${KLASSEN[variant]} ${className}`.trim()} {...rest} />
}
