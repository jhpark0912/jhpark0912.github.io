/**
 * The invitation's default content.
 *
 * This file is the *fallback*, not the source of truth. At runtime the site
 * reads `site/published` from Firestore and merges it over these values, so the
 * admin page at /admin.html can change any of them without a redeploy. What is
 * written here is what a visitor sees before that document arrives — and what
 * they keep seeing if Firebase is not configured at all.
 *
 * Fields left empty hide their part of the page rather than showing a blank:
 * a host with no phone drops out of the contact sheet, an empty account list
 * hides the gift section, and an empty venue.tel hides the venue phone link.
 */

export interface Host {
  /** Displayed as-is, e.g. "박재현". */
  name: string
  /** Shown in the English cover and footer lines, e.g. "Jaehyun". */
  nameEn: string
  /** Relationship label used in the contact sheet, e.g. "신랑". */
  label: string
  phone: string
  /** Leave empty when a parent should not appear on the invitation. */
  father: string
  mother: string
  /**
   * Marks a parent who has passed away. The invitation then draws a white
   * chrysanthemum beside their name.
   */
  fatherDeceased?: boolean
  motherDeceased?: boolean
  /** Position among siblings, e.g. "장남" / "차녀". Empty hides the phrase. */
  order: string
}

export interface BankAccount {
  label: string
  bank: string
  number: string
  holder: string
}

export interface GalleryPhoto {
  /**
   * Set when the photo was uploaded from the admin page; the bytes then live in
   * `photos/{photoId}` and `src` is filled in once that document is read.
   * Empty for a file bundled under `public/images/`.
   */
  photoId?: string
  src: string
  alt: string
  /** Intrinsic ratio, used to reserve space so the carousel never jumps. */
  width: number
  height: number
}

export interface CoverPhoto {
  photoId?: string
  image: string
  alt: string
}

export interface TransportGuide {
  title: string
  lines: string[]
}

export interface WeddingMeta {
  /** Absolute URL of the published invitation, used for sharing. */
  url: string
  title: string
  description: string
  /** Card thumbnail for KakaoTalk / OpenGraph. Must be an absolute URL. */
  shareImage: string
}

export interface Venue {
  name: string
  hall: string
  address: string
  addressDetail: string
  /** Empty hides the venue phone link. */
  tel: string
  /**
   * Optional. When null the map marker and the navigation links are resolved
   * from `address` through the Kakao geocoder at runtime, which is both more
   * accurate and impossible to leave stale.
   */
  lat: number | null
  lng: number | null
  transport: TransportGuide[]
}

export interface WeddingContent {
  meta: WeddingMeta
  /** Ceremony start time. Always written with the +09:00 offset. */
  date: string
  groom: Host
  bride: Host
  greeting: {
    poem: string[]
    message: string[]
  }
  venue: Venue
  gallery: GalleryPhoto[]
  cover: CoverPhoto
  /** Empty lists hide the gift section entirely — no half-filled accounts. */
  accounts: {
    groom: BankAccount[]
    bride: BankAccount[]
  }
  rsvp: {
    /** Shown above the form; set to '' to hide the note. */
    note: string
    /** Guests can still answer until this moment. */
    deadline: string
  }
  guestbook: {
    note: string
    /** Cards shown per page in the guestbook list. */
    pageSize: number
  }
}

export const wedding: WeddingContent = {
  meta: {
    url: 'https://jhpark0912.github.io/',
    title: '재현 ♥ 현정 결혼합니다',
    description: '2026년 12월 12일 토요일 오후 4시 40분, DMC타워 웨딩 2층 그랜드볼룸',
    shareImage: 'https://jhpark0912.github.io/images/share.jpg',
  },

  date: '2026-12-12T16:40:00+09:00',

  groom: {
    name: '박재현',
    nameEn: 'Jaehyun',
    label: '신랑',
    phone: '010-6238-7260',
    father: '박병용',
    mother: '지숙환',
    // Sibling order was not supplied; '아들' reads correctly on its own and can
    // be swapped for '장남' / '차남' at any time.
    order: '아들',
  },

  bride: {
    name: '김현정',
    nameEn: 'Hyunjung',
    label: '신부',
    phone: '010-8809-9831',
    father: '김규찬',
    mother: '김기자',
    motherDeceased: true,
    order: '딸',
  },

  greeting: {
    poem: ['서로가 마주 보며 다져온 사랑을', '이제 함께 한 곳을 바라보며', '걸어갈 수 있는 큰 사랑으로 키우고자 합니다.'],
    message: [
      '저희 두 사람이 사랑과 믿음으로 하나가 되는 날,',
      '귀한 걸음 하시어 축복해 주시면',
      '더없는 기쁨으로 간직하겠습니다.',
    ],
  },

  venue: {
    name: 'DMC타워 웨딩',
    hall: '2층 그랜드볼룸',
    address: '서울특별시 마포구 성암로 189',
    addressDetail: '중소기업 DMC타워 2층',
    tel: '',
    lat: null,
    lng: null,
    transport: [
      {
        title: '지하철',
        lines: [
          '6호선 · 공항철도 · 경의중앙선 디지털미디어시티역 8번 출구와 바로 연결됩니다.',
          '출구에서 건물 2층 예식장까지 도보 3분 거리입니다.',
        ],
      },
      {
        title: '주차',
        lines: ['건물 주차장에 500대 동시 주차가 가능합니다.', '예식 당일 주차 요금은 안내 데스크에서 확인해 주세요.'],
      },
    ],
  },

  gallery: [
    { src: '/images/gallery-01.svg', alt: '웨딩 사진 1', width: 1000, height: 1250 },
    { src: '/images/gallery-02.svg', alt: '웨딩 사진 2', width: 1000, height: 1250 },
    { src: '/images/gallery-03.svg', alt: '웨딩 사진 3', width: 1000, height: 1250 },
    { src: '/images/gallery-04.svg', alt: '웨딩 사진 4', width: 1000, height: 1250 },
    { src: '/images/gallery-05.svg', alt: '웨딩 사진 5', width: 1000, height: 1250 },
    { src: '/images/gallery-06.svg', alt: '웨딩 사진 6', width: 1000, height: 1250 },
  ],

  cover: {
    image: '/images/cover.svg',
    alt: '신랑 신부의 웨딩 사진',
  },

  accounts: {
    groom: [],
    bride: [],
  },

  rsvp: {
    note: '축하의 마음으로 참석해 주시는 모든 분들을 정성껏 모시고자 합니다. 참석 여부를 알려주시면 준비에 큰 도움이 됩니다.',
    deadline: '2026-11-30T23:59:59+09:00',
  },

  guestbook: {
    note: '따뜻한 축하의 말씀을 남겨주세요.',
    pageSize: 5,
  },
}

export type Wedding = WeddingContent
