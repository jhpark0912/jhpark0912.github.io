import type { ReactNode } from 'react'
import { Reveal } from './Reveal'
import styles from './Section.module.css'

interface SectionProps {
  id: string
  /** Small English label above the Korean heading. */
  eyebrow?: string
  title?: string
  children: ReactNode
  /** Warm tinted background, used to separate neighbouring sections. */
  tinted?: boolean
  className?: string
}

export function Section({ id, eyebrow, title, children, tinted = false, className }: SectionProps) {
  return (
    <section
      id={id}
      className={[styles.section, tinted ? styles.tinted : '', className ?? ''].filter(Boolean).join(' ')}
      aria-labelledby={title ? `${id}-title` : undefined}
    >
      {(eyebrow || title) && (
        <header className={styles.header}>
          {eyebrow && (
            <Reveal as="p" className={styles.eyebrow}>
              {eyebrow}
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={80}>
              <span id={`${id}-title`} className={styles.title}>
                {title}
              </span>
            </Reveal>
          )}
          <Reveal delay={160} className={styles.rule}>
            <span />
          </Reveal>
        </header>
      )}
      {children}
    </section>
  )
}
