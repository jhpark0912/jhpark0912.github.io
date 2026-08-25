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

/**
 * Links that open the venue in each navigation app.
 *
 * Kakao and Naver get https URLs so they still work in a desktop browser or
 * when the app is missing. T map has no such web route, so it uses the custom
 * scheme and silently does nothing when the app is not installed — and it needs
 * coordinates, so it is omitted until they are known.
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
    tmap: `tmap://route?goalname=${encodedName}&goalx=${coords.lng}&goaly=${coords.lat}`,
  }
}
