import { Fragment } from 'react'
import type { Host } from '../../data/wedding'
import { useContent } from '../../lib/useSiteConfig'
import { Section } from '../ui/Section'
import { Reveal } from '../ui/Reveal'
import styles from './Invitation.module.css'

/**
 * White chrysanthemum — the flower Korean funerals use — drawn beside a
 * deceased parent's name. Petals are generated rather than hand-authored as
 * path data so the ring stays even.
 */
function Chrysanthemum({ size = 15 }: { size?: number }) {
  const outer = Array.from({ length: 12 }, (_, index) => index * 30)
  const inner = Array.from({ length: 8 }, (_, index) => index * 45 + 22)

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={styles.flower} aria-hidden="true">
      {outer.map((angle) => (
        <ellipse
          key={`o-${angle}`}
          cx="12"
          cy="6.2"
          rx="1.8"
          ry="5.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.5"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
      {inner.map((angle) => (
        <ellipse
          key={`i-${angle}`}
          cx="12"
          cy="8.9"
          rx="1.3"
          ry="2.9"
          fill="currentColor"
          opacity="0.16"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="1.8" fill="currentColor" opacity="0.42" />
    </svg>
  )
}

interface ParentName {
  name: string
  deceased: boolean
}

function parentsOf(host: Host): ParentName[] {
  return [
    { name: host.father, deceased: Boolean(host.fatherDeceased) },
    { name: host.mother, deceased: Boolean(host.motherDeceased) },
  ].filter((parent) => parent.name.length > 0)
}

/**
 * Renders "아버지 · 어머니 의 아들 이름", degrading to just the role and the
 * name while the parents' details are still unknown.
 */
function HostLine({ host }: { host: Host }) {
  const parents = parentsOf(host)

  return (
    <p className={styles.hostLine}>
      {parents.length > 0 ? (
        <>
          <span className={styles.parents}>
            {parents.map((parent, index) => (
              <Fragment key={parent.name}>
                {index > 0 && (
                  <span className={styles.separator} aria-hidden="true">
                    ·
                  </span>
                )}
                <span className={parent.deceased ? styles.deceasedName : undefined}>
                  {parent.deceased && <Chrysanthemum />}
                  {parent.name}
                </span>
              </Fragment>
            ))}
          </span>
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
  const { groom, bride, greeting } = useContent()

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
