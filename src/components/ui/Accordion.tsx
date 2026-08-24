import { useId, useState, type ReactNode } from 'react'
import styles from './Accordion.module.css'

interface AccordionProps {
  title: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  /** Optional secondary line under the title, e.g. a bank name. */
  subtitle?: ReactNode
  variant?: 'card' | 'plain'
}

export function Accordion({ title, subtitle, children, defaultOpen = false, variant = 'card' }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  return (
    <div className={`${styles.item} ${variant === 'plain' ? styles.plain : ''}`} data-open={open}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.titleGroup}>
          <span className={styles.title}>{title}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </span>
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
