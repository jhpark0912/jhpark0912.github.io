/**
 * Everything on the invitation that is words rather than pictures or order.
 *
 * Each control writes straight into the draft. Nothing here validates beyond
 * what would break rendering — an empty field is a legitimate instruction on
 * this invitation, because the sections are built to hide what has no value:
 * clear both accounts and the gift section disappears, clear a phone number and
 * that person drops out of the contact card.
 */

import type { BankAccount, Host, TransportGuide, WeddingContent } from '../../data/wedding'
import { fromKstInputValue, toKstInputValue } from '../../lib/date'
import { useDraft } from '../DraftProvider'
import { Area, Check, Group, Lines, ListCard, Row, Text, move } from '../Fields'
import styles from '../Admin.module.css'

function HostFields({
  title,
  host,
  onChange,
}: {
  title: string
  host: Host
  onChange: (host: Host) => void
}) {
  const set = <K extends keyof Host>(key: K, value: Host[K]) => onChange({ ...host, [key]: value })

  return (
    <Group title={title}>
      <Row>
        <Text label="이름" value={host.name} onChange={(value) => set('name', value)} maxLength={20} />
        <Text
          label="영문 이름"
          hint="인트로와 마지막 인사에 쓰입니다"
          value={host.nameEn}
          onChange={(value) => set('nameEn', value)}
          maxLength={30}
        />
      </Row>
      <Row>
        <Text
          label="연락처"
          hint="비우면 연락하기에서 빠집니다"
          type="tel"
          value={host.phone}
          onChange={(value) => set('phone', value)}
          placeholder="010-0000-0000"
        />
        <Text
          label="호칭"
          hint="예: 신랑, 신부"
          value={host.label}
          onChange={(value) => set('label', value)}
          maxLength={10}
        />
      </Row>
      <Row>
        <Text label="아버지" value={host.father} onChange={(value) => set('father', value)} maxLength={20} />
        <Text label="어머니" value={host.mother} onChange={(value) => set('mother', value)} maxLength={20} />
      </Row>
      <Row>
        <Check
          label="아버지 고인"
          value={Boolean(host.fatherDeceased)}
          onChange={(value) => set('fatherDeceased', value)}
        />
        <Check
          label="어머니 고인"
          value={Boolean(host.motherDeceased)}
          onChange={(value) => set('motherDeceased', value)}
        />
      </Row>
      <Text
        label="서열"
        hint="예: 장남, 차녀. 비우면 문구에서 빠집니다"
        value={host.order}
        onChange={(value) => set('order', value)}
        maxLength={10}
      />
    </Group>
  )
}

function AccountList({
  title,
  accounts,
  onChange,
}: {
  title: string
  accounts: BankAccount[]
  onChange: (accounts: BankAccount[]) => void
}) {
  const set = (index: number, key: keyof BankAccount, value: string) =>
    onChange(accounts.map((account, i) => (i === index ? { ...account, [key]: value } : account)))

  return (
    <div className={styles.subList}>
      <div className={styles.subListHead}>
        <h3 className={styles.subListTitle}>{title}</h3>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => onChange([...accounts, { label: '', bank: '', number: '', holder: '' }])}
        >
          계좌 추가
        </button>
      </div>

      {accounts.length === 0 ? (
        <p className={styles.emptyNote}>등록된 계좌가 없습니다. 양쪽 모두 비어 있으면 섹션 전체가 숨겨집니다.</p>
      ) : (
        accounts.map((account, index) => (
          <ListCard
            key={index}
            title={`${index + 1}번째 계좌`}
            onMoveUp={index > 0 ? () => onChange(move(accounts, index, index - 1)) : undefined}
            onMoveDown={index < accounts.length - 1 ? () => onChange(move(accounts, index, index + 1)) : undefined}
            onRemove={() => onChange(accounts.filter((_, i) => i !== index))}
          >
            <Row>
              <Text
                label="표시 이름"
                hint="예: 신랑 박재현"
                value={account.label}
                onChange={(value) => set(index, 'label', value)}
              />
              <Text label="예금주" value={account.holder} onChange={(value) => set(index, 'holder', value)} />
            </Row>
            <Row>
              <Text label="은행" value={account.bank} onChange={(value) => set(index, 'bank', value)} />
              <Text
                label="계좌번호"
                value={account.number}
                onChange={(value) => set(index, 'number', value)}
                placeholder="000-0000-0000"
              />
            </Row>
          </ListCard>
        ))
      )}
    </div>
  )
}

function TransportList({
  guides,
  onChange,
}: {
  guides: TransportGuide[]
  onChange: (guides: TransportGuide[]) => void
}) {
  return (
    <div className={styles.subList}>
      <div className={styles.subListHead}>
        <h3 className={styles.subListTitle}>교통편 안내</h3>
        <button type="button" className={styles.ghost} onClick={() => onChange([...guides, { title: '', lines: [] }])}>
          항목 추가
        </button>
      </div>

      {guides.length === 0 ? (
        <p className={styles.emptyNote}>등록된 안내가 없습니다.</p>
      ) : (
        guides.map((guide, index) => (
          <ListCard
            key={index}
            title={guide.title || `${index + 1}번째 안내`}
            onMoveUp={index > 0 ? () => onChange(move(guides, index, index - 1)) : undefined}
            onMoveDown={index < guides.length - 1 ? () => onChange(move(guides, index, index + 1)) : undefined}
            onRemove={() => onChange(guides.filter((_, i) => i !== index))}
          >
            <Text
              label="제목"
              hint="예: 지하철, 주차"
              value={guide.title}
              onChange={(value) =>
                onChange(guides.map((item, i) => (i === index ? { ...item, title: value } : item)))
              }
            />
            <Lines
              label="안내 문구"
              value={guide.lines}
              rows={3}
              onChange={(lines) => onChange(guides.map((item, i) => (i === index ? { ...item, lines } : item)))}
            />
          </ListCard>
        ))
      )}
    </div>
  )
}

export function ContentPanel() {
  const { config, editContent } = useDraft()
  const content = config.content

  const patch = (update: Partial<WeddingContent>) => editContent((current) => ({ ...current, ...update }))

  return (
    <div className={styles.editor}>
      <Group title="예식" note="날짜와 시간은 한국 시간 기준으로 저장됩니다.">
        <Text
          label="예식 일시"
          type="datetime-local"
          value={toKstInputValue(content.date)}
          onChange={(value) => {
            const iso = fromKstInputValue(value)
            // An empty or half-typed value would leave the countdown showing
            // "Invalid Date"; keep the last good one until the field is whole.
            if (iso && !Number.isNaN(new Date(iso).getTime())) patch({ date: iso })
          }}
        />
      </Group>

      <HostFields title="신랑" host={content.groom} onChange={(groom) => patch({ groom })} />
      <HostFields title="신부" host={content.bride} onChange={(bride) => patch({ bride })} />

      <Group title="인사말">
        <Lines
          label="시 구절"
          value={content.greeting.poem}
          rows={4}
          onChange={(poem) => patch({ greeting: { ...content.greeting, poem } })}
        />
        <Lines
          label="인사 문구"
          value={content.greeting.message}
          rows={5}
          onChange={(message) => patch({ greeting: { ...content.greeting, message } })}
        />
      </Group>

      <Group title="예식장" note="좌표를 비워두면 주소를 지도에서 자동으로 찾습니다.">
        <Row>
          <Text
            label="예식장 이름"
            value={content.venue.name}
            onChange={(name) => patch({ venue: { ...content.venue, name } })}
          />
          <Text
            label="홀"
            value={content.venue.hall}
            onChange={(hall) => patch({ venue: { ...content.venue, hall } })}
          />
        </Row>
        <Text
          label="주소"
          value={content.venue.address}
          onChange={(address) => patch({ venue: { ...content.venue, address } })}
        />
        <Row>
          <Text
            label="상세 주소"
            value={content.venue.addressDetail}
            onChange={(addressDetail) => patch({ venue: { ...content.venue, addressDetail } })}
          />
          <Text
            label="대표번호"
            hint="비우면 전화 링크가 숨겨집니다"
            type="tel"
            value={content.venue.tel}
            onChange={(tel) => patch({ venue: { ...content.venue, tel } })}
          />
        </Row>
        <Row>
          <Text
            label="위도"
            hint="선택"
            value={content.venue.lat === null ? '' : String(content.venue.lat)}
            onChange={(value) =>
              patch({ venue: { ...content.venue, lat: value.trim() === '' ? null : Number(value) } })
            }
            placeholder="37.5776"
          />
          <Text
            label="경도"
            hint="선택"
            value={content.venue.lng === null ? '' : String(content.venue.lng)}
            onChange={(value) =>
              patch({ venue: { ...content.venue, lng: value.trim() === '' ? null : Number(value) } })
            }
            placeholder="126.8895"
          />
        </Row>

        <TransportList
          guides={content.venue.transport}
          onChange={(transport) => patch({ venue: { ...content.venue, transport } })}
        />
      </Group>

      <Group title="마음 전하실 곳" note="양쪽 모두 계좌가 없으면 이 섹션은 청첩장에 나타나지 않습니다.">
        <AccountList
          title="신랑 측"
          accounts={content.accounts.groom}
          onChange={(groom) => patch({ accounts: { ...content.accounts, groom } })}
        />
        <AccountList
          title="신부 측"
          accounts={content.accounts.bride}
          onChange={(bride) => patch({ accounts: { ...content.accounts, bride } })}
        />
      </Group>

      <Group title="참석 여부">
        <Area
          label="안내 문구"
          value={content.rsvp.note}
          rows={3}
          onChange={(note) => patch({ rsvp: { ...content.rsvp, note } })}
        />
        <Text
          label="응답 마감"
          hint="이 시각이 지나면 폼이 닫힙니다"
          type="datetime-local"
          value={toKstInputValue(content.rsvp.deadline)}
          onChange={(value) => {
            const iso = fromKstInputValue(value)
            if (iso && !Number.isNaN(new Date(iso).getTime())) patch({ rsvp: { ...content.rsvp, deadline: iso } })
          }}
        />
      </Group>

      <Group title="축하 메시지">
        <Area
          label="안내 문구"
          value={content.guestbook.note}
          rows={2}
          onChange={(note) => patch({ guestbook: { ...content.guestbook, note } })}
        />
        <Text
          label="한 페이지에 보여줄 개수"
          type="number"
          value={String(content.guestbook.pageSize)}
          onChange={(value) => {
            const size = Math.round(Number(value))
            if (Number.isFinite(size) && size >= 1) patch({ guestbook: { ...content.guestbook, pageSize: size } })
          }}
        />
      </Group>

      <Group
        title="공유 정보"
        note="카카오톡으로 공유할 때 보이는 카드 내용입니다. 링크 미리보기(OG 태그)는 배포 시점에 고정되므로, 이곳만 바꾸면 카카오톡 공유 버튼에만 반영됩니다."
      >
        <Text label="제목" value={content.meta.title} onChange={(title) => patch({ meta: { ...content.meta, title } })} />
        <Area
          label="설명"
          value={content.meta.description}
          rows={2}
          onChange={(description) => patch({ meta: { ...content.meta, description } })}
        />
        <Row>
          <Text
            label="청첩장 주소"
            type="url"
            value={content.meta.url}
            onChange={(url) => patch({ meta: { ...content.meta, url } })}
          />
          <Text
            label="공유 썸네일 주소"
            hint="JPEG 또는 PNG의 전체 주소"
            type="url"
            value={content.meta.shareImage}
            onChange={(shareImage) => patch({ meta: { ...content.meta, shareImage } })}
          />
        </Row>
      </Group>
    </div>
  )
}
