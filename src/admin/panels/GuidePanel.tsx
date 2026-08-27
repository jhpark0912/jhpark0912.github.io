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
          <Item term="사진만은 고르는 즉시 올라갑니다">
            사진 파일은 임시저장·게시하기와 상관없이 <strong>고르는 순간 저장됩니다.</strong> 위치·크기와 설명 같은
            나머지는 여느 항목과 똑같이 게시해야 하객에게 보입니다. 뺀 사진도 곧바로 지워지지 않고{' '}
            <strong>다음 게시하기 때</strong> 정리되는데, 지금 하객이 보고 있는 사진을 없애지 않기 위해서입니다.
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

      <Group
        title="사진 비율"
        note="자리마다 사진이 들어가는 틀의 모양이 정해져 있고, 틀과 다른 모양의 사진은 넘치는 쪽이 잘려 나갑니다. 아래 비율로 맞춰 오시면 잘리는 곳 없이 그대로 들어갑니다."
      >
        <List>
          <Item term="커버 · 세로 9:16">
            <strong>900×1600 픽셀.</strong> 화면 전체를 채우는 자리라 가장 길쭉한 사진이 필요합니다. 실제 화면은
            9:16보다도 길어서 좌우가 조금 더 잘리니, 인물이 한가운데 오는 사진이 안전합니다. 아래쪽에는 이름과
            날짜 글씨가 얹히므로 그 부분이 복잡하지 않은 사진이 좋습니다.
          </Item>
          <Item term="신랑신부 사진 · 가로 16:9">
            <strong>1400×790 픽셀.</strong> 이름 바로 위에서 좌우를 꽉 채우는 낮고 넓은 띠로, 두 사람을 소개하는
            자리입니다. 셋 중 유일한 가로 자리이니 <strong>세로 사진을 넣으면 위아래가 크게 잘려</strong> 얼굴이
            날아갈 수 있습니다. <strong>가로로 찍은 상반신 사진</strong>이 가장 잘 맞습니다 — 전신 사진은 띠가 낮아
            얼굴이 작게 들어갑니다.
          </Item>
          <Item term="일정 사진 · 인사 사진 · 세로 4:5">
            <strong>1120×1400 픽셀.</strong> 둘 다 글 사이에 한 장씩 놓이는 세로 자리입니다.
          </Item>
          <Item term="갤러리 · 세로 4:5">
            <strong>1120×1400 픽셀.</strong> 여기만은 <strong>장마다 비율을 맞추는 것이 특히 중요합니다</strong> —
            제각각이면 넘길 때마다 높이가 달라져 흔들려 보입니다. 장수는 자유롭게 늘리고 줄일 수 있습니다.
          </Item>
          <Item term="위치·크기 조절하는 법">
            비율을 못 맞춘 사진은 <strong>미리보기를 누르면 조절 창이 열립니다.</strong> 사진 전체가 보이고, 그중{' '}
            <strong>밝은 부분만 청첩장에 나옵니다</strong> — 어두운 부분이 잘려 나갈 자리입니다. 밝은 창을 끌어 남길
            곳을 정하고 아래 <strong>크기</strong> 막대로 키운 다음 <strong>적용</strong>을 누르면 반영됩니다.
            마우스 휠과 방향키로도 움직입니다. 커버 · 사이사이 · 갤러리 모두 같은 방식입니다.
            <br />
            적용하기 전까지는 아무것도 바뀌지 않으니, 이리저리 옮겨 보다가 아니다 싶으면{' '}
            <strong>취소</strong>하시면 됩니다.
          </Item>
          <Item term="창이 안 움직일 때">
            비율이 이미 맞는 사진은 잘려 나갈 곳이 없어서, 창이 사진 전체를 덮은 채 움직이지 않습니다. 고장이 아니라{' '}
            <strong>지금 잘리는 데가 없다는 뜻</strong>입니다. 한쪽만 안 움직이는 것도 마찬가지로, 그 방향으로는
            남는 부분이 없어서입니다. 굳이 옮기고 싶다면 크기를 키우면 그때부터 움직입니다.
          </Item>
          <Item term="크기는 100%부터 시작합니다">
            100%가 사진을 그대로 넣은 상태이고, 올리면 <strong>창이 잡고 있는 지점을 중심으로 확대</strong>됩니다.
            멀리서 찍혀 얼굴이 작게 들어갈 때 쓰시면 됩니다.
            <br />
            <strong>줄이는 쪽은 없습니다.</strong> 100%에서 이미 사진이 틀을 꽉 채우고 있어서, 그보다 줄이면 사진이
            더 보이는 게 아니라 틀 가장자리에 빈 여백이 생깁니다. 위아래가 너무 잘린다면 크기가 아니라{' '}
            <strong>창을 위아래로 옮기시는 것</strong>이 맞습니다.
          </Item>
          <Item term="사진을 바꾸면 초기화됩니다">
            같은 자리에 새 사진을 고르면 위치와 크기는 <strong>가운데 · 100%로 돌아갑니다.</strong> 사진마다 잘려야
            할 곳이 다르기 때문입니다. 바꾼 뒤에는 한 번 더 맞춰 주세요.
          </Item>
          <Item term="갤러리는 크게 보면 전부 나옵니다">
            갤러리에서 잘라 둔 모습은 <strong>넘겨 보는 화면에서만</strong> 적용됩니다. 하객이 사진을 눌러 크게
            보기로 열면 <strong>사진 전체</strong>가 보이니, 잘린 부분이 사라지는 것은 아닙니다.
          </Item>
          <Item term="1400픽셀 넘게 준비할 필요 없음">
            올리는 순간 <strong>긴 변이 1400픽셀로 줄어듭니다.</strong> 더 큰 원본을 넣어도 화질은 그대로이고
            올리는 시간만 길어집니다. 비율만 맞으면 충분합니다.
          </Item>
        </List>
      </Group>

      <Group title="공유 썸네일" note="사진 탭이 아니라 내용 탭에서 주소로 지정하는, 이 청첩장에서 유일하게 다르게 다뤄지는 이미지입니다.">
        <List>
          <Item term="규격">
            카카오톡으로 링크를 보낼 때 뜨는 <strong>가로형</strong> 이미지입니다. 1200×630 픽셀을 권하고,{' '}
            <strong>반드시 JPEG 또는 PNG여야 합니다</strong> — 공유 카드 규격이 SVG를 읽지 못해 썸네일이 빈 채로
            나갑니다.
          </Item>
          <Item term="넣는 법">
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
