/**
 * The things this console cannot tell you by itself.
 *
 * Everything here is either a decision made elsewhere (a Firebase setting, a
 * repository secret) or a rule the invitation applies silently — an empty
 * account list hiding a whole section, a draft sitting unpublished. Those are
 * exactly the points where an edit looks like it did nothing, so they belong
 * next to the editor rather than in a file on GitHub.
 */

import type { ReactNode } from 'react'
import { Group } from '../Fields'
import styles from '../Admin.module.css'

function Item({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className={styles.guideItem}>
      <dt className={styles.guideTerm}>{term}</dt>
      <dd className={styles.guideDesc}>{children}</dd>
    </div>
  )
}

function List({ children }: { children: ReactNode }) {
  return <dl className={styles.guideList}>{children}</dl>
}

export function GuidePanel() {
  return (
    <div className={styles.editor}>
      <Group title="저장과 게시" note="이 둘을 나눠 둔 덕분에 하객이 보고 있는 중에도 마음 놓고 고칠 수 있습니다.">
        <List>
          <Item term="임시저장">
            고친 내용을 보관만 합니다. <strong>하객 화면은 그대로입니다.</strong> 여러 번에 나눠 다듬다가 마음에
            들 때 게시하시면 됩니다.
          </Item>
          <Item term="게시하기">
            지금까지 저장한 내용을 하객 화면에 반영합니다. 누르는 즉시 적용되며, 이미 청첩장을 열어 둔 사람은
            새로고침해야 보입니다.
          </Item>
          <Item term="반영이 안 될 때">
            위쪽 막대에 <strong>&ldquo;저장하지 않은 변경이 있습니다&rdquo;</strong> 또는{' '}
            <strong>&ldquo;게시하면 하객에게 반영됩니다&rdquo;</strong>가 떠 있지 않은지 확인해 주세요. 대부분
            게시를 누르지 않은 경우입니다.
          </Item>
        </List>
      </Group>

      <Group title="비워 두면 사라지는 항목" note="잘못된 정보가 하객에게 보이는 것보다 낫도록, 값이 없으면 그 부분을 아예 그리지 않습니다.">
        <List>
          <Item term="계좌번호">
            양가 모두 비어 있으면 <strong>마음 전하실 곳 섹션이 통째로 사라집니다.</strong> 한쪽만 채우면 그쪽만
            나옵니다.
          </Item>
          <Item term="연락처">
            신랑·신부 번호가 둘 다 비면 <strong>연락하기 섹션이 사라집니다.</strong> 번호를 넣은 사람만 목록에
            나타납니다.
          </Item>
          <Item term="예식장 전화번호">비어 있으면 주소 아래 전화 링크만 나타나지 않습니다.</Item>
          <Item term="혼주 성함">
            비어 있으면 인사말 아래가 <strong>&ldquo;신랑 ○○○ / 신부 ○○○&rdquo;</strong> 두 줄로만 나옵니다.
          </Item>
        </List>
      </Group>

      <Group title="사진" note="사진 탭에서 올린 파일은 그대로 하객에게 전송되므로, 규격을 맞추면 로딩이 눈에 띄게 빨라집니다.">
        <List>
          <Item term="커버">
            화면 전체를 채웁니다. <strong>세로로 긴 사진</strong>이 맞고, 아래쪽에 이름과 날짜 글씨가 얹히므로 그
            부분이 복잡하지 않은 사진이 좋습니다.
          </Item>
          <Item term="갤러리">
            <strong>세로 4:5 비율</strong>을 권합니다. 비율이 제각각이면 넘길 때마다 높이가 달라져 흔들려 보입니다.
            장수는 자유롭게 늘리고 줄일 수 있습니다.
          </Item>
          <Item term="공유 썸네일">
            카카오톡으로 링크를 보낼 때 뜨는 <strong>가로형</strong> 이미지입니다. 1200×630 픽셀을 권하고,{' '}
            <strong>반드시 JPEG 또는 PNG여야 합니다</strong> — 공유 카드 규격이 SVG를 읽지 못해 썸네일이 빈 채로
            나갑니다.
          </Item>
          <Item term="썸네일 넣는 법">
            이것만은 <strong>사진 탭으로 올릴 수 없습니다.</strong> 올린 사진은 설정 안에 데이터로 담기는데, 공유
            카드는 <strong>인터넷에서 바로 열리는 주소</strong>를 요구하기 때문입니다. 저장소의{' '}
            <code>public/images/</code> 에 파일을 넣어 두는 것이 가장 간단하고, 그러면 내용 탭에 이미 적혀 있는
            주소가 그대로 맞습니다. 다른 곳에 올린 이미지라면 그 주소를 대신 넣으셔도 됩니다.
          </Item>
        </List>
      </Group>

      <Group title="방명록과 참석 여부">
        <List>
          <Item term="글 삭제">
            방명록 탭에서 어떤 글이든 지울 수 있습니다. 하객은 <strong>자기가 쓴 글만</strong> 지울 수 있고,
            그것도 글을 쓴 그 브라우저에서만 가능합니다.
          </Item>
          <Item term="참석 여부 열람">
            응답에는 이름과 연락처가 담기므로 <strong>청첩장 쪽에서는 아무도 읽을 수 없게</strong> 막혀 있습니다.
            이 관리자 페이지가 유일한 통로입니다.
          </Item>
          <Item term="식사 인원">
            요약의 식사 인원에는 <strong>&lsquo;미정&rsquo;도 포함</strong>했습니다. 모자라는 것보다 남는 편이
            낫기 때문입니다.
          </Item>
          <Item term="마감일">
            내용 탭에서 정한 날짜가 지나면 하객 화면의 참석 여부 버튼이 자동으로 잠깁니다.
          </Item>
        </List>
      </Group>

      <Group title="이 화면 밖에서 해야 하는 설정" note="여기서는 바꿀 수 없고, Firebase 콘솔이나 저장소 설정에서 처리해야 하는 것들입니다.">
        <List>
          <Item term="관리자 추가">
            Firebase 콘솔에서 <strong>Authentication → Users</strong>로 계정을 만들고, 그 계정의 UID를 문서 ID로
            하는 문서를 <strong>Firestore의 admins 컬렉션</strong>에 넣으면 됩니다. UID를 모르면 그 계정으로 그냥
            로그인해 보세요 — 권한이 없으면 필요한 UID를 화면에 띄워줍니다.
          </Item>
          <Item term="지도와 카카오톡 공유">
            카카오 JavaScript 키가 있어야 켜집니다. 키가 없으면 지도 자리에 예식장 이름과 주소 카드가 대신 뜨고,
            카카오톡 공유 버튼은 숨겨집니다. 링크 복사와 지도 앱 연결 버튼은 키 없이도 작동합니다.
          </Item>
          <Item term="키를 바꾼 뒤">
            카카오·Firebase 키는 <strong>배포할 때 코드에 들어갑니다.</strong> 저장소 설정에서 값만 바꿔서는
            이미 올라간 사이트가 바뀌지 않고, 배포를 한 번 더 돌려야 합니다.
          </Item>
        </List>
      </Group>

      <Group title="문제가 생기면">
        <List>
          <Item term="화면에 뜨는 오류 코드">
            방명록이나 이 페이지가 실패하면 <strong>Firebase 오류 코드</strong>를 함께 보여줍니다. 원인이 코드마다
            다르니 그대로 옮겨 적어 두시면 짚기 쉽습니다.
          </Item>
          <Item term="permission-denied">보안 규칙이 게시되지 않았거나, 이 계정이 admins에 없는 경우입니다.</Item>
          <Item term="auth/unauthorized-domain">
            Firebase의 <strong>승인된 도메인</strong>에 청첩장 주소가 빠져 있는 경우입니다.
          </Item>
          <Item term="auth/operation-not-allowed">
            익명 로그인이 꺼져 있는 경우입니다. 이게 꺼져 있으면 하객이 방명록을 남길 수 없습니다.
          </Item>
        </List>
      </Group>
    </div>
  )
}
