import { useEffect, useState, type FormEvent } from 'react'
import { describeError, isFirebaseConfigured } from '../lib/firebase'
import { signIn, signOut, verifyAdmin, watchSession, NotAnAdminError, type AdminSession } from '../lib/admin'
import { DraftProvider, useDraft } from './DraftProvider'
import { ContentPanel } from './panels/ContentPanel'
import { PhotosPanel } from './panels/PhotosPanel'
import { SectionsPanel } from './panels/SectionsPanel'
import { GuestbookPanel } from './panels/GuestbookPanel'
import { RsvpPanel } from './panels/RsvpPanel'
import styles from './Admin.module.css'

/**
 * Signs in and nothing more.
 *
 * Whether the account is an admin is checked by AdminApp, not here: a
 * successful sign-in unmounts this form immediately, so any message set after
 * that point would vanish with it.
 */
function LoginForm({ notice }: { notice: string }) {
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
      // On success this component is about to unmount; leave `busy` set so the
      // button cannot be pressed twice in the meantime.
    } catch {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setBusy(false)
    }
  }

  return (
    <form className={styles.login} onSubmit={onSubmit}>
      <h1 className={styles.loginTitle}>관리자 로그인</h1>
      <p className={styles.loginNote}>청첩장 내용과 방명록을 관리합니다.</p>

      {notice && (
        <div className={styles.notice} role="alert">
          {notice}
        </div>
      )}

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

type Tab = 'content' | 'photos' | 'sections' | 'guestbook' | 'rsvp'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'content', label: '내용' },
  { id: 'photos', label: '사진' },
  { id: 'sections', label: '순서' },
  { id: 'guestbook', label: '방명록' },
  { id: 'rsvp', label: '참석 여부' },
]

/** The tabs that edit the draft, and therefore need the save bar above them. */
const EDITING_TABS = new Set<Tab>(['content', 'photos', 'sections'])

/**
 * Saving and publishing, kept apart on purpose.
 *
 * 임시저장 writes the draft, which nobody but an admin can read. 게시하기 copies
 * that draft over the document the invitation actually serves. Splitting them
 * is what makes it safe to edit the invitation while guests are reading it.
 */
function SaveBar() {
  const { unsaved, unpublished, busy, save, publish } = useDraft()
  const [message, setMessage] = useState('')

  const run = async (action: () => Promise<void>, done: string) => {
    setMessage('')
    try {
      await action()
      setMessage(done)
    } catch (error) {
      setMessage(`실패했습니다 (${describeError(error)})`)
    }
  }

  const state = unsaved ? '저장하지 않은 변경이 있습니다' : unpublished ? '게시하면 하객에게 반영됩니다' : '모두 게시되었습니다'

  return (
    <div className={styles.saveBar} data-dirty={unsaved || unpublished}>
      <div className={styles.saveState}>
        <span>{state}</span>
        {message && <span className={styles.saveMessage}>{message}</span>}
      </div>

      <div className={styles.saveActions}>
        {/* Previewing loads the draft document, so it only shows what has been
            saved — never what is merely typed in. */}
        {unsaved ? (
          <span className={styles.previewHint}>임시저장하면 미리보기를 열 수 있습니다</span>
        ) : (
          <a className={styles.ghost} href="/?preview=draft" target="_blank" rel="noreferrer noopener">
            미리보기
          </a>
        )}

        <button
          type="button"
          className={styles.ghost}
          onClick={() => void run(save, '임시저장했습니다.')}
          disabled={!unsaved || busy !== 'idle'}
        >
          {busy === 'saving' ? '저장 중…' : '임시저장'}
        </button>

        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            if (!window.confirm('지금 내용을 하객에게 공개할까요?')) return
            void run(publish, '게시했습니다.')
          }}
          disabled={busy !== 'idle'}
        >
          {busy === 'publishing' ? '게시 중…' : '게시하기'}
        </button>
      </div>
    </div>
  )
}

function Workspace({ session }: { session: AdminSession | null }) {
  const [tab, setTab] = useState<Tab>('content')
  const { status, reason, reload } = useDraft()

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>청첩장 관리</h1>
          <p className={styles.who}>{session ? session.email : '연습 모드 · 이 브라우저에만 저장됩니다'}</p>
        </div>
        {session && (
          <button type="button" className={styles.ghost} onClick={() => void signOut()}>
            로그아웃
          </button>
        )}
      </header>

      {!session && (
        <div className={styles.notice}>
          Firebase가 연결되어 있지 않아 모든 변경이 이 브라우저에만 저장됩니다. 화면과 순서는 실제와 똑같으니 미리
          만들어 보는 용도로 쓰시고, 실제 청첩장에 반영하려면 Firebase를 연결한 뒤 다시 입력해 주세요.
        </div>
      )}

      <nav className={styles.tabs}>
        {TABS.map((item) => (
          <button key={item.id} type="button" data-active={tab === item.id} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>

      {EDITING_TABS.has(tab) && status === 'ready' && <SaveBar />}

      {EDITING_TABS.has(tab) && status === 'loading' && <p className={styles.state}>설정을 불러오는 중…</p>}

      {EDITING_TABS.has(tab) && status === 'error' && (
        <div className={styles.state}>
          <p>설정을 불러오지 못했습니다.</p>
          {reason && <p className={styles.stateNote}>{reason}</p>}
          <button type="button" className={styles.ghost} onClick={() => void reload()}>
            다시 시도
          </button>
        </div>
      )}

      {status === 'ready' && tab === 'content' && <ContentPanel />}
      {status === 'ready' && tab === 'photos' && <PhotosPanel />}
      {status === 'ready' && tab === 'sections' && <SectionsPanel />}
      {tab === 'guestbook' && <GuestbookPanel />}
      {tab === 'rsvp' && <RsvpPanel />}
    </main>
  )
}

export default function AdminApp() {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [checking, setChecking] = useState(true)
  const [access, setAccess] = useState<'unknown' | 'granted'>('unknown')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setChecking(false)
      return
    }
    return watchSession((next) => {
      setSession(next)
      setChecking(false)
      if (!next) setAccess('unknown')
    })
  }, [])

  /*
   * Signing in proves who someone is; it does not make them an admin. The
   * check lives here rather than in the login form because a rejected account
   * gets signed out again, and the explanation has to outlive that.
   */
  useEffect(() => {
    if (!session || access === 'granted') return

    let cancelled = false
    void (async () => {
      try {
        await verifyAdmin()
        if (!cancelled) {
          setAccess('granted')
          setNotice('')
        }
      } catch (error) {
        if (cancelled) return
        setNotice(
          error instanceof NotAnAdminError
            ? `이 계정에는 관리자 권한이 없습니다. Firestore의 admins 컬렉션에 문서 ID를 "${session.uid}" 로 하는 문서를 추가한 뒤 다시 로그인해 주세요.`
            : `권한을 확인하지 못했습니다 (${describeError(error)}). 보안 규칙이 게시되어 있는지 확인해 주세요.`,
        )
        await signOut()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [session, access])

  /*
   * Without Firebase there is nothing to sign in to and nothing to protect:
   * every read and write falls back to this browser's own storage. The page
   * opens straight into the editor so the whole flow can be tried out before
   * the project is connected — with a banner saying exactly that.
   */
  if (!isFirebaseConfigured) {
    return (
      <DraftProvider>
        <Workspace session={null} />
      </DraftProvider>
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
        <LoginForm notice={notice} />
      </main>
    )
  }

  if (access !== 'granted') {
    return (
      <main className={styles.shell}>
        <p className={styles.state}>권한 확인 중…</p>
      </main>
    )
  }

  return (
    <DraftProvider>
      <Workspace session={session} />
    </DraftProvider>
  )
}
