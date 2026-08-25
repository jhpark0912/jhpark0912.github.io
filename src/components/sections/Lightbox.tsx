import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useEmblaCarousel from 'embla-carousel-react'
import type { GalleryPhoto } from '../../data/wedding'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import styles from './Lightbox.module.css'

interface LightboxProps {
  photos: readonly GalleryPhoto[]
  startIndex: number
  onClose: () => void
}

/** Full-screen photo viewer: swipe between shots, tap the backdrop to close. */
export function Lightbox({ photos, startIndex, onClose }: LightboxProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, startIndex, align: 'center' })
  const [selected, setSelected] = useState(startIndex)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useLockBodyScroll(true)

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap())
    onSelect()
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  // Same reasoning as BottomSheet: keep the handlers out of the dependency list
  // so the listener is bound once, on open, and torn down once, on close.
  const handlers = useRef({ onClose, scrollPrev, scrollNext })
  useEffect(() => {
    handlers.current = { onClose, scrollPrev, scrollNext }
  })

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null
    dialogRef.current?.focus({ preventScroll: true })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handlers.current.onClose()
      if (event.key === 'ArrowLeft') handlers.current.scrollPrev()
      if (event.key === 'ArrowRight') handlers.current.scrollNext()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused.current?.focus({ preventScroll: true })
    }
  }, [])

  return createPortal(
    <div
      ref={dialogRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="사진 크게 보기"
      tabIndex={-1}
      onClick={onClose}
    >
      <button type="button" className={styles.close} onClick={onClose}>
        <span className="visually-hidden">닫기</span>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </svg>
      </button>

      <div className={styles.viewport} ref={emblaRef} onClick={(event) => event.stopPropagation()}>
        <div className={styles.container}>
          {photos.map((photo) => (
            <div className={styles.slide} key={photo.src}>
              <img src={photo.src} alt={photo.alt} className={styles.image} decoding="async" />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.footer} onClick={(event) => event.stopPropagation()}>
        <button type="button" className={styles.arrow} onClick={scrollPrev} aria-label="이전 사진">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M14.5 5.5L8 12l6.5 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </svg>
        </button>
        <p className={styles.counter}>
          {selected + 1} / {photos.length}
        </p>
        <button type="button" className={styles.arrow} onClick={scrollNext} aria-label="다음 사진">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M9.5 5.5L16 12l-6.5 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </svg>
        </button>
      </div>
    </div>,
    document.body,
  )
}
