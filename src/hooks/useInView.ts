import { useEffect, useRef, useState } from 'react'

/**
 * Reports once an element has come near the viewport.
 *
 * Used to defer work that costs a network round trip — loading the guestbook,
 * fetching the map SDK — until a guest actually scrolls that far.
 */
export function useInView<T extends HTMLElement>(rootMargin = '160px') {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    if (!('IntersectionObserver' in window)) {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [rootMargin])

  return [ref, inView] as const
}
