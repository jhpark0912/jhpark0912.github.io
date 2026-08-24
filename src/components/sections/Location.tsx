import { useEffect, useRef, useState } from 'react'
import { wedding } from '../../data/wedding'
import { hasKakaoKey, loadKakaoMaps, navigationLinks } from '../../lib/kakao'
import { copyText } from '../../lib/clipboard'
import { Section } from '../ui/Section'
import { Reveal } from '../ui/Reveal'
import { Accordion } from '../ui/Accordion'
import { Button, LinkButton } from '../ui/Button'
import { useToast } from '../ui/ToastProvider'
import styles from './Location.module.css'

type MapState = 'idle' | 'loading' | 'ready' | 'error'

export function Location() {
  const { venue } = wedding
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [state, setState] = useState<MapState>(hasKakaoKey ? 'idle' : 'error')
  const toast = useToast()
  const links = navigationLinks(venue.name, venue.lat, venue.lng)

  // The SDK is fetched only once the map is about to enter the viewport.
  useEffect(() => {
    if (!hasKakaoKey) return
    const container = containerRef.current
    if (!container) return

    let cancelled = false

    const init = async () => {
      setState('loading')
      try {
        const maps = await loadKakaoMaps()
        if (cancelled) return

        const center = new maps.LatLng(venue.lat, venue.lng)
        const map = new maps.Map(container, { center, level: 4 })
        new maps.Marker({ map, position: center })

        // A one-finger drag here should scroll the page, not pan the map;
        // guests who want to explore open the full app with the buttons below.
        map.setDraggable(false)
        map.setZoomable(false)

        setState('ready')
      } catch {
        if (!cancelled) setState('error')
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          observer.disconnect()
          void init()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(container)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [venue.lat, venue.lng])

  const onCopyAddress = async () => {
    const copied = await copyText(venue.address)
    toast(copied ? '주소를 복사했어요.' : '복사에 실패했어요. 길게 눌러 복사해 주세요.')
  }

  return (
    <Section id="location" eyebrow="Location" title="오시는 길" tinted>
      <Reveal className={styles.venue}>
        <p className={styles.name}>{venue.name}</p>
        <p className={styles.hall}>{venue.hall}</p>
        <p className={styles.address}>{venue.address}</p>
        <a className={styles.tel} href={`tel:${venue.tel.replace(/[^0-9+]/g, '')}`}>
          {venue.tel}
        </a>
      </Reveal>

      <Reveal delay={100} className={styles.mapCard}>
        <div className={styles.mapFrame}>
          <div ref={containerRef} className={styles.map} aria-hidden="true" />
          {state !== 'ready' && (
            <div className={styles.mapFallback}>
              {state === 'loading' ? (
                <p>지도를 불러오는 중입니다…</p>
              ) : (
                <>
                  <p className={styles.fallbackTitle}>{venue.name}</p>
                  <p>{venue.address}</p>
                  <p className={styles.fallbackHint}>아래 버튼으로 지도 앱에서 확인하실 수 있습니다.</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className={styles.mapActions}>
          <Button variant="outline" size="sm" onClick={onCopyAddress}>
            주소 복사
          </Button>
          <LinkButton
            variant="outline"
            size="sm"
            href={links.kakao}
            target="_blank"
            rel="noreferrer noopener"
          >
            지도 크게 보기
          </LinkButton>
        </div>
      </Reveal>

      <Reveal delay={160} className={styles.navButtons}>
        <LinkButton variant="soft" size="sm" href={links.kakao} target="_blank" rel="noreferrer noopener">
          카카오맵
        </LinkButton>
        <LinkButton variant="soft" size="sm" href={links.naver} target="_blank" rel="noreferrer noopener">
          네이버지도
        </LinkButton>
        <LinkButton variant="soft" size="sm" href={links.tmap}>
          T map
        </LinkButton>
      </Reveal>

      <div className={styles.transport}>
        {venue.transport.map((guide, index) => (
          <Reveal key={guide.title} delay={index * 80}>
            <Accordion title={guide.title} variant="plain" defaultOpen={index === 0}>
              <ul className={styles.guideLines}>
                {guide.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </Accordion>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
