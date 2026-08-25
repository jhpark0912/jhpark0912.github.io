import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import styles from './Intro.module.css'

const GREETING = '우리, 결혼합니다'
/** Kept in step with --font-hand in tokens.css. */
const GREETING_FACE = "'NanumYaGeunHaNeunGimJuIm'"

/** How long the hand takes to write the line out. */
const WRITE_MS = 2000
/** A beat to let the finished line sit before the curtain lifts. */
const HOLD_MS = 700
const FADE_MS = 700
/** Nothing is being written when motion is off, so the wait is just a breath. */
const STILL_MS = 1200
/** If the face is slow to arrive, start anyway rather than hold the guest. */
const FONT_WAIT_MS = 1200

interface IntroProps {
  onDone: () => void
}

interface Segment {
  /** Where the line was already written when this syllable starts. */
  from: number
  /** Where it stands once the syllable is finished. */
  to: number
  dur: number
  /** The rest the hand takes before setting the pen down again. */
  pause: number
}

/** Pen speed: slow at the start of a syllable, slow again at its end. */
const ease = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2

/**
 * Turns the measured syllables into a writing rhythm, then stretches the whole
 * thing to WRITE_MS. Wider syllables take longer, and the hand rests longer
 * after the comma than between syllables — that unevenness is what separates
 * writing from a wipe.
 */
function plan(line: HTMLElement): { segments: Segment[]; end: number } {
  const spans = Array.from(line.querySelectorAll<HTMLElement>('span'))
  const origin = line.getBoundingClientRect().left
  let cursor = 0

  const segments = spans.map((span, i) => {
    const to = span.getBoundingClientRect().right - origin
    const blank = span.dataset.blank === 'true'
    const previous = spans[i - 1]
    const from = cursor
    cursor = to
    return {
      from,
      to,
      dur: blank ? 70 : Math.max(110, (to - from) * 5.5),
      pause: i === 0 || blank ? 0 : previous.textContent === ',' ? 190 : 70,
    }
  })

  const raw = segments.reduce((sum, seg) => sum + seg.pause + seg.dur, 0)
  const scale = WRITE_MS / raw
  return {
    segments: segments.map((seg) => ({ ...seg, dur: seg.dur * scale, pause: seg.pause * scale })),
    end: cursor,
  }
}

/**
 * Opening curtain.
 *
 * One line, written out by hand. It buys time for the cover photo and the web
 * fonts to arrive, so the first thing a guest sees is finished rather than
 * half-painted. Tapping finishes the line and skips ahead.
 */
export function Intro({ onDone }: IntroProps) {
  const [leaving, setLeaving] = useState(false)
  const lineRef = useRef<HTMLParagraphElement | null>(null)
  const frameRef = useRef(0)
  const finishRef = useRef(() => {})

  useLockBodyScroll(true)

  useLayoutEffect(() => {
    const line = lineRef.current
    if (!line) return

    // How far the pen has travelled. The CSS mask hides everything past it.
    const reveal = (x: number) => line.style.setProperty('--written', `${x}px`)

    const finish = () => {
      cancelAnimationFrame(frameRef.current)
      reveal(line.offsetWidth + 24)
    }
    finishRef.current = finish

    let cancelled = false
    let holdTimer = 0

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish()
      holdTimer = window.setTimeout(() => setLeaving(true), STILL_MS)
      return () => window.clearTimeout(holdTimer)
    }

    // Set before the first paint, so the line never flashes whole. Left in CSS
    // it would also mean an invisible greeting if this effect never ran.
    reveal(0)

    const start = () => {
      if (cancelled) return
      const { segments, end } = plan(line)
      const startedAt = performance.now()

      const step = (now: number) => {
        let t = now - startedAt
        let x = end

        for (const seg of segments) {
          if (t < seg.pause) {
            x = seg.from
            break
          }
          t -= seg.pause
          if (t < seg.dur) {
            x = seg.from + (seg.to - seg.from) * ease(t / seg.dur)
            break
          }
          t -= seg.dur
          x = seg.to
        }

        reveal(x)
        if (now - startedAt < WRITE_MS) frameRef.current = requestAnimationFrame(step)
        else finish()
      }

      frameRef.current = requestAnimationFrame(step)
      holdTimer = window.setTimeout(() => setLeaving(true), WRITE_MS + HOLD_MS)
    }

    // Measuring before the handwriting face lands would size every syllable in
    // the fallback, and the reveal would run ahead of the letters.
    const face = document.fonts?.load(`1em ${GREETING_FACE}`) ?? Promise.resolve()
    Promise.race([face.catch(() => undefined), new Promise((r) => setTimeout(r, FONT_WAIT_MS))]).then(start)

    return () => {
      cancelled = true
      cancelAnimationFrame(frameRef.current)
      window.clearTimeout(holdTimer)
    }
  }, [])

  useEffect(() => {
    if (!leaving) return
    const fadeTimer = window.setTimeout(onDone, FADE_MS)
    return () => window.clearTimeout(fadeTimer)
  }, [leaving, onDone])

  const skip = useCallback(() => {
    finishRef.current()
    setLeaving(true)
  }, [])

  return (
    <div className={styles.intro} data-leaving={leaving} role="presentation" onClick={skip}>
      <p ref={lineRef} className={styles.greeting} aria-label={GREETING}>
        {Array.from(GREETING, (character, i) => (
          <span key={i} aria-hidden="true" data-blank={character === ' '}>
            {character === ' ' ? ' ' : character}
          </span>
        ))}
      </p>
    </div>
  )
}
