import { useCallback, useEffect, useState } from 'react'
import { describeError, withTimeout } from '../../lib/firebase'
import { listRsvp, summarise, type RsvpEntry } from '../../lib/admin'
import styles from '../Admin.module.css'

const LOAD_TIMEOUT_MS = 15_000

const MEAL_LABEL: Record<string, string> = { yes: '식사', no: '식사 안 함', undecided: '미정' }

const timestamp = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  dateStyle: 'medium',
  timeStyle: 'short',
})

/** Wraps a value so a comma or a line break inside it cannot split the column. */
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

/**
 * Hands the responses over as a spreadsheet.
 *
 * The BOM is what makes Excel on Windows read the file as UTF-8; without it the
 * Korean names arrive as mojibake, which is the whole list ruined.
 */
function downloadCsv(entries: RsvpEntry[]): void {
  const header = ['이름', '구분', '참석', '인원', '식사', '응답 시각']
  const rows = entries.map((entry) => [
    entry.name,
    entry.side === 'groom' ? '신랑측' : '신부측',
    entry.attending ? '참석' : '불참',
    entry.attending ? entry.headcount : 0,
    entry.attending ? (MEAL_LABEL[entry.meal] ?? '') : '',
    timestamp.format(new Date(entry.createdAt)),
  ])

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = '참석여부.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function RsvpPanel() {
  const [entries, setEntries] = useState<RsvpEntry[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reason, setReason] = useState('')

  const load = useCallback(async () => {
    setState('loading')
    setReason('')
    try {
      setEntries(await withTimeout(listRsvp(), LOAD_TIMEOUT_MS, '응답을 불러오지 못했습니다'))
      setState('ready')
    } catch (error) {
      setReason(describeError(error))
      setState('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (state === 'loading') return <p className={styles.state}>불러오는 중…</p>
  if (state === 'error')
    return (
      <div className={styles.state}>
        <p>불러오지 못했습니다.</p>
        {reason && <p className={styles.stateNote}>{reason}</p>}
        <button type="button" className={styles.ghost} onClick={() => void load()}>
          다시 시도
        </button>
      </div>
    )
  if (entries.length === 0) return <p className={styles.state}>아직 응답이 없습니다.</p>

  const summary = summarise(entries)

  return (
    <>
      <div className={styles.panelBar}>
        <span className={styles.count}>{summary.responses}명 응답</span>
        <span className={styles.barActions}>
          <button type="button" className={styles.ghost} onClick={() => downloadCsv(entries)}>
            엑셀로 내려받기
          </button>
          <button type="button" className={styles.ghost} onClick={() => void load()}>
            새로고침
          </button>
        </span>
      </div>

      <dl className={styles.stats}>
        <div>
          <dt>참석 인원</dt>
          <dd>{summary.guests}명</dd>
        </div>
        <div>
          <dt>신랑측</dt>
          <dd>{summary.groomGuests}명</dd>
        </div>
        <div>
          <dt>신부측</dt>
          <dd>{summary.brideGuests}명</dd>
        </div>
        <div>
          <dt>식사</dt>
          <dd>{summary.meals}명</dd>
        </div>
      </dl>
      <p className={styles.statsNote}>
        불참 {summary.declined}명. 식사 인원에는 &lsquo;미정&rsquo;도 포함해 부족하지 않게 셌습니다.
      </p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>이름</th>
              <th>구분</th>
              <th>참석</th>
              <th>인원</th>
              <th>식사</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} data-declined={!entry.attending}>
                <td>{entry.name}</td>
                <td>{entry.side === 'groom' ? '신랑측' : '신부측'}</td>
                <td>{entry.attending ? '참석' : '불참'}</td>
                <td className={styles.numeric}>{entry.attending ? entry.headcount : '—'}</td>
                <td>{entry.attending ? MEAL_LABEL[entry.meal] : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
