import type { BankAccount } from '../../data/wedding'
import { useContent } from '../../lib/useSiteConfig'
import { copyText } from '../../lib/clipboard'
import { Section } from '../ui/Section'
import { Reveal } from '../ui/Reveal'
import { Accordion } from '../ui/Accordion'
import { useToast } from '../ui/ToastProvider'
import styles from './Accounts.module.css'

function AccountRow({ account }: { account: BankAccount }) {
  const toast = useToast()

  const onCopy = async () => {
    // Just the number — that is what gets pasted into a transfer field.
    const copied = await copyText(account.number)
    toast(copied ? '계좌번호를 복사했어요.' : '복사에 실패했어요. 길게 눌러 복사해 주세요.')
  }

  return (
    <li className={styles.row}>
      <div className={styles.info}>
        <p className={styles.label}>{account.label}</p>
        <p className={styles.number}>
          {account.bank} {account.number}
        </p>
      </div>

      <button type="button" className={styles.copy} onClick={onCopy}>
        복사
      </button>
    </li>
  )
}

export function Accounts() {
  const { accounts } = useContent()
  const sides = [
    { key: 'groom', title: '신랑 측', accounts: accounts.groom },
    { key: 'bride', title: '신부 측', accounts: accounts.bride },
  ].filter((side) => side.accounts.length > 0)

  // Nothing to show beats an empty "마음 전하실 곳" with no accounts in it.
  if (sides.length === 0) return null

  return (
    <Section id="accounts" eyebrow="Gift" title="마음 전하실 곳">
      <Reveal className={styles.note}>
        <p>참석이 어려우신 분들을 위해 계좌번호를 안내드립니다. 축하해 주시는 마음만으로도 감사합니다.</p>
      </Reveal>

      <div className={styles.list}>
        {sides.map((side, index) => (
          <Reveal key={side.key} delay={index * 100}>
            <Accordion title={side.title} subtitle={`${side.accounts.length}개 계좌`}>
              <ul className={styles.rows}>
                {side.accounts.map((account) => (
                  <AccountRow key={`${account.bank}-${account.number}`} account={account} />
                ))}
              </ul>
            </Accordion>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
