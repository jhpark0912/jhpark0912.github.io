import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import styles from './BottomSheet.module.css'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
}

/** Modal sheet that rises from the bottom edge — the phone-native form pattern. */
export function BottomSheet({ open, onClose, title, description, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  useLockBodyScroll(open)

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    sheetRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.handle} aria-hidden="true" />

        <header className={styles.header}>
          <h3 id={titleId} className={styles.title}>
            {title}
          </h3>
          <button type="button" className={styles.close} onClick={onClose}>
            <span className="visually-hidden">닫기</span>
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        </header>

        {description && (
          <p id={descriptionId} className={styles.description}>
            {description}
          </p>
        )}

        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
