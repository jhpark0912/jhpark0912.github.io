import { useEffect, useState } from 'react'
import { wedding } from '../../data/wedding'
import { formatDotDate } from '../../lib/date'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import styles from './Intro.module.css'

const HOLD_MS = 2000
const FADE_MS = 700

interface IntroProps {
  onDone: () => void
}

/**
 * Opening curtain.
 *
 * It buys time for the cover photo and the web fonts to arrive, so the first
 * thing a guest sees is finished rather than half-painted. Tapping skips it.
 */
export function Intro({ onDone }: IntroProps) {
  const [leaving, setLeaving] = useState(false)
  const date = new Date(wedding.date)

  useLockBodyScroll(true)

  useEffect(() => {
    const holdTimer = window.setTimeout(() => setLeaving(true), HOLD_MS)
    return () => window.clearTimeout(holdTimer)
  }, [])

  useEffect(() => {
    if (!leaving) return
    const fadeTimer = window.setTimeout(onDone, FADE_MS)
    return () => window.clearTimeout(fadeTimer)
  }, [leaving, onDone])

  return (
    <div
      className={styles.intro}
      data-leaving={leaving}
      role="presentation"
      onClick={() => setLeaving(true)}
    >
      <div className={styles.inner}>
        <p className={styles.label}>The Wedding of</p>
        <p className={styles.names}>
          <span>{wedding.groom.nameEn}</span>
          <span className={styles.amp}>&amp;</span>
          <span>{wedding.bride.nameEn}</span>
        </p>
        <span className={styles.rule} />
        <p className={styles.date}>{formatDotDate(date)}</p>
      </div>
    </div>
  )
}
