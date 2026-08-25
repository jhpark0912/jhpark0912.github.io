import type { Host } from '../../data/wedding'
import { useContent } from '../../lib/useSiteConfig'
import { Section } from '../ui/Section'
import { Reveal } from '../ui/Reveal'
import styles from './Contact.module.css'

/** tel:/sms: links reject the hyphenated form on some Android dialers. */
function digits(phone: string): string {
  return phone.replace(/[^0-9+]/g, '')
}

function ContactRow({ host }: { host: Host }) {
  const number = digits(host.phone)

  return (
    <li className={styles.row}>
      <span className={styles.who}>
        <span className={styles.role}>{host.label}</span>
        <span className={styles.name}>{host.name}</span>
      </span>

      <span className={styles.actions}>
        <a className={styles.iconButton} href={`tel:${number}`} aria-label={`${host.name}에게 전화하기`}>
          <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true">
            <path
              d="M5.2 3h2.1l1.2 3-1.5 1.2a9.5 9.5 0 0 0 4.8 4.8L13 10.5l3 1.2v2.1a1.6 1.6 0 0 1-1.8 1.6C8.9 14.9 5.1 11.1 4.6 5.8A1.6 1.6 0 0 1 5.2 3Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </a>
        <a className={styles.iconButton} href={`sms:${number}`} aria-label={`${host.name}에게 문자 보내기`}>
          <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true">
            <path
              d="M3.5 5.2A1.7 1.7 0 0 1 5.2 3.5h9.6a1.7 1.7 0 0 1 1.7 1.7v6a1.7 1.7 0 0 1-1.7 1.7H8.4l-3.5 2.8a.4.4 0 0 1-.6-.3v-2.5h-.8Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </span>
    </li>
  )
}

/** Just the couple — two rows, no sides to expand, no hosts. */
export function Contact() {
  const wedding = useContent()
  const people = [wedding.groom, wedding.bride].filter((host) => host.phone.length > 0)

  if (people.length === 0) return null

  return (
    <Section id="contact" eyebrow="Contact" title="연락하기" tinted>
      <Reveal className={styles.card}>
        <ul className={styles.rows}>
          {people.map((host) => (
            <ContactRow key={host.label} host={host} />
          ))}
        </ul>
      </Reveal>
    </Section>
  )
}
