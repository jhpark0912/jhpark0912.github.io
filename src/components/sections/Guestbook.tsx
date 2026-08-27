import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useContent } from '../../lib/useSiteConfig'
import { MESSAGE_MAX, NAME_MAX, store, type GuestbookEntry } from '../../lib/store'
import { describeError, withTimeout } from '../../lib/firebase'
import { useInView } from '../../hooks/useInView'
import { Section } from '../ui/Section'
import { Reveal } from '../ui/Reveal'
import { Button } from '../ui/Button'
import { BottomSheet } from '../ui/BottomSheet'
import { useToast } from '../ui/ToastProvider'
import form from '../ui/Form.module.css'
import styles from './Guestbook.module.css'

/** Long enough for a slow phone connection, short enough not to look frozen. */
const LOAD_TIMEOUT_MS = 15_000

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function Guestbook() {
  const [sectionRef, inView] = useInView<HTMLDivElement>()
  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [ownerId, setOwnerId] = useState('')
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [loadError, setLoadError] = useState('')
  /**
   * How many times 더보기 has been pressed, rather than a message count: the
   * step comes from the admin config, which can arrive after the first render.
   */
  const [extraSteps, setExtraSteps] = useState(0)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const toast = useToast()
  const { guestbook } = useContent()
  const step = guestbook.pageSize

  const load = useCallback(async () => {
    setLoadState('loading')
    setLoadError('')
    try {
      const [list, id] = await withTimeout(
        Promise.all([store.listGuestbook(), store.getOwnerId()]),
        LOAD_TIMEOUT_MS,
        '메시지를 불러오지 못했습니다',
      )
      setEntries(list)
      setOwnerId(id)
      setLoadState('ready')
    } catch (error) {
      setLoadError(describeError(error))
      setLoadState('error')
    }
  }, [])

  // Nothing is fetched until the section is nearly on screen.
  useEffect(() => {
    if (!inView || loadState !== 'idle') return
    void load()
  }, [inView, loadState, load])

  const limit = step * (extraSteps + 1)
  const remaining = Math.max(0, entries.length - limit)
  const visible = useMemo(() => entries.slice(0, limit), [entries, limit])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return

    const trimmedName = name.trim()
    const trimmedMessage = message.trim()

    if (!trimmedName) {
      setError('성함을 입력해 주세요.')
      return
    }
    if (!trimmedMessage) {
      setError('축하 메시지를 입력해 주세요.')
      return
    }

    setError('')
    setSaving(true)
    try {
      const { entry, saved } = await store.addGuestbook({ name: trimmedName, message: trimmedMessage })

      // Show it right away — waiting on the server acknowledgement here is what
      // made submitting feel like it hung on a slow connection.
      setEntries((current) => [entry, ...current])
      if (!ownerId) setOwnerId(entry.ownerId)
      setName('')
      setMessage('')
      setOpen(false)
      toast('축하 메시지를 남겼어요.')

      // If the server refuses it after all, take the message back out.
      saved.catch(() => {
        setEntries((current) => current.filter((item) => item.id !== entry.id))
        toast('메시지를 저장하지 못했어요. 다시 시도해 주세요.')
      })
    } catch {
      setError('저장에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (entry: GuestbookEntry) => {
    if (!window.confirm('남기신 메시지를 삭제할까요?')) return
    try {
      await store.removeGuestbook(entry.id)
      setEntries((current) => current.filter((item) => item.id !== entry.id))
      toast('메시지를 삭제했어요.')
    } catch {
      toast('삭제에 실패했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <Section id="guestbook" eyebrow="Guestbook" title="축하 메시지" compact>
      <div ref={sectionRef}>
        <Reveal className={styles.intro}>
          <p>{guestbook.note}</p>
        </Reveal>

        {loadState === 'loading' && <p className={styles.state}>메시지를 불러오는 중입니다…</p>}

        {loadState === 'error' && (
          <div className={styles.state}>
            <p>메시지를 불러오지 못했어요.</p>
            {/* The reason is what makes a report actionable when someone
                tells the couple the guestbook is broken. */}
            {loadError && <p className={styles.reason}>{loadError}</p>}
            <Button variant="outline" size="sm" onClick={() => void load()}>
              다시 시도
            </Button>
          </div>
        )}

        {loadState === 'ready' && entries.length === 0 && (
          <p className={styles.state}>아직 남겨진 메시지가 없어요. 첫 축하를 남겨주세요.</p>
        )}

        {visible.length > 0 && (
          <ul className={styles.list}>
            {visible.map((entry) => (
              <li key={entry.id} className={styles.card}>
                <div className={styles.cardHead}>
                  <p className={styles.name}>{entry.name}</p>
                  <p className={styles.time}>{dateFormatter.format(new Date(entry.createdAt))}</p>
                </div>
                <p className={styles.message}>{entry.message}</p>

                {/* Only the browser that wrote a message can remove it. */}
                {entry.ownerId && entry.ownerId === ownerId && (
                  <button type="button" className={styles.delete} onClick={() => void onDelete(entry)}>
                    삭제
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {remaining > 0 && (
          <button type="button" className={styles.more} onClick={() => setExtraSteps((value) => value + 1)}>
            더보기 <span className={styles.moreCount}>{remaining}</span>
          </button>
        )}

        <Reveal delay={100} className={styles.writeWrap}>
          <Button block onClick={() => setOpen(true)}>
            축하 메시지 남기기
          </Button>
        </Reveal>
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="축하 메시지 남기기">
        <form className={form.form} onSubmit={onSubmit} noValidate>
          <div className={form.field}>
            <label className={`${form.label} ${form.required}`} htmlFor="guestbook-name">
              성함
            </label>
            <input
              id="guestbook-name"
              className={form.input}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="성함을 입력해 주세요"
              autoComplete="name"
              maxLength={NAME_MAX}
              required
            />
          </div>

          <div className={form.field}>
            <label className={`${form.label} ${form.required}`} htmlFor="guestbook-message">
              축하 메시지
            </label>
            <textarea
              id="guestbook-message"
              className={form.textarea}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="두 사람에게 전하고 싶은 말을 남겨주세요."
              maxLength={MESSAGE_MAX}
              required
            />
            <span className={form.counter}>
              {message.length} / {MESSAGE_MAX}
            </span>
          </div>

          {error && (
            <p className={form.error} role="alert">
              {error}
            </p>
          )}

          <Button type="submit" block disabled={saving}>
            {saving ? '남기는 중…' : '남기기'}
          </Button>

          <p className={form.hint}>
            메시지는 이 브라우저에서만 삭제할 수 있어요. 수정이 필요하시면 신랑 신부에게 말씀해 주세요.
          </p>
        </form>
      </BottomSheet>
    </Section>
  )
}
