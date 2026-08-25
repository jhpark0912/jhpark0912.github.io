import type { CSSProperties } from 'react'
import type { GalleryPhoto } from '../../data/wedding'
import { Reveal } from './Reveal'
import styles from './SpotPhoto.module.css'

interface SpotPhotoProps {
  photo: GalleryPhoto
  /** Stagger against whatever it sits between. */
  delay?: number
  /** Crop, as a CSS aspect-ratio. Left off for the standing-portrait default. */
  ratio?: string
  className?: string
}

/**
 * One photo placed between the invitation's reading.
 *
 * An empty slot renders nothing — not a frame, not a placeholder — so a couple
 * who never picks a photo sees the page exactly as it was. The intrinsic size
 * is written onto the <img> so the space is reserved before the bytes land and
 * the text below it never jumps.
 */
export function SpotPhoto({ photo, delay = 0, ratio, className }: SpotPhotoProps) {
  if (!photo.src) return null

  return (
    <Reveal
      delay={delay}
      className={[styles.frame, className].filter(Boolean).join(' ')}
      style={{ '--spot-ratio': ratio } as CSSProperties}
    >
      <img
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        decoding="async"
        className={styles.image}
      />
    </Reveal>
  )
}
