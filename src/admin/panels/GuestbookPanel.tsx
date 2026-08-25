import { useCallback, useEffect, useState } from 'react'
import { describeError, withTimeout } from '../../lib/firebase'
import { deleteGuestbookEntry, listGuestbook } from '../../lib/admin'
import type { GuestbookEntry } from '../../lib/store'
import styles from '../Admin.module.css'

const LOAD_TIMEOUT_MS = 15_000

const timestamp = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function GuestbookPanel() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reason, setReason] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    setState('loading')
    setReason('')
    try {
      setEntries(await withTimeout(listGuestbook(), LOAD_TIMEOUT_MS, '방명록을 불러오지 못했습니다'))
      setState('ready')
    } catch (error) {
      setReason(describeError(error))
      setState('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onDelete = async (entry: GuestbookEntry) => {
    if (!window.confirm(`"${entry.name}" 님의 메시지를 삭제할까요?`)) return
    setBusyId(entry.id)
    try {
      await deleteGuestbookEntry(entry.id)
      setEntries((current) => current.filter((item) => item.id !== entry.id))
    } catch {
      window.alert('삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusyId('')
    }
  }

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
  if (entries.length === 0) return <p className={styles.state}>남겨진 메시지가 없습니다.</p>

  return (
    <>
      <div className={styles.panelBar}>
        <span className={styles.count}>{entries.length}개</span>
        <button type="button" className={styles.ghost} onClick={() => void load()}>
          새로고침
        </button>
      </div>

      <ul className={styles.cards}>
        {entries.map((entry) => (
          <li key={entry.id} className={styles.card}>
            <div className={styles.cardHead}>
              <strong>{entry.name}</strong>
              <time>{timestamp.format(new Date(entry.createdAt))}</time>
            </div>
            <p className={styles.message}>{entry.message}</p>
            <button
              type="button"
              className={styles.danger}
              onClick={() => void onDelete(entry)}
              disabled={busyId === entry.id}
            >
              {busyId === entry.id ? '삭제 중…' : '삭제'}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
