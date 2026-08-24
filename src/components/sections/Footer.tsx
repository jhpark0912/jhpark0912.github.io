import { wedding } from '../../data/wedding'
import { formatDotDate } from '../../lib/date'
import { Reveal } from '../ui/Reveal'
import styles from './Footer.module.css'

export function Footer() {
  const date = new Date(wedding.date)

  return (
    <footer className={styles.footer}>
      <Reveal className={styles.inner}>
        <p className={styles.names}>
          {wedding.groom.nameEn} <span aria-hidden="true">&amp;</span> {wedding.bride.nameEn}
        </p>
        <p className={styles.date}>{formatDotDate(date)}</p>
        <p className={styles.thanks}>함께해 주셔서 감사합니다.</p>
      </Reveal>
    </footer>
  )
}
