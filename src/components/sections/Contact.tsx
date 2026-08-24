import { wedding, type Host } from '../../data/wedding'
import { Section } from '../ui/Section'
import { Reveal } from '../ui/Reveal'
import { Accordion } from '../ui/Accordion'
import styles from './Contact.module.css'

interface ContactPerson {
  role: string
  name: string
  phone?: string
}

function peopleOf(host: Host): ContactPerson[] {
  return [
    { role: host.label, name: host.name, phone: host.phone },
    { role: '아버지', name: host.father, phone: host.fatherPhone },
    { role: '어머니', name: host.mother, phone: host.motherPhone },
  ].filter((person) => Boolean(person.phone))
}

/** tel:/sms: links reject the hyphenated form on some Android dialers. */
function digits(phone: string): string {
  return phone.replace(/[^0-9+]/g, '')
}

function ContactRow({ person }: { person: ContactPerson }) {
  const number = digits(person.phone ?? '')

  return (
    <li className={styles.row}>
      <span className={styles.who}>
        <span className={styles.role}>{person.role}</span>
        <span className={styles.name}>{person.name}</span>
      </span>

      <span className={styles.actions}>
        <a className={styles.iconButton} href={`tel:${number}`} aria-label={`${person.name}에게 전화하기`}>
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
        <a className={styles.iconButton} href={`sms:${number}`} aria-label={`${person.name}에게 문자 보내기`}>
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

export function Contact() {
  const sides = [
    { key: 'groom', title: '신랑 측', host: wedding.groom },
    { key: 'bride', title: '신부 측', host: wedding.bride },
  ] as const

  return (
    <Section id="contact" eyebrow="Contact" title="연락하기" tinted>
      <div className={styles.list}>
        {sides.map((side, index) => (
          <Reveal key={side.key} delay={index * 100}>
            <Accordion
              title={side.title}
              subtitle={`${side.host.name} · 혼주`}
              defaultOpen={index === 0}
            >
              <ul className={styles.rows}>
                {peopleOf(side.host).map((person) => (
                  <ContactRow key={`${person.role}-${person.name}`} person={person} />
                ))}
              </ul>
            </Accordion>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
