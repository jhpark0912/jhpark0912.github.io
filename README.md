# 모바일 청첩장

React + Vite로 만든 모바일 청첩장입니다. GitHub Pages(`https://jhpark0912.github.io/`)로 배포됩니다.

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 타입 체크 + 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
```

## 구성

| 섹션 | 내용 |
| --- | --- |
| 인트로 | 이름과 날짜가 떠오르는 오프닝. 커버 사진 로딩 시간을 가려줍니다. 탭하면 건너뜁니다. |
| 커버 | 풀스크린 사진, 스크롤에 따른 완만한 패럴랙스 |
| 초대합니다 | 시 구절 · 인사말 · 양가 혼주 |
| 연락하기 | 신랑/신부 측 아코디언, 전화·문자 버튼 |
| 예식 일정 | 달력 하이라이트 + 실시간 카운트다운 |
| 우리의 순간 | 스와이프 캐러셀 + 전체 화면 라이트박스 |
| 오시는 길 | 카카오맵, 주소 복사, 지도 앱 연결, 교통편 |
| 마음 전하실 곳 | 계좌 아코디언 + 원탭 복사 |
| 참석 여부 | 바텀시트 폼 (Firestore 저장) |
| 축하 메시지 | 방명록 목록·작성·삭제 (Firestore 저장) |
| 공유하기 | 카카오톡 공유, 링크 복사, 시스템 공유 |

모든 섹션은 화면에 처음 들어올 때 한 번만 페이드인하며, `prefers-reduced-motion`이 켜져 있으면 애니메이션 없이 바로 표시됩니다.

## 내용 바꾸기

`src/data/wedding.ts` 한 파일에 신랑신부·일시·장소·좌표·계좌·사진 목록·인사말이 모두 들어 있습니다. 컴포넌트에는 결혼 정보가 하드코딩되어 있지 않으므로 이 파일만 고치면 됩니다.

날짜는 반드시 `+09:00` 오프셋을 포함해 적어주세요. 해외에서 열어도 한국 기준 날짜와 D-day가 동일하게 보입니다.

`index.html`의 `<title>`과 OpenGraph 태그는 빌드 시점에 정적으로 들어가므로, 데이터를 바꾸면 이곳도 같이 수정해야 공유 카드에 반영됩니다.

## 사진 교체

`public/images/`의 파일은 `scripts/make-placeholders.mjs`가 만든 임시 이미지입니다. 실제 사진으로 바꿀 때:

1. `public/images/`에 사진을 넣습니다. 세로 4:5 비율, 가로 1000~1400px, WebP 또는 JPEG를 권장합니다.
2. `src/data/wedding.ts`의 `cover`, `gallery` 경로와 `width`/`height`를 실제 값으로 맞춥니다. 비율이 맞아야 캐러셀이 로딩 중에 흔들리지 않습니다.
3. `index.html`의 `<link rel="preload" ... href="/images/cover.svg">` 경로도 새 커버 파일로 바꿉니다.
4. 카카오톡 공유 카드용으로 `public/images/share.jpg`(1200×630 권장)를 추가합니다. **OpenGraph는 SVG를 지원하지 않으므로 이 파일은 반드시 JPEG/PNG여야 합니다.** 없으면 공유 시 썸네일이 비어 보입니다.
5. 준비가 끝나면 `scripts/make-placeholders.mjs`는 지워도 됩니다.

## 카카오 설정

[Kakao Developers](https://developers.kakao.com)에서 애플리케이션을 만들고:

1. **앱 키 → JavaScript 키**를 복사합니다. 지도와 공유가 같은 키를 씁니다.
2. **플랫폼 → Web → 사이트 도메인**에 `https://jhpark0912.github.io`를 등록합니다. 로컬 개발에는 `http://localhost:5173`도 함께 등록하세요.
3. **카카오맵**을 쓰려면 앱 설정에서 지도 서비스를 활성화합니다.

키를 넣지 않아도 사이트는 정상 동작합니다. 지도 자리에는 예식장 이름과 주소가 대신 표시되고, 카카오톡 공유 버튼은 숨겨지며, 링크 복사와 지도 앱 연결 버튼은 그대로 작동합니다.

## Firebase 설정 (방명록 · 참석 여부)

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트를 만듭니다.
2. **Firestore Database**를 생성합니다(프로덕션 모드, 위치는 `asia-northeast3`).
3. **Authentication → Sign-in method**에서 **익명(Anonymous)** 로그인을 켭니다. 이게 꺼져 있으면 방명록 작성과 참석 여부 전송이 실패합니다.
4. **프로젝트 설정 → 내 앱 → 웹 앱**을 추가하고 SDK 구성값을 `.env`(로컬)와 GitHub Secrets(배포)에 넣습니다.
5. 이 저장소의 `firestore.rules` 내용을 **Firestore → 규칙**에 붙여넣고 게시합니다.

### 삭제 권한에 대해

방명록 글쓴이는 익명 로그인 uid로 식별되고, 보안 규칙이 그 uid를 확인해 **본인이 쓴 글만** 삭제할 수 있게 합니다. 비밀번호를 따로 받지 않는 대신, 브라우저 저장소를 지우거나 다른 기기에서 열면 이전에 쓴 글을 지울 수 없습니다. 그런 요청이 오면 Firebase 콘솔에서 직접 삭제하시면 됩니다.

참석 여부 응답은 이름과 연락처가 담기므로 규칙에서 **읽기를 완전히 막아** 두었습니다. 집계는 Firebase 콘솔의 `rsvp` 컬렉션에서 확인하세요.

### 설정하지 않으면

`VITE_FIREBASE_*` 값이 하나라도 비어 있으면 방명록과 참석 여부가 브라우저 `localStorage`에 저장되는 목업 모드로 동작합니다. 화면과 흐름은 동일하지만 데이터가 그 기기 밖으로 나가지 않으므로, 실제 청첩장을 돌리기 전에 반드시 Firebase를 연결해야 합니다.

## 환경 변수

`.env.example`을 `.env`로 복사해 로컬 값을 채웁니다. 배포용으로는 저장소 **Settings → Secrets and variables → Actions**에 같은 이름으로 등록하면 워크플로가 빌드 시 주입합니다.

`VITE_*` 값은 빌드 결과 자바스크립트에 그대로 포함되어 공개됩니다. 이 키들은 원래 그런 용도이며(카카오는 도메인, Firebase는 보안 규칙으로 보호됩니다), 비밀로 지켜야 하는 값은 넣지 마세요.

## 배포

`main` 브랜치에 푸시하면 `.github/workflows/deploy.yml`이 빌드해 GitHub Pages로 올립니다. 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 설정해야 합니다.
