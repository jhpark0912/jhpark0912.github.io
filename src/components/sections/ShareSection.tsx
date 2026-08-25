import { useState } from 'react'
import { useContent } from '../../lib/useSiteConfig'
import { hasKakaoKey, loadKakaoShare } from '../../lib/kakao'
import { copyText } from '../../lib/clipboard'
import { Section } from '../ui/Section'
import { Reveal } from '../ui/Reveal'
import { Button } from '../ui/Button'
import { useToast } from '../ui/ToastProvider'
import styles from './ShareSection.module.css'

export function ShareSection() {
  const [sharing, setSharing] = useState(false)
  const toast = useToast()
  const { meta } = useContent()
  // Prefer the address the guest actually opened, so a preview deploy shares itself.
  const url = typeof window !== 'undefined' ? window.location.href : meta.url

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
    <Section id="share" eyebrow="Share" title="청첩장 공유하기" tinted>
      <Reveal className={styles.actions}>
        {hasKakaoKey && (
          <Button block onClick={onKakaoShare} disabled={sharing} className={styles.kakao}>
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path
                d="M10 3.2c-3.8 0-6.9 2.4-6.9 5.4 0 1.9 1.3 3.6 3.2 4.5l-.8 2.9c-.1.3.2.5.4.3l3.4-2.3c.2 0 .5.1.7.1 3.8 0 6.9-2.4 6.9-5.5S13.8 3.2 10 3.2Z"
                fill="currentColor"
              />
            </svg>
            카카오톡으로 공유하기
          </Button>
        )}

        <Button block variant="outline" onClick={onCopyLink}>
          링크 복사하기
        </Button>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <Button block variant="outline" onClick={onSystemShare}>
            다른 앱으로 공유하기
          </Button>
        )}
      </Reveal>
    </Section>
  )
}
