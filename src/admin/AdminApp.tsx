import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { describeError, isFirebaseConfigured, withTimeout } from '../lib/firebase'
import {
  deleteGuestbookEntry,
  listGuestbook,
  listRsvp,
  signIn,
  signOut,
  summarise,
  verifyAdmin,
  watchSession,
  NotAnAdminError,
  type AdminSession,
  type RsvpEntry,
} from '../lib/admin'
import type { GuestbookEntry } from '../lib/store'
import styles from './Admin.module.css'

const timestamp = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  dateStyle: 'medium',
  timeStyle: 'short',
})

const LOAD_TIMEOUT_MS = 15_000

const MEAL_LABEL: Record<string, string> = { yes: '식사', no: '식사 안 함', undecided: '미정' }

function LoginForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return

    setBusy(true)
    setError('')
    try {
      await signIn(email.trim(), password)
      await verifyAdmin()
      onDone()
    } catch (caught) {
      if (caught instanceof NotAnAdminError) {
        setError('로그인은 되었지만 관리자 권한이 없는 계정입니다.')
        await signOut()
      } else {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      }
      setBusy(false)
    }
  }

  return (
    <form className={styles.login} onSubmit={onSubmit}>
      <h1 className={styles.loginTitle}>관리자 로그인</h1>
      <p className={styles.loginNote}>청첩장 방명록과 참석 여부를 관리합니다.</p>

      <label className={styles.field}>
        <span>이메일</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          required
        />
      </label>

      <label className={styles.field}>
        <span>비밀번호</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </label>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={styles.primary} disabled={busy}>
        {busy ? '확인 중…' : '로그인'}
      </button>
    </form>
  )
}

function GuestbookPanel() {
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

function RsvpPanel() {
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
        <button type="button" className={styles.ghost} onClick={() => void load()}>
          새로고침
        </button>
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
              <th>연락처</th>
              <th>남긴 말</th>
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
                <td>{entry.phone || '—'}</td>
                <td className={styles.note}>{entry.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function AdminApp() {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState<'guestbook' | 'rsvp'>('guestbook')

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setChecking(false)
      return
    }
    return watchSession((next) => {
      setSession(next)
      setChecking(false)
    })
  }, [])

  if (!isFirebaseConfigured) {
    return (
      <main className={styles.shell}>
        <div className={styles.state}>
          <p>Firebase가 연결되어 있지 않습니다.</p>
          <p className={styles.stateNote}>
            저장소 Secrets에 VITE_FIREBASE_* 값 6개를 등록하고 다시 배포하면 이 페이지가 동작합니다.
          </p>
        </div>
      </main>
    )
  }

  if (checking) {
    return (
      <main className={styles.shell}>
        <p className={styles.state}>확인 중…</p>
      </main>
    )
  }

  if (!session) {
    return (
      <main className={styles.shell}>
        <LoginForm onDone={() => undefined} />
      </main>
    )
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>청첩장 관리</h1>
          <p className={styles.who}>{session.email}</p>
        </div>
        <button type="button" className={styles.ghost} onClick={() => void signOut()}>
          로그아웃
        </button>
      </header>

      <nav className={styles.tabs}>
        <button type="button" data-active={tab === 'guestbook'} onClick={() => setTab('guestbook')}>
          방명록
        </button>
        <button type="button" data-active={tab === 'rsvp'} onClick={() => setTab('rsvp')}>
          참석 여부
        </button>
      </nav>

      {tab === 'guestbook' ? <GuestbookPanel /> : <RsvpPanel />}
    </main>
  )
}
