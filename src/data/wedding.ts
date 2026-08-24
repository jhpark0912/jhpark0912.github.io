/**
 * Every piece of copy, contact detail and image path lives here.
 *
 * Replacing the placeholders below is the only edit needed to turn this into
 * the real invitation — no component reads hard-coded wedding data.
 */

export interface Host {
  /** Displayed as-is, e.g. "박준호". */
  name: string
  /** Shown in the English cover line, e.g. "Junho". */
  nameEn: string
  /** Relationship label used in the contact sheet, e.g. "신랑". */
  label: string
  phone: string
  father: string
  mother: string
  /** Optional — a parent row appears in the contact sheet only when set. */
  fatherPhone?: string
  motherPhone?: string
  /** Marks a parent as passed away, drawing the customary 故 prefix. */
  fatherDeceased?: boolean
  motherDeceased?: boolean
  /** Position among siblings, e.g. "장남" / "차녀". */
  order: string
}

export interface BankAccount {
  label: string
  bank: string
  number: string
  holder: string
  /** Optional Kakao Pay money-request link. */
  kakaopay?: string
}

export interface GalleryPhoto {
  src: string
  alt: string
  /** Intrinsic ratio, used to reserve space so the carousel never jumps. */
  width: number
  height: number
}

export interface TransportGuide {
  title: string
  lines: string[]
}

export const wedding = {
  meta: {
    /** Absolute URL of the published invitation, used for sharing. */
    url: 'https://jhpark0912.github.io/',
    title: '준호 ♥ 서연 결혼합니다',
    description: '2026년 11월 8일 일요일 낮 12시, 서울 그레이스홀',
    /** Card thumbnail for KakaoTalk / OpenGraph. Must be an absolute URL. */
    shareImage: 'https://jhpark0912.github.io/images/share.jpg',
  },

  /** Ceremony start time. Always written with the +09:00 offset. */
  date: '2026-11-08T12:00:00+09:00',

  groom: {
    name: '박준호',
    nameEn: 'Junho',
    label: '신랑',
    phone: '010-1234-5678',
    father: '박영수',
    mother: '김미경',
    fatherPhone: '010-2222-3333',
    motherPhone: '010-3333-4444',
    order: '장남',
  } satisfies Host,

  bride: {
    name: '이서연',
    nameEn: 'Seoyeon',
    label: '신부',
    phone: '010-8765-4321',
    father: '이정훈',
    mother: '최은희',
    fatherPhone: '010-5555-6666',
    motherPhone: '010-6666-7777',
    order: '차녀',
  } satisfies Host,

  greeting: {
    poem: ['서로가 마주 보며 다져온 사랑을', '이제 함께 한 곳을 바라보며', '걸어갈 수 있는 큰 사랑으로 키우고자 합니다.'],
    message: [
      '저희 두 사람이 사랑과 믿음으로 하나가 되는 날,',
      '귀한 걸음 하시어 축복해 주시면',
      '더없는 기쁨으로 간직하겠습니다.',
    ],
  },

  venue: {
    name: '그레이스홀',
    hall: '3층 그랜드볼룸',
    address: '서울특별시 강남구 테헤란로 123',
    tel: '02-123-4567',
    /** Coordinates drive the Kakao map marker and the navigation buttons. */
    lat: 37.5006,
    lng: 127.0364,
    transport: [
      {
        title: '지하철',
        lines: ['2호선 역삼역 3번 출구에서 도보 5분', '9호선 언주역 7번 출구에서 도보 10분'],
      },
      {
        title: '버스',
        lines: ['간선 146, 360, 740 — 역삼역 정류장 하차', '지선 3412, 4412 — 국기원입구 정류장 하차'],
      },
      {
        title: '주차',
        lines: ['건물 지하 1~4층 주차장 이용 (2시간 무료)', '만차 시 인근 공영주차장을 안내해 드립니다.'],
      },
    ] satisfies TransportGuide[],
  },

  gallery: [
    { src: '/images/gallery-01.svg', alt: '웨딩 사진 1', width: 1000, height: 1250 },
    { src: '/images/gallery-02.svg', alt: '웨딩 사진 2', width: 1000, height: 1250 },
    { src: '/images/gallery-03.svg', alt: '웨딩 사진 3', width: 1000, height: 1250 },
    { src: '/images/gallery-04.svg', alt: '웨딩 사진 4', width: 1000, height: 1250 },
    { src: '/images/gallery-05.svg', alt: '웨딩 사진 5', width: 1000, height: 1250 },
    { src: '/images/gallery-06.svg', alt: '웨딩 사진 6', width: 1000, height: 1250 },
  ] satisfies GalleryPhoto[],

  cover: {
    image: '/images/cover.svg',
    alt: '신랑 신부의 웨딩 사진',
  },

  accounts: {
    groom: [
      { label: '신랑 박준호', bank: '국민은행', number: '123456-78-901234', holder: '박준호' },
      { label: '아버지 박영수', bank: '신한은행', number: '110-234-567890', holder: '박영수' },
      { label: '어머니 김미경', bank: '농협은행', number: '302-1234-5678-91', holder: '김미경' },
    ],
    bride: [
      { label: '신부 이서연', bank: '카카오뱅크', number: '3333-01-2345678', holder: '이서연' },
      { label: '아버지 이정훈', bank: '우리은행', number: '1002-345-678901', holder: '이정훈' },
      { label: '어머니 최은희', bank: '하나은행', number: '123-456789-01234', holder: '최은희' },
    ],
  } satisfies Record<'groom' | 'bride', BankAccount[]>,

  rsvp: {
    /** Shown above the form; set to '' to hide the note. */
    note: '축하의 마음으로 참석해 주시는 모든 분들을 정성껏 모시고자 합니다. 참석 여부를 알려주시면 준비에 큰 도움이 됩니다.',
    /** Guests can still answer until this moment. */
    deadline: '2026-10-25T23:59:59+09:00',
  },

  guestbook: {
    note: '따뜻한 축하의 말씀을 남겨주세요.',
    /** Cards shown per page in the guestbook list. */
    pageSize: 5,
  },
} as const

export type Wedding = typeof wedding
