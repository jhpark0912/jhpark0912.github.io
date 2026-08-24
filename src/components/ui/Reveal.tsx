import type { CSSProperties, ElementType, ReactNode } from 'react'
import { useReveal } from '../../hooks/useReveal'

interface RevealProps {
  children: ReactNode
  /** Stagger within a group, in milliseconds. */
  delay?: number
  className?: string
  as?: ElementType
  style?: CSSProperties
}

/** Wraps content so it fades and lifts into place the first time it is seen. */
export function Reveal({ children, delay = 0, className, as: Tag = 'div', style }: RevealProps) {
  const ref = useReveal<HTMLElement>()

  return (
    <Tag
      ref={ref}
      className={className ? `reveal ${className}` : 'reveal'}
      data-revealed="false"
      style={{ ...style, '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  )
}
