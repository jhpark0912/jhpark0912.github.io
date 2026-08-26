/**
 * Kakao SDK loaders.
 *
 * Both the venue map and the share button use the same JavaScript key, but they
 * are two different SDKs loaded from two different CDNs. Each is fetched lazily
 * and only once, so a guest who never scrolls to the map never pays for it.
 */

export const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY ?? ''

export const hasKakaoKey = KAKAO_JS_KEY.length > 0

/** Minimal shape of the globals the SDKs install — enough for what we call. */
declare global {
  interface Window {
    kakao?: any
    Kakao?: any
  }
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
      } else {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener('error', () => reject(new Error(`failed to load ${src}`)), { once: true })
      }
      return
    }

    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true'
        resolve()
      },
      { once: true },
    )
    script.addEventListener('error', () => reject(new Error(`failed to load ${src}`)), { once: true })
    document.head.appendChild(script)
  })
}

let mapsPromise: Promise<any> | null = null

/** Resolves with the `kakao.maps` namespace, ready to use. */
export function loadKakaoMaps(): Promise<any> {
  if (!hasKakaoKey) return Promise.reject(new Error('VITE_KAKAO_JS_KEY is not set'))
  if (mapsPromise) return mapsPromise

  mapsPromise = loadScript(
    // `services` brings in the geocoder used to turn the venue address into
    // map coordinates, so no coordinates need to be hand-copied into the data.
    `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false&libraries=services`,
    'kakao-maps-sdk',
  )
    .then(
      () =>
        // autoload=false means the namespace exists but is not initialised yet.
        new Promise<any>((resolve) => {
          window.kakao.maps.load(() => resolve(window.kakao.maps))
        }),
    )
    .catch((error) => {
      mapsPromise = null
      throw error
    })

  return mapsPromise
}

let sharePromise: Promise<any> | null = null

/** Resolves with the initialised `Kakao` object used for share links. */
export function loadKakaoShare(): Promise<any> {
  if (!hasKakaoKey) return Promise.reject(new Error('VITE_KAKAO_JS_KEY is not set'))
  if (sharePromise) return sharePromise

  sharePromise = loadScript('https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js', 'kakao-share-sdk')
    .then(() => {
      if (!window.Kakao.isInitialized()) window.Kakao.init(KAKAO_JS_KEY)
      return window.Kakao
    })
    .catch((error) => {
      sharePromise = null
      throw error
    })

  return sharePromise
}

export interface Coordinates {
  lat: number
  lng: number
}

/**
 * Resolves a road address to coordinates using the Kakao geocoder.
 *
 * Returns null when the address cannot be matched, which the caller treats the
 * same as having no coordinates at all.
 */
export function geocodeAddress(maps: any, address: string): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    const geocoder = new maps.services.Geocoder()
    geocoder.addressSearch(address, (result: any[], status: string) => {
      if (status !== maps.services.Status.OK || result.length === 0) {
        resolve(null)
        return
      }
      resolve({ lat: Number(result[0].y), lng: Number(result[0].x) })
    })
  })
}

const TMAP_PACKAGE = 'com.skt.tmap.ku'
const TMAP_STORE_ANDROID = `https://play.google.com/store/apps/details?id=${TMAP_PACKAGE}`

/**
 * The T map link for the current platform, or null where no link can work.
 *
 * `goalname/goalx/goaly` is the parameter set T map actually reads. The
 * `rGoName/rGoX/rGoY` variant seen in many samples opens the app with no
 * destination at all, in plain driving mode.
 *
 * Android Chrome refuses to follow a bare `tmap://` from an <a href>, which is
 * why the button did nothing there; it needs Chrome's intent syntax, which also
 * carries the store link to land on when T map is not installed. iOS must keep
 * the plain scheme — Safari does not understand intent URLs. On desktop there
 * is no app to open and no web route to send anyone to, so the caller drops the
 * button entirely.
 */
function tmapLink(query: string): string | null {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent

  if (/Android/i.test(ua)) {
    const fallback = encodeURIComponent(TMAP_STORE_ANDROID)
    return `intent://route?${query}#Intent;scheme=tmap;package=${TMAP_PACKAGE};S.browser_fallback_url=${fallback};end`
  }

  if (/iPhone|iPad|iPod/i.test(ua)) return `tmap://route?${query}`

  return null
}

/**
 * Links that open the venue in each navigation app.
 *
 * Kakao and Naver get https URLs so they still work in a desktop browser or
 * when the app is missing. T map has no such web route, so it goes through
 * `tmapLink` above — and it needs coordinates, so it is omitted until they are
 * known.
 *
 * Separately: the venue has no hand-entered lat/lng, so this returns a null
 * `tmap` until the Kakao geocoder answers — the button is missing entirely
 * whenever the map fails to load. Filling in the coordinates in `wedding.ts`
 * would make the button independent of that.
 */
export function navigationLinks(name: string, address: string, coords: Coordinates | null) {
  const encodedName = encodeURIComponent(name)
  const query = encodeURIComponent(`${name} ${address}`.trim())

  if (!coords) {
    return {
      kakao: `https://map.kakao.com/link/search/${query}`,
      naver: `https://map.naver.com/p/search/${query}`,
      tmap: null,
    }
  }

  return {
    kakao: `https://map.kakao.com/link/to/${encodedName},${coords.lat},${coords.lng}`,
    naver: `https://map.naver.com/p/search/${query}`,
    tmap: tmapLink(`goalname=${encodedName}&goalx=${coords.lng}&goaly=${coords.lat}`),
  }
}
