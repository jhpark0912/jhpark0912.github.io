import { useEffect } from 'react'

let lockCount = 0
let restore: (() => void) | null = null

/**
 * Freezes background scrolling while an overlay is open.
 *
 * iOS Safari ignores `overflow: hidden` on body, so the page is pinned with
 * `position: fixed` at its current offset and restored on unlock. A counter
 * keeps nested overlays (lightbox opened from a sheet) from unlocking early.
 */
export function useLockBodyScroll(active: boolean): void {
  useEffect(() => {
    if (!active) return

    lockCount += 1
    if (lockCount === 1) {
      const scrollY = window.scrollY
      const { body } = document
      const previous = {
        position: body.style.position,
        top: body.style.top,
        width: body.style.width,
        overflowY: body.style.overflowY,
      }

      body.style.position = 'fixed'
      body.style.top = `-${scrollY}px`
      body.style.width = '100%'
      body.style.overflowY = 'scroll'

      restore = () => {
        body.style.position = previous.position
        body.style.top = previous.top
        body.style.width = previous.width
        body.style.overflowY = previous.overflowY
        window.scrollTo(0, scrollY)
      }
    }

    return () => {
      lockCount -= 1
      if (lockCount === 0 && restore) {
        restore()
        restore = null
      }
    }
  }, [active])
}
