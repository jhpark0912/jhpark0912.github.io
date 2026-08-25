import { useMemo } from 'react'
import { useContent } from '../../lib/useSiteConfig'
import { buildMonthGrid, daysBetween, formatKoreanTime, formatWeekday, toKstYmd } from '../../lib/date'
import { useCountdown } from '../../hooks/useCountdown'
import { Section } from '../ui/Section'
import { Reveal } from '../ui/Reveal'
import { SpotPhoto } from '../ui/SpotPhoto'
import styles from './CalendarSection.module.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function CalendarSection() {
  const wedding = useContent()
  const date = useMemo(() => new Date(wedding.date), [wedding.date])
  const cells = useMemo(() => buildMonthGrid(date), [date])
  const { year, month, day } = toKstYmd(date)
  const remaining = useCountdown(date)

  const daysLeft = daysBetween(new Date(), date)

  return (
    <Section id="calendar" eyebrow="Save the date" title="예식 일정">
      <Reveal className={styles.headline}>
        <p className={styles.big}>
          {year}. {String(month).padStart(2, '0')}. {String(day).padStart(2, '0')}
        </p>
        <p className={styles.sub}>
          {formatWeekday(date)} {formatKoreanTime(date)}
        </p>
      </Reveal>

      <SpotPhoto photo={wedding.photos.calendar} delay={80} className={styles.photo} />

      {/*
        The calendar restates a date the headline above already announces, so it
        is hidden from assistive tech rather than read out as 30 loose numbers.
      */}
      <Reveal delay={120} className={styles.calendarWrap}>
        <div className={styles.calendar} aria-hidden="true">
          <div className={styles.weekHeader}>
            {WEEKDAYS.map((label, index) => (
              <span key={label} className={styles.weekday} data-sunday={index === 0} data-saturday={index === 6}>
                {label}
              </span>
            ))}
          </div>

          <div className={styles.grid}>
            {cells.map((cell, index) => (
              <span
                key={index}
                className={styles.day}
                data-sunday={cell.isSunday}
                data-saturday={cell.isSaturday}
                data-wedding={cell.isWedding}
              >
                {cell.isWedding && <span className={styles.mark} />}
                <span className={styles.dayNumber}>{cell.day ?? ''}</span>
              </span>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={200} className={styles.countdown}>
        {remaining.isPast ? (
          <p className={styles.past}>두 사람의 시작을 축복해 주셔서 감사합니다.</p>
        ) : (
          <>
            <ul className={styles.units}>
              {[
                { label: 'DAYS', value: remaining.days },
                { label: 'HOUR', value: remaining.hours },
                { label: 'MIN', value: remaining.minutes },
                { label: 'SEC', value: remaining.seconds },
              ].map((unit) => (
                <li key={unit.label} className={styles.unit}>
                  <span className={styles.value}>{String(unit.value).padStart(2, '0')}</span>
                  <span className={styles.unitLabel}>{unit.label}</span>
                </li>
              ))}
            </ul>
            <p className={styles.dday}>
              {wedding.groom.name} <span aria-hidden="true">♥</span> {wedding.bride.name}의 결혼식이{' '}
              <strong>{daysLeft > 0 ? `${daysLeft}일` : '오늘'}</strong> 남았습니다.
            </p>
          </>
        )}
      </Reveal>
    </Section>
  )
}
