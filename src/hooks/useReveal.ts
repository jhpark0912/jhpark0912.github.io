import { useEffect, useRef } from 'react'

/**
 * Reveals an element the first time it scrolls into view.
 *
 * The observer disconnects on the first hit, so scrolling back up never
 * replays the animation — a re-triggering invitation reads as restless.
 */
export function useReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    if (!('IntersectionObserver' in window)) {
      element.dataset.revealed = 'true'
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          element.dataset.revealed = 'true'
          observer.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold])

  return ref
}
