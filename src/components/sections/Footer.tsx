import { useContent } from '../../lib/useSiteConfig'
import { formatDotDate } from '../../lib/date'
import { Reveal } from '../ui/Reveal'
import { SpotPhoto } from '../ui/SpotPhoto'
import { ShareButtons } from '../ui/ShareButtons'
import styles from './Footer.module.css'

export function Footer() {
  const wedding = useContent()
  const date = new Date(wedding.date)

  return (
    <footer className={styles.footer}>
      {/* The closing picture belongs to the goodbye, so it lives inside the
          footer rather than as a band above it — one block, one seam. */}
      <SpotPhoto photo={wedding.photos.farewell} className={styles.photo} />

      <Reveal className={styles.inner}>
        <p className={styles.names}>
          {wedding.groom.nameEn} <span aria-hidden="true">&amp;</span> {wedding.bride.nameEn}
        </p>
        <p className={styles.date}>{formatDotDate(date)}</p>
        <p className={styles.thanks}>함께해 주셔서 감사합니다.</p>
        <ShareButtons className={styles.share} />
      </Reveal>
    </footer>
  )
}
