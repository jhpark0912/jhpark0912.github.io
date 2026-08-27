import { useId, useState, type ReactNode } from 'react'
import styles from './Accordion.module.css'

interface AccordionProps {
  title: ReactNode
  children: ReactNode
  variant?: 'card' | 'plain'
  /** Tighter padding, for a short list that needs no framing of its own. */
  compact?: boolean
}

export function Accordion({ title, children, variant = 'card', compact = false }: AccordionProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div
      className={[styles.item, variant === 'plain' ? styles.plain : '', compact ? styles.compact : '']
        .filter(Boolean)
        .join(' ')}
      data-open={open}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.title}>{title}</span>
        <span className={styles.chevron} aria-hidden="true" />
      </button>

      {/*
        0fr → 1fr animates to the panel's natural height without measuring it.
        `hidden` would kill that animation, so a collapsed panel is taken out of
        the tab order and the a11y tree with `inert` instead.
      */}
      <div id={panelId} className={styles.panel} data-open={open} role="region" inert={!open}>
        <div className={styles.panelInner}>
          <div className={styles.panelContent}>{children}</div>
        </div>
      </div>
    </div>
  )
}
