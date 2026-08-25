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

type ParentRole = 'father' | 'mother'

function isDeceased(host: Host, role: ParentRole): boolean {
  return Boolean(role === 'father' ? host.fatherDeceased : host.motherDeceased)
}

/**
 * Whether a column has to leave room for the chrysanthemum. Reserving the slot
 * per column rather than per name means the flower widens that column once, for
 * every line at once, instead of pushing one line's name out of step with the
 * other's — and a column nobody marks keeps its space.
 */
function marksDeceased(hosts: Host[], role: ParentRole): boolean {
  return hosts.some((host) => host[role].length > 0 && isDeceased(host, role))
}

/** One parent's name, preceded by the fixed-width marker slot when reserved. */
function ParentCell({
  host,
  role,
  reserveMarker,
  className,
}: {
  host: Host
  role: ParentRole
  reserveMarker: boolean
  className: string
}) {
  const name = host[role]

  return (
    <span className={className}>
      {reserveMarker && name.length > 0 && (
        <span className={styles.marker}>{isDeceased(host, role) && <Chrysanthemum />}</span>
      )}
      {name}
    </span>
  )
}

interface MarkedColumns {
  father: boolean
  mother: boolean
}

/**
 * Renders "아버지 · 어머니 의 아들 이름", degrading to just the role and the
 * name while the parents' details are still unknown.
 *
 * Every part is emitted as its own cell — father, separator, mother, relation,
 * name — so the groom's and the bride's lines share the grid columns declared
 * on `.hosts`. Each of the five lines up with its counterpart no matter how
 * much "아들"/"딸" or the chrysanthemum widen one of them.
 */
function HostLine({ host, marked }: { host: Host; marked: MarkedColumns }) {
  const hasParents = host.father.length > 0 || host.mother.length > 0

  if (!hasParents) {
    return (
      <p className={styles.hostLine}>
        <span className={styles.role}>{host.label}</span>
        <span className={styles.relation} />
        <span className={styles.child}>{host.name}</span>
      </p>
    )
  }

  return (
    <p className={styles.hostLine}>
      <ParentCell host={host} role="father" reserveMarker={marked.father} className={styles.father} />
      <span className={styles.separator} aria-hidden="true">
        {host.father.length > 0 && host.mother.length > 0 ? '·' : ''}
      </span>
      <ParentCell host={host} role="mother" reserveMarker={marked.mother} className={styles.mother} />
      <span className={styles.relation}>{host.order ? `의 ${host.order}` : ''}</span>
      <span className={styles.child}>{host.name}</span>
    </p>
  )
}

export function Invitation() {
  const { groom, bride, greeting } = useContent()
  const hosts = [groom, bride]
  const marked: MarkedColumns = {
    father: marksDeceased(hosts, 'father'),
    mother: marksDeceased(hosts, 'mother'),
  }

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
          <HostLine host={groom} marked={marked} />
          <HostLine host={bride} marked={marked} />
        </Reveal>
      </div>
    </Section>
  )
}
