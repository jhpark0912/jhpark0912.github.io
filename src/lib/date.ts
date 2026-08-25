/**
 * Date helpers pinned to Korea Standard Time.
 *
 * A guest opening the invitation from abroad must still see the Korean
 * calendar date and the same D-day count as everyone else, so every derived
 * value goes through Asia/Seoul rather than the device's local zone.
 */

const KST = 'Asia/Seoul'

export interface YearMonthDay {
  year: number
  month: number
  day: number
}

const ymdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: KST,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function toKstYmd(date: Date): YearMonthDay {
  const parts = ymdFormatter.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

/** Whole calendar days from `from` to `to`, both read in KST. */
export function daysBetween(from: Date, to: Date): number {
  const a = toKstYmd(from)
  const b = toKstYmd(to)
  const msPerDay = 86_400_000
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / msPerDay)
}

const weekdayFormatter = new Intl.DateTimeFormat('ko-KR', { timeZone: KST, weekday: 'long' })

export function formatWeekday(date: Date): string {
  return weekdayFormatter.format(date)
}

/** e.g. "2026년 11월 8일" */
export function formatKoreanDate(date: Date): string {
  const { year, month, day } = toKstYmd(date)
  return `${year}년 ${month}월 ${day}일`
}

/** e.g. "2026.11.08" */
export function formatDotDate(date: Date): string {
  const { year, month, day } = toKstYmd(date)
  return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`
}

const hourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: KST,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function toKstHourMinute(date: Date): { hour: number; minute: number } {
  const parts = hourFormatter.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value)
  return { hour: get('hour'), minute: get('minute') }
}

/** e.g. "낮 12시", "오후 2시 30분" — the phrasing invitations conventionally use. */
export function formatKoreanTime(date: Date): string {
  const { hour, minute } = toKstHourMinute(date)
  const hour12 = hour % 12 === 0 ? 12 : hour % 12

  let meridiem: string
  if (hour === 12) meridiem = '낮'
  else if (hour < 12) meridiem = '오전'
  else if (hour < 18) meridiem = '오후'
  else meridiem = '저녁'

  return minute === 0 ? `${meridiem} ${hour12}시` : `${meridiem} ${hour12}시 ${minute}분`
}

/**
 * Turns a stored timestamp into what a `datetime-local` input expects.
 *
 * The input has no time zone of its own — it shows whatever wall-clock string
 * it is given — so the admin page hands it the Korean wall clock and reads it
 * back the same way. Editing the ceremony time from a laptop in another country
 * therefore still means the time in Seoul, which is the only reading that makes
 * sense on a wedding invitation.
 */
export function toKstInputValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const { year, month, day } = toKstYmd(date)
  const { hour, minute } = toKstHourMinute(date)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`
}

/** The inverse: a wall-clock string becomes an instant, stamped +09:00. */
export function fromKstInputValue(value: string): string {
  if (!value) return ''
  // `datetime-local` may or may not include seconds depending on the browser.
  const withSeconds = value.length === 16 ? `${value}:00` : value
  return `${withSeconds}+09:00`
}

export interface CalendarCell {
  day: number | null
  /** Marks the ceremony day so the calendar can highlight it. */
  isWedding: boolean
  /** Sundays render in a warmer red, matching printed Korean calendars. */
  isSunday: boolean
  isSaturday: boolean
}

/** Builds the six-row grid for the month containing `date`, Sunday-first. */
export function buildMonthGrid(date: Date): CalendarCell[] {
  const { year, month, day: weddingDay } = toKstYmd(date)
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const cells: CalendarCell[] = []
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ day: null, isWedding: false, isSunday: false, isSaturday: false })
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = (firstWeekday + day - 1) % 7
    cells.push({
      day,
      isWedding: day === weddingDay,
      isSunday: weekday === 0,
      isSaturday: weekday === 6,
    })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, isWedding: false, isSunday: false, isSaturday: false })
  }
  return cells
}

export interface Remaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  /** True once the ceremony start time has passed. */
  isPast: boolean
}

export function remainingUntil(target: Date, now: Date): Remaining {
  const diff = target.getTime() - now.getTime()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true }

  const totalSeconds = Math.floor(diff / 1000)
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    isPast: false,
  }
}
