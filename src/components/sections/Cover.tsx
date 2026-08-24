import { useEffect, useRef } from 'react'
import { wedding } from '../../data/wedding'
import { formatKoreanDate, formatKoreanTime, formatWeekday } from '../../lib/date'
import styles from './Cover.module.css'

interface CoverProps {
  /** Flips to true once the intro has cleared, starting the entrance. */
  started: boolean
}

export function Cover({ started }: CoverProps) {
  const mediaRef = useRef<HTMLDivElement | null>(null)
  const date = new Date(wedding.date)

  // Gentle parallax: the photo drifts at 30% of scroll speed while the cover is
  // still on screen. Reads on a phone without feeling like a gimmick.
  useEffect(() => {
    const media = mediaRef.current
    if (!media) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const update = () => {
      frame = 0
      const offset = Math.min(window.scrollY, window.innerHeight)
      media.style.transform = `translate3d(0, ${offset * 0.3}px, 0) scale(${1 + offset * 0.0002})`
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section className={styles.cover} aria-label="청첩장 표지">
      <div ref={mediaRef} className={styles.media}>
        <img
          src={wedding.cover.image}
          alt={wedding.cover.alt}
          className={styles.image}
          fetchPriority="high"
          decoding="async"
        />
        <div className={styles.veil} aria-hidden="true" />
      </div>

      <div className={styles.content} data-started={started}>
        <p className={styles.eyebrow}>We&apos;re getting married</p>

        <h1 className={styles.names}>
          <span>{wedding.groom.name}</span>
          <span className={styles.heart} aria-hidden="true">
            ♥
          </span>
          <span>{wedding.bride.name}</span>
        </h1>

        <p className={styles.date}>
          {formatKoreanDate(date)} {formatWeekday(date)} {formatKoreanTime(date)}
        </p>
        <p className={styles.venue}>
          {wedding.venue.name} {wedding.venue.hall}
        </p>
      </div>

      <div className={styles.hint} data-started={started} aria-hidden="true">
        <span className={styles.hintLine} />
      </div>
    </section>
  )
}
