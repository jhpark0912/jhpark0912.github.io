import { wedding } from '../../data/wedding'
import { Section } from '../ui/Section'
import { Reveal } from '../ui/Reveal'
import styles from './Invitation.module.css'

export function Invitation() {
  const { groom, bride, greeting } = wedding

  return (
    <Section id="invitation" eyebrow="Invitation" title="초대합니다">
      <div className={styles.wrap}>
        <blockquote className={styles.poem}>
          {greeting.poem.map((line, index) => (
            <Reveal as="p" key={line} delay={index * 110}>
              {line}
            </Reveal>
          ))}
        </blockquote>

        <Reveal className={styles.ornament} delay={120}>
          <span />
        </Reveal>

        <div className={styles.message}>
          {greeting.message.map((line, index) => (
            <Reveal as="p" key={line} delay={index * 110}>
              {line}
            </Reveal>
          ))}
        </div>

        <Reveal className={styles.hosts} delay={140}>
          <p className={styles.hostLine}>
            <span className={styles.parents}>
              {groom.father} · {groom.mother}
            </span>
            <span className={styles.relation}>의 {groom.order}</span>
            <span className={styles.child}>{groom.name}</span>
          </p>
          <p className={styles.hostLine}>
            <span className={styles.parents}>
              {bride.father} · {bride.mother}
            </span>
            <span className={styles.relation}>의 {bride.order}</span>
            <span className={styles.child}>{bride.name}</span>
          </p>
        </Reveal>
      </div>
    </Section>
  )
}
