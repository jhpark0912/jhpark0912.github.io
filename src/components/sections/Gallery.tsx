import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { wedding } from '../../data/wedding'
import { Section } from '../ui/Section'
import { Reveal } from '../ui/Reveal'
import { Lightbox } from './Lightbox'
import styles from './Gallery.module.css'

export function Gallery() {
  const photos = wedding.gallery
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center', containScroll: false })
  const [selected, setSelected] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap())
    onSelect()
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi])

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi])

  return (
    <Section id="gallery" eyebrow="Gallery" title="우리의 순간">
      <Reveal className={styles.viewportWrap}>
        <div className={styles.viewport} ref={emblaRef}>
          <div className={styles.container}>
            {photos.map((photo, index) => (
              <div className={styles.slide} key={photo.src} data-active={index === selected}>
                <button
                  type="button"
                  className={styles.slideButton}
                  onClick={() => setLightboxIndex(index)}
                  aria-label={`${photo.alt} 크게 보기`}
                >
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className={styles.image}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={120} className={styles.controls}>
        <div className={styles.dots}>
          {photos.map((photo, index) => (
            <button
              key={photo.src}
              type="button"
              className={styles.dot}
              data-active={index === selected}
              onClick={() => scrollTo(index)}
              aria-label={`${index + 1}번째 사진 보기`}
              aria-current={index === selected}
            />
          ))}
        </div>
        <p className={styles.counter}>
          <span>{String(selected + 1).padStart(2, '0')}</span> / {String(photos.length).padStart(2, '0')}
        </p>
      </Reveal>

      {lightboxIndex !== null && (
        <Lightbox photos={photos} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </Section>
  )
}
