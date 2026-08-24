import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

type Variant = 'primary' | 'outline' | 'soft'
type Size = 'md' | 'sm'

interface CommonProps {
  variant?: Variant
  size?: Size
  block?: boolean
  children: ReactNode
  className?: string
}

function classesFor({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
}: Omit<CommonProps, 'children'>): string {
  return [styles.base, styles[variant], styles[size], block ? styles.block : '', className ?? '']
    .filter(Boolean)
    .join(' ')
}

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>

export function Button({ variant, size, block, className, children, ...rest }: ButtonProps) {
  return (
    <button {...rest} className={classesFor({ variant, size, block, className })}>
      {children}
    </button>
  )
}

type LinkButtonProps = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement>

export function LinkButton({ variant, size, block, className, children, ...rest }: LinkButtonProps) {
  return (
    <a {...rest} className={classesFor({ variant, size, block, className })}>
      {children}
    </a>
  )
}
