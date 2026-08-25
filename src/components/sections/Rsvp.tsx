import { useState, type FormEvent } from 'react'
import { useContent } from '../../lib/useSiteConfig'
import { store, type MealChoice, type RsvpSide } from '../../lib/store'
import { formatKoreanDate } from '../../lib/date'
import { Section } from '../ui/Section'
import { Reveal } from '../ui/Reveal'
import { Button } from '../ui/Button'
import { BottomSheet } from '../ui/BottomSheet'
import form from '../ui/Form.module.css'
import styles from './Rsvp.module.css'

const MAX_HEADCOUNT = 10

interface FormState {
  side: RsvpSide
  name: string
  attending: boolean
  headcount: number
  meal: MealChoice
  phone: string
  note: string
}

const initialState: FormState = {
  side: 'groom',
  name: '',
  attending: true,
  headcount: 1,
  meal: 'yes',
  phone: '',
  note: '',
}

export function Rsvp() {
  const wedding = useContent()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<FormState>(initialState)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'editing' | 'saving' | 'done'>('editing')

  const deadline = new Date(wedding.rsvp.deadline)
  const isClosed = deadline.getTime() < Date.now()

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((current) => ({ ...current, [key]: value }))

  const openSheet = () => {
    setState(initialState)
    setError('')
    setStatus('editing')
    setOpen(true)
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (status === 'saving') return

    const name = state.name.trim()
    if (!name) {
      setError('성함을 입력해 주세요.')
      return
    }

    setError('')
    setStatus('saving')
    try {
      await store.submitRsvp({
        side: state.side,
        name,
        attending: state.attending,
        // A guest who cannot come still counts as zero heads, not one.
        headcount: state.attending ? state.headcount : 0,
        meal: state.attending ? state.meal : 'no',
        phone: state.phone.trim(),
        note: state.note.trim(),
      })
      setStatus('done')
    } catch {
      setStatus('editing')
      setError('전송에 실패했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <Section id="rsvp" eyebrow="R.S.V.P" title="참석 여부 전하기" tinted>
      <Reveal className={styles.card}>
        <p className={styles.note}>{wedding.rsvp.note}</p>
        <p className={styles.deadline}>
          {isClosed ? '참석 여부 조사가 마감되었습니다.' : `${formatKoreanDate(deadline)}까지 알려주세요.`}
        </p>
        <Button block onClick={openSheet} disabled={isClosed}>
          참석 여부 전하기
        </Button>
      </Reveal>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="참석 여부 전하기"
        description={status === 'done' ? undefined : '알려주신 내용은 예식 준비에만 사용됩니다.'}
      >
        {status === 'done' ? (
          <div className={styles.done}>
            <p className={styles.doneTitle}>소중한 마음 감사합니다.</p>
            <p className={styles.doneBody}>참석 여부가 잘 전달되었습니다.</p>
            <Button block variant="outline" onClick={() => setOpen(false)}>
              닫기
            </Button>
          </div>
        ) : (
          <form className={form.form} onSubmit={onSubmit} noValidate>
            <div className={form.field}>
              <span className={form.label}>어느 분의 하객이신가요?</span>
              <div className={form.choices}>
                {(
                  [
                    { value: 'groom', label: `신랑 ${wedding.groom.name}` },
                    { value: 'bride', label: `신부 ${wedding.bride.name}` },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={form.choice}
                    aria-pressed={state.side === option.value}
                    onClick={() => update('side', option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={form.field}>
              <label className={`${form.label} ${form.required}`} htmlFor="rsvp-name">
                성함
              </label>
              <input
                id="rsvp-name"
                className={form.input}
                value={state.name}
                onChange={(event) => update('name', event.target.value)}
                placeholder="성함을 입력해 주세요"
                autoComplete="name"
                maxLength={20}
                required
              />
            </div>

            <div className={form.field}>
              <span className={form.label}>참석 여부</span>
              <div className={form.choices}>
                {(
                  [
                    { value: true, label: '참석합니다' },
                    { value: false, label: '어렵습니다' },
                  ] as const
                ).map((option) => (
                  <button
                    key={String(option.value)}
                    type="button"
                    className={form.choice}
                    aria-pressed={state.attending === option.value}
                    onClick={() => update('attending', option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {state.attending && (
              <>
                <div className={form.field}>
                  <span className={form.label}>동행 포함 인원</span>
                  <div className={form.stepper}>
                    <button
                      type="button"
                      className={form.stepperButton}
                      onClick={() => update('headcount', Math.max(1, state.headcount - 1))}
                      disabled={state.headcount <= 1}
                      aria-label="인원 줄이기"
                    >
                      −
                    </button>
                    <span className={form.stepperValue} aria-live="polite">
                      {state.headcount}명
                    </span>
                    <button
                      type="button"
                      className={form.stepperButton}
                      onClick={() => update('headcount', Math.min(MAX_HEADCOUNT, state.headcount + 1))}
                      disabled={state.headcount >= MAX_HEADCOUNT}
                      aria-label="인원 늘리기"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className={form.field}>
                  <span className={form.label}>식사 여부</span>
                  <div className={form.choices}>
                    {(
                      [
                        { value: 'yes', label: '예정' },
                        { value: 'no', label: '안 함' },
                        { value: 'undecided', label: '미정' },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={form.choice}
                        aria-pressed={state.meal === option.value}
                        onClick={() => update('meal', option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className={form.field}>
              <label className={form.label} htmlFor="rsvp-phone">
                연락처 <span className={form.hint}>(선택)</span>
              </label>
              <input
                id="rsvp-phone"
                className={form.input}
                value={state.phone}
                onChange={(event) => update('phone', event.target.value)}
                placeholder="010-0000-0000"
                inputMode="tel"
                autoComplete="tel"
                maxLength={20}
              />
            </div>

            <div className={form.field}>
              <label className={form.label} htmlFor="rsvp-note">
                전하고 싶은 말 <span className={form.hint}>(선택)</span>
              </label>
              <textarea
                id="rsvp-note"
                className={form.textarea}
                value={state.note}
                onChange={(event) => update('note', event.target.value)}
                placeholder="알레르기, 유아 동반 등 알려주실 내용이 있다면 적어주세요."
                maxLength={200}
              />
            </div>

            {error && (
              <p className={form.error} role="alert">
                {error}
              </p>
            )}

            <Button type="submit" block disabled={status === 'saving'}>
              {status === 'saving' ? '전송 중…' : '전하기'}
            </Button>
          </form>
        )}
      </BottomSheet>
    </Section>
  )
}
