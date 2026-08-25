/**
 * The handful of labelled controls the content editor is built from.
 *
 * Every one of them is uncontrolled about nothing and controlled about
 * everything: value in, string out. Converting to the shapes the invitation
 * stores — a list of lines, a nullable coordinate, a timestamp — happens at the
 * call site, where the meaning of the field is known.
 */

import type { ReactNode } from 'react'
import styles from './Admin.module.css'

interface BaseProps {
  label: string
  hint?: string
}

export function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>{title}</h2>
      {note && <p className={styles.groupNote}>{note}</p>}
      <div className={styles.groupBody}>{children}</div>
    </section>
  )
}

/** Two fields side by side on a wide screen, stacked on a phone. */
export function Row({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>
}

interface TextProps extends BaseProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'tel' | 'url' | 'datetime-local' | 'number'
  maxLength?: number
}

export function Text({ label, hint, value, onChange, placeholder, type = 'text', maxLength }: TextProps) {
  return (
    <label className={styles.editField}>
      <span className={styles.editLabel}>
        {label}
        {hint && <span className={styles.editHint}>{hint}</span>}
      </span>
      <input
        className={styles.editInput}
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

interface AreaProps extends BaseProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

export function Area({ label, hint, value, onChange, placeholder, rows = 3 }: AreaProps) {
  return (
    <label className={styles.editField}>
      <span className={styles.editLabel}>
        {label}
        {hint && <span className={styles.editHint}>{hint}</span>}
      </span>
      <textarea
        className={styles.editArea}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

interface LinesProps extends BaseProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  rows?: number
}

/**
 * A block of text that is stored as one line per array entry.
 *
 * The invitation breaks these lines exactly where they are written — that is
 * how the poem and the greeting keep their shape on a narrow screen — so the
 * editor shows them as a textarea and splits on the newlines. Blank lines are
 * dropped on the way out; a stray empty line would render as a gap.
 */
export function Lines({ label, hint, value, onChange, placeholder, rows = 4 }: LinesProps) {
  return (
    <Area
      label={label}
      hint={hint ?? '줄바꿈한 대로 청첩장에 표시됩니다'}
      value={value.join('\n')}
      rows={rows}
      placeholder={placeholder}
      onChange={(next) =>
        onChange(
          next
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0),
        )
      }
    />
  )
}

export function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={styles.check}>
      <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

/** A card holding one item of a list — an account, a transport guide. */
export function ListCard({
  title,
  onMoveUp,
  onMoveDown,
  onRemove,
  children,
}: {
  title: string
  onMoveUp?: () => void
  onMoveDown?: () => void
  onRemove: () => void
  children: ReactNode
}) {
  return (
    <div className={styles.listCard}>
      <div className={styles.listCardHead}>
        <span className={styles.listCardTitle}>{title}</span>
        <span className={styles.listCardActions}>
          {onMoveUp && (
            <button type="button" className={styles.iconButton} onClick={onMoveUp} aria-label={`${title} 위로`}>
              ↑
            </button>
          )}
          {onMoveDown && (
            <button type="button" className={styles.iconButton} onClick={onMoveDown} aria-label={`${title} 아래로`}>
              ↓
            </button>
          )}
          <button type="button" className={styles.danger} onClick={onRemove}>
            삭제
          </button>
        </span>
      </div>
      <div className={styles.listCardBody}>{children}</div>
    </div>
  )
}

/** Moves an item within a list, returning a new array. Out-of-range is a no-op. */
export function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
