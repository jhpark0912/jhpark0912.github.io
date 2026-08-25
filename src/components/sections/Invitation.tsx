import { wedding, type Host } from '../../data/wedding'
import { Section } from '../ui/Section'
import { Reveal } from '../ui/Reveal'
import styles from './Invitation.module.css'

/**
 * Renders "아버지 · 어머니 의 장남 이름", degrading to just the role and the
 * name while the parents' details are still unknown.
 */
function HostLine({ host }: { host: Host }) {
  const parents = [host.father, host.mother].filter(Boolean).join(' · ')

  return (
    <p className={styles.hostLine}>
      {parents ? (
        <>
          <span className={styles.parents}>{parents}</span>
          {host.order && <span className={styles.relation}>의 {host.order}</span>}
        </>
      ) : (
        <span className={styles.relation}>{host.label}</span>
      )}
      <span className={styles.child}>{host.name}</span>
    </p>
  )
}

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
          <HostLine host={groom} />
          <HostLine host={bride} />
        </Reveal>
      </div>
    </Section>
  )
}
