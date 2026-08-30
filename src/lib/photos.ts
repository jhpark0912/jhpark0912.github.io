/**
 * Photo storage for the admin page.
 *
 * There is no Firebase Storage bucket in this project — enabling one now
 * requires a billing account — so an uploaded photo is shrunk in the browser
 * and kept as a data URL inside its own Firestore document, `photos/{id}`.
 *
 * That puts a hard ceiling on a photo: a Firestore document may not exceed
 * 1 MiB, and base64 inflates bytes by a third. The budgets below stay under
 * that, which also keeps the invitation light — a gallery of a dozen shots is
 * a dozen documents a guest's phone has to download.
 *
 * Each document is written once and never edited. Reordering the gallery only
 * moves ids around inside the site configuration; the bytes never move.
 */

import { isFirebaseConfigured, loadFirebase } from './firebase'
import { readPublicDoc } from './firestoreRest'
import type { WeddingContent } from '../data/wedding'
import type { SiteConfig } from './siteConfig'
import { referencedPhotoIds, SPOT_KEYS } from './siteConfig'

/** Longest edge after resizing. Roughly a phone screen at 3× density. */
const MAX_EDGE = 1400

/**
 * How far a photo may be resized and how many characters it may occupy.
 *
 * The gallery is read inside a 430px column, so 1400px already exceeds what
 * any screen resolves there and the budget is what limits quality. The cover
 * is the one full-bleed element — it stretches to the whole viewport, and on a
 * desktop monitor a 1400px source is visibly upscaled — so it gets its own,
 * larger allowance. It is a single photo, so the extra weight is paid once
 * rather than once per gallery slide.
 */
export interface PhotoProfile {
  maxEdge: number
  budget: number
}

export const GALLERY_PROFILE: PhotoProfile = { maxEdge: MAX_EDGE, budget: 340_000 }
export const COVER_PROFILE: PhotoProfile = { maxEdge: 2000, budget: 700_000 }

/*
 * Both budgets above are characters of data URL, which is very nearly bytes in
 * the document. Firestore's limit is 1,048,576 bytes for the whole document,
 * so even the cover's 700,000 leaves room to spare; the gallery's 340,000 is
 * set by what a guest downloads, not by the limit — every slide is fetched
 * before the carousel can draw, so the figure multiplies by the photo count.
 */

/** Quality ladder walked down until the encoded photo fits the budget. */
const QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52, 0.42]

export interface StoredPhoto {
  id: string
  src: string
  width: number
  height: number
  /** Length of the data URL in characters — what the size warnings are built on. */
  bytes: number
  createdAt: number
}

export class PhotoTooLargeError extends Error {
  constructor() {
    super('사진을 충분히 줄이지 못했습니다.')
    this.name = 'PhotoTooLargeError'
  }
}

function randomId(): string {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/* ---------------------------------------------------------------- encoding -- */

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('파일을 읽지 못했습니다.'))
    reader.readAsDataURL(file)
  })
}

function decode(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('이미지를 해석하지 못했습니다.'))
    image.src = dataUrl
  })
}

/**
 * The encoded format, decided once and reused.
 *
 * WebP holds roughly a third more detail than JPEG for the same number of
 * bytes, which is what keeps the ladder below from having to descend into the
 * qualities where blocking becomes visible in skin and fabric.
 *
 * It has to be probed rather than assumed: a browser handed a type it cannot
 * encode does not fail, it quietly returns PNG — which would overrun every
 * budget here and never say why. Reading the prefix back is the only way to
 * learn what was actually produced.
 */
let encoding: string | null = null

function encodedType(canvas: HTMLCanvasElement): string {
  if (!encoding) {
    encoding = canvas.toDataURL('image/webp', 0.8).startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg'
  }
  return encoding
}

/**
 * Shrinks a picked file into a data URL small enough to store.
 *
 * The photo is scaled so its longest edge is at most the profile's, then
 * encoded at descending quality until it fits. A photo that still will not fit
 * at the lowest quality is scaled to three quarters and tried again; two such
 * rounds are enough for anything a phone camera produces.
 */
export async function preparePhoto(
  file: File,
  profile: PhotoProfile = GALLERY_PROFILE,
): Promise<Omit<StoredPhoto, 'id' | 'createdAt'>> {
  const image = await decode(await readAsDataUrl(file))

  let scale = Math.min(1, profile.maxEdge / Math.max(image.naturalWidth, image.naturalHeight))

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('브라우저가 이미지 변환을 지원하지 않습니다.')
    // Photos are opaque; a white ground keeps a transparent PNG from turning
    // black once it is re-encoded as JPEG.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    const type = encodedType(canvas)
    for (const quality of QUALITY_STEPS) {
      const src = canvas.toDataURL(type, quality)
      if (src.length <= profile.budget) return { src, width, height, bytes: src.length }
    }

    scale *= 0.75
  }

  throw new PhotoTooLargeError()
}

/* ------------------------------------------------------------------ local -- */

const LOCAL_KEY = 'wedding:photos'

type LocalBag = Record<string, { src: string; width: number; height: number; createdAt: number }>

function readLocalBag(): LocalBag {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as LocalBag) : {}
  } catch {
    return {}
  }
}

function writeLocalBag(bag: LocalBag): void {
  // Unlike the small settings documents, a failure here loses a photo, so it is
  // reported rather than swallowed.
  localStorage.setItem(LOCAL_KEY, JSON.stringify(bag))
}

/* -------------------------------------------------------------- firestore -- */

async function requireDb() {
  const { db, firestore } = await loadFirebase()
  return { db, sdk: firestore }
}

export async function savePhoto(photo: Omit<StoredPhoto, 'id' | 'createdAt'>): Promise<StoredPhoto> {
  const id = randomId()
  const createdAt = Date.now()
  const record = { data: photo.src, width: photo.width, height: photo.height, createdAt }

  if (!isFirebaseConfigured) {
    const bag = readLocalBag()
    bag[id] = { src: photo.src, width: photo.width, height: photo.height, createdAt }
    writeLocalBag(bag)
    return { id, createdAt, ...photo }
  }

  const { db, sdk } = await requireDb()
  await sdk.setDoc(sdk.doc(db, 'photos', id), record)
  return { id, createdAt, ...photo }
}

/**
 * Reads one stored photo.
 *
 * Photos are world-readable — a guest has to be able to see them — so this
 * goes over REST rather than the SDK, which keeps the invitation from loading
 * Firebase just to show its own pictures.
 */
export async function loadPhoto(id: string): Promise<StoredPhoto | null> {
  if (!isFirebaseConfigured) {
    const stored = readLocalBag()[id]
    return stored ? { id, bytes: stored.src.length, ...stored } : null
  }

  const data = await readPublicDoc(`photos/${id}`)
  if (!data) return null

  const src = String(data.data ?? '')
  if (!src) return null

  return {
    id,
    src,
    width: Number(data.width ?? 1000),
    height: Number(data.height ?? 1250),
    bytes: src.length,
    createdAt: Number(data.createdAt ?? 0),
  }
}

export async function deletePhoto(id: string): Promise<void> {
  if (!isFirebaseConfigured) {
    const bag = readLocalBag()
    delete bag[id]
    writeLocalBag(bag)
    return
  }

  const { db, sdk } = await requireDb()
  await sdk.deleteDoc(sdk.doc(db, 'photos', id))
}

async function listPhotoIds(): Promise<string[]> {
  if (!isFirebaseConfigured) return Object.keys(readLocalBag())

  const { db, sdk } = await requireDb()
  const snapshot = await sdk.getDocs(sdk.collection(db, 'photos'))
  return snapshot.docs.map((doc) => doc.id)
}

/**
 * Deletes stored photos nothing points at any more.
 *
 * Removing a photo from the gallery only unlinks it, because the published site
 * may still be showing it. Publishing makes draft and published identical, so
 * that is the one safe moment to collect what is left over. Best-effort by
 * design: a failed delete costs storage, never a visible photo.
 */
export async function collectOrphans(config: SiteConfig): Promise<number> {
  const keep = new Set(referencedPhotoIds(config))

  let ids: string[]
  try {
    ids = await listPhotoIds()
  } catch {
    return 0
  }

  let removed = 0
  for (const id of ids) {
    if (keep.has(id)) continue
    try {
      await deletePhoto(id)
      removed += 1
    } catch {
      // Leave it; the next publish will try again.
    }
  }
  return removed
}

/* -------------------------------------------------------------- resolving -- */

/**
 * Fills the stored bytes back into a configuration for rendering.
 *
 * Only entries carrying a `photoId` are touched, so photos bundled under
 * `public/images/` keep working exactly as before. A photo whose document has
 * gone missing is dropped from the gallery rather than rendered broken; a
 * between-sections photo in the same state is emptied, which is what its own
 * section already reads as "no photo here".
 */
export async function resolvePhotos(content: WeddingContent): Promise<WeddingContent> {
  const ids = new Set<string>()
  for (const photo of content.gallery) if (photo.photoId) ids.add(photo.photoId)
  if (content.cover.photoId) ids.add(content.cover.photoId)
  for (const key of SPOT_KEYS) {
    const id = content.photos[key].photoId
    if (id) ids.add(id)
  }
  if (ids.size === 0) return content

  const entries = await Promise.all(
    [...ids].map(async (id) => {
      try {
        return [id, await loadPhoto(id)] as const
      } catch {
        return [id, null] as const
      }
    }),
  )
  const found = new Map(entries)

  const cover = content.cover.photoId
    ? (() => {
        const photo = found.get(content.cover.photoId)
        return photo ? { ...content.cover, image: photo.src } : content.cover
      })()
    : content.cover

  const gallery = content.gallery
    .map((photo) => {
      if (!photo.photoId) return photo
      const stored = found.get(photo.photoId)
      return stored ? { ...photo, src: stored.src, width: stored.width, height: stored.height } : null
    })
    .filter((photo): photo is (typeof content.gallery)[number] => photo !== null)

  const photos = { ...content.photos }
  for (const key of SPOT_KEYS) {
    const photo = photos[key]
    if (!photo.photoId) continue
    const stored = found.get(photo.photoId)
    photos[key] = stored
      ? { ...photo, src: stored.src, width: stored.width, height: stored.height }
      : { ...photo, src: '' }
  }

  return { ...content, cover, gallery, photos }
}

/** Human-readable size of a data URL, for the admin page's weight warnings. */
export function formatBytes(chars: number): string {
  // A base64 payload is about three quarters bytes per character.
  const bytes = Math.round(chars * 0.75)
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
