import { useState } from 'react'
import { useContent } from '../../lib/useSiteConfig'
import { loadKakaoShare } from '../../lib/kakao'
import { copyText } from '../../lib/clipboard'
import { Button } from './Button'
import { useToast } from './ToastProvider'
import styles from './ShareButtons.module.css'

/** A quiet row of small share actions — it lives in the footer, not in a section of its own. */
export function ShareButtons({ className }: { className?: string }) {
  const [sharing, setSharing] = useState(false)
  const toast = useToast()
  const { meta } = useContent()
  /*
   * Always the invitation's own address, never the tab's.
   *
   * This used to read `window.location.href`, on the reasoning that a preview
   * deploy should share itself. What it actually did was hand out whatever
   * address the button happened to be pressed from — and a message sent from
   * KakaoTalk keeps its link forever, so one press from the dev server put a
   * permanent `http://localhost:5173/` in a chat room. `/?preview=draft`, the
   * link the admin page opens to preview an unpublished edit, went out the same
   * way. There is one address guests should ever receive, and it is this one.
   */
  const url = meta.url

  const onKakaoShare = async () => {
    if (sharing) return
    setSharing(true)
    try {
      const kakao = await loadKakaoShare()
      kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: meta.title,
          description: meta.description,
          imageUrl: meta.shareImage,
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons: [{ title: '청첩장 보기', link: { mobileWebUrl: url, webUrl: url } }],
      })
    } catch {
      toast('카카오톡 공유를 열지 못했어요. 링크를 복사해 주세요.')
    } finally {
      setSharing(false)
    }
  }

  const onCopyLink = async () => {
    const copied = await copyText(url)
    toast(copied ? '청첩장 링크를 복사했어요.' : '복사에 실패했어요. 주소창의 링크를 복사해 주세요.')
  }

  const onSystemShare = async () => {
    try {
      await navigator.share({ title: meta.title, text: meta.description, url })
    } catch {
      // The guest dismissed the sheet — nothing to report.
    }
  }

  return (
    <div className={[styles.row, className].filter(Boolean).join(' ')}>
      {/* The venue map needs the Kakao key anyway, so it is always there — no
          point hiding this button behind a check that can only fail when the
          map is already broken. A missing key just falls through to the toast. */}
      <Button size="sm" variant="outline" onClick={onKakaoShare} disabled={sharing}>
        <span className={styles.kakaoIcon} aria-hidden="true" />
        카톡 공유
      </Button>

      <Button size="sm" variant="outline" onClick={onCopyLink}>
        <span aria-hidden="true">🔗</span>
        링크 복사
      </Button>

      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <Button size="sm" variant="outline" onClick={onSystemShare}>
          <span aria-hidden="true">↗</span>
          공유
        </Button>
      )}
    </div>
  )
}
