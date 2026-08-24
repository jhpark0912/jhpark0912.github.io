import { useEffect, useState } from 'react'
import { remainingUntil, type Remaining } from '../lib/date'

/** Live seconds-resolution countdown to `target`; stops ticking once passed. */
export function useCountdown(target: Date): Remaining {
  const [remaining, setRemaining] = useState<Remaining>(() => remainingUntil(target, new Date()))

  useEffect(() => {
    if (remaining.isPast) return

    const id = window.setInterval(() => {
      const next = remainingUntil(target, new Date())
      setRemaining(next)
      if (next.isPast) window.clearInterval(id)
    }, 1000)

    return () => window.clearInterval(id)
  }, [target, remaining.isPast])

  return remaining
}
