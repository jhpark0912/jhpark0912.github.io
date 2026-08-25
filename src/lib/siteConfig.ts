/**
 * The invitation's runtime configuration — content, photos and section order.
 *
 * Two documents live side by side:
 *
 *   `site/draft`     what the admin page is editing. Admin-only, both ways.
 *   `site/published` what visitors actually see. World-readable, admin-writable.
 *
 * Editing never touches the live site; pressing 게시하기 copies the draft over
 * the published document. That is the whole difference between the two.
 *
 * Everything read back from Firestore goes through `mergeConfig`, which reads
 * one field at a time over a copy of the bundled defaults. A document written
 * by an older version of this file, or one someone hand-edited in the console
 * into nonsense, therefore degrades to the defaults for the parts it got wrong
 * instead of throwing somewhere deep inside a component.
 */

import { awaitAuthReady, isFirebaseConfigured, loadFirebase } from './firebase'
import { readPublicDoc } from './firestoreRest'
import {
  wedding,
  type BankAccount,
  type CoverPhoto,
  type GalleryPhoto,
  type Host,
  type SpotPhotos,
  type TransportGuide,
  type WeddingContent,
} from '../data/wedding'
import { DEFAULT_SECTIONS, normaliseSections, type SectionSetting } from '../data/sections'

export interface SiteConfig {
  content: WeddingContent
  sections: SectionSetting[]
  /** Epoch milliseconds of the last write to whichever document this came from. */
  updatedAt: number
}

export type ConfigSlot = 'draft' | 'published'

/** Named once so adding a slot cannot be half-done. */
export const SPOT_KEYS = ['hosts', 'calendar', 'farewell'] as const satisfies readonly (keyof SpotPhotos)[]

/* --------------------------------------------------------------- defaults -- */

/** A fresh, deeply-copied clone of the bundled content. Never shared. */
export function defaultContent(): WeddingContent {
  return structuredClone(wedding)
}

export function defaultConfig(): SiteConfig {
  return { content: defaultContent(), sections: DEFAULT_SECTIONS.map((s) => ({ ...s })), updatedAt: 0 }
}

/* ------------------------------------------------------------- merge/read -- */

type Bag = Record<string, unknown>

function bag(value: unknown): Bag {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Bag) : {}
}

/** Falls back to the default whenever the stored value is not a string. */
function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function nullableNum(value: unknown, fallback: number | null): number | null {
  if (value === null) return null
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/** Keeps only the strings; an absent or malformed list falls back wholesale. */
function lines(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback]
  return value.filter((line): line is string => typeof line === 'string')
}

function mergeHost(value: unknown, fallback: Host): Host {
  const raw = bag(value)
  return {
    name: str(raw.name, fallback.name),
    nameEn: str(raw.nameEn, fallback.nameEn),
    label: str(raw.label, fallback.label),
    phone: str(raw.phone, fallback.phone),
    father: str(raw.father, fallback.father),
    mother: str(raw.mother, fallback.mother),
    fatherDeceased: bool(raw.fatherDeceased, Boolean(fallback.fatherDeceased)),
    motherDeceased: bool(raw.motherDeceased, Boolean(fallback.motherDeceased)),
    order: str(raw.order, fallback.order),
  }
}

function mergeAccounts(value: unknown, fallback: BankAccount[]): BankAccount[] {
  if (!Array.isArray(value)) return fallback.map((account) => ({ ...account }))
  return value.map((item) => {
    const raw = bag(item)
    return {
      label: str(raw.label, ''),
      bank: str(raw.bank, ''),
      number: str(raw.number, ''),
      holder: str(raw.holder, ''),
    }
  })
}

function mergeTransport(value: unknown, fallback: TransportGuide[]): TransportGuide[] {
  if (!Array.isArray(value)) return fallback.map((guide) => ({ ...guide, lines: [...guide.lines] }))
  return value.map((item) => {
    const raw = bag(item)
    return { title: str(raw.title, ''), lines: lines(raw.lines, []) }
  })
}

function mergeGallery(value: unknown, fallback: GalleryPhoto[]): GalleryPhoto[] {
  if (!Array.isArray(value)) return fallback.map((photo) => ({ ...photo }))
  return value
    .map((item) => {
      const raw = bag(item)
      const photoId = str(raw.photoId, '')
      return {
        ...(photoId ? { photoId } : {}),
        src: str(raw.src, ''),
        alt: str(raw.alt, ''),
        width: num(raw.width, 1000),
        height: num(raw.height, 1250),
      }
    })
    // An entry that names neither an upload nor a bundled file would render a
    // broken image, so it never reaches the carousel.
    .filter((photo) => Boolean(photo.photoId) || photo.src.length > 0)
}

/**
 * One between-sections photo.
 *
 * Unlike the gallery there is nothing to filter out here: a slot naming neither
 * an upload nor a bundled file is simply an empty slot, and an empty slot is
 * how a couple turns the photo off.
 */
function mergeSpotPhoto(value: unknown): GalleryPhoto {
  const raw = bag(value)
  const photoId = str(raw.photoId, '')
  return {
    ...(photoId ? { photoId } : {}),
    src: str(raw.src, ''),
    alt: str(raw.alt, ''),
    width: num(raw.width, 1000),
    height: num(raw.height, 1250),
  }
}

function mergeSpotPhotos(value: unknown): SpotPhotos {
  const raw = bag(value)
  return {
    hosts: mergeSpotPhoto(raw.hosts),
    calendar: mergeSpotPhoto(raw.calendar),
    farewell: mergeSpotPhoto(raw.farewell),
  }
}

function mergeCover(value: unknown, fallback: CoverPhoto): CoverPhoto {
  const raw = bag(value)
  const photoId = str(raw.photoId, '')
  return {
    ...(photoId ? { photoId } : {}),
    image: str(raw.image, photoId ? '' : fallback.image),
    alt: str(raw.alt, fallback.alt),
  }
}

function mergeContent(value: unknown): WeddingContent {
  const base = defaultContent()
  const raw = bag(value)
  const meta = bag(raw.meta)
  const greeting = bag(raw.greeting)
  const venue = bag(raw.venue)
  const accounts = bag(raw.accounts)
  const rsvp = bag(raw.rsvp)
  const guestbook = bag(raw.guestbook)

  return {
    meta: {
      url: str(meta.url, base.meta.url),
      title: str(meta.title, base.meta.title),
      description: str(meta.description, base.meta.description),
      shareImage: str(meta.shareImage, base.meta.shareImage),
    },
    date: str(raw.date, base.date),
    groom: mergeHost(raw.groom, base.groom),
    bride: mergeHost(raw.bride, base.bride),
    greeting: {
      poem: lines(greeting.poem, base.greeting.poem),
      message: lines(greeting.message, base.greeting.message),
    },
    venue: {
      name: str(venue.name, base.venue.name),
      hall: str(venue.hall, base.venue.hall),
      address: str(venue.address, base.venue.address),
      addressDetail: str(venue.addressDetail, base.venue.addressDetail),
      tel: str(venue.tel, base.venue.tel),
      lat: nullableNum(venue.lat, base.venue.lat),
      lng: nullableNum(venue.lng, base.venue.lng),
      transport: mergeTransport(venue.transport, base.venue.transport),
    },
    gallery: mergeGallery(raw.gallery, base.gallery),
    cover: mergeCover(raw.cover, base.cover),
    photos: mergeSpotPhotos(raw.photos),
    accounts: {
      groom: mergeAccounts(accounts.groom, base.accounts.groom),
      bride: mergeAccounts(accounts.bride, base.accounts.bride),
    },
    rsvp: {
      note: str(rsvp.note, base.rsvp.note),
      deadline: str(rsvp.deadline, base.rsvp.deadline),
    },
    guestbook: {
      note: str(guestbook.note, base.guestbook.note),
      // A page size of zero would loop forever while paginating.
      pageSize: Math.max(1, Math.round(num(guestbook.pageSize, base.guestbook.pageSize))),
    },
  }
}

export function mergeConfig(stored: unknown): SiteConfig {
  const raw = bag(stored)
  return {
    content: mergeContent(raw.content),
    sections: normaliseSections(raw.sections),
    updatedAt: num(raw.updatedAt, 0),
  }
}

/* ---------------------------------------------------------------- writing -- */

/**
 * Strips the resolved image data back out before a config is stored.
 *
 * An uploaded photo's bytes live in its own `photos/{id}` document; the copy
 * spliced into `src` for rendering must not be written back, or a gallery of a
 * dozen photos would blow straight past Firestore's 1 MiB document limit.
 */
export function forStorage(config: SiteConfig): { content: WeddingContent; sections: SectionSetting[] } {
  const content = structuredClone(config.content)
  content.gallery = content.gallery.map((photo) => (photo.photoId ? { ...photo, src: '' } : photo))
  if (content.cover.photoId) content.cover = { ...content.cover, image: '' }
  for (const key of SPOT_KEYS) {
    const photo = content.photos[key]
    if (photo.photoId) content.photos[key] = { ...photo, src: '' }
  }
  return { content, sections: config.sections.map((section) => ({ ...section })) }
}

/** Every photo document id the config depends on — cover and spots included. */
export function referencedPhotoIds(config: SiteConfig): string[] {
  const ids = config.content.gallery.map((photo) => photo.photoId).filter((id): id is string => Boolean(id))
  if (config.content.cover.photoId) ids.push(config.content.cover.photoId)
  for (const key of SPOT_KEYS) {
    const id = config.content.photos[key].photoId
    if (id) ids.push(id)
  }
  return [...new Set(ids)]
}

/* ------------------------------------------------------------------ local -- */

const LOCAL_KEY = 'wedding:site'

function localSlot(slot: ConfigSlot): string {
  return `${LOCAL_KEY}:${slot}`
}

function readLocalConfig(slot: ConfigSlot): SiteConfig | null {
  try {
    const raw = localStorage.getItem(localSlot(slot))
    return raw ? mergeConfig(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function writeLocalConfig(slot: ConfigSlot, config: SiteConfig): number {
  const updatedAt = Date.now()
  try {
    localStorage.setItem(localSlot(slot), JSON.stringify({ ...forStorage(config), updatedAt }))
  } catch {
    // Private mode or a full quota. Nothing to do but let the caller carry on
    // with what is on screen.
  }
  return updatedAt
}

/* -------------------------------------------------------------- firestore -- */

async function requireDb() {
  const { db, firestore } = await loadFirebase()
  return { db, sdk: firestore }
}

/**
 * Reads one of the two configuration documents.
 *
 * Resolves to null when the document has never been written, which is the
 * normal state of a fresh project — the caller then keeps the bundled
 * defaults rather than showing an error.
 *
 * The published document is world-readable, so it is fetched over REST: it is
 * the one read that happens before a guest sees anything, and loading the
 * Firebase SDK for it would delay the whole invitation. The draft needs a
 * signed-in admin and therefore goes through the SDK.
 */
export async function loadConfig(slot: ConfigSlot): Promise<SiteConfig | null> {
  if (!isFirebaseConfigured) return readLocalConfig(slot)

  if (slot === 'published') {
    const stored = await readPublicDoc('site/published')
    return stored ? mergeConfig(stored) : null
  }

  // The preview opens the invitation in a fresh tab, where the admin's session
  // is still being restored from storage; reading before it lands would be
  // refused by the rules.
  await awaitAuthReady()

  const { db, sdk } = await requireDb()
  const snapshot = await sdk.getDoc(sdk.doc(db, 'site', slot))
  if (!snapshot.exists()) return null
  return mergeConfig(snapshot.data())
}

export async function saveConfig(slot: ConfigSlot, config: SiteConfig): Promise<number> {
  if (!isFirebaseConfigured) return writeLocalConfig(slot, config)

  const { db, sdk } = await requireDb()
  const updatedAt = Date.now()
  await sdk.setDoc(sdk.doc(db, 'site', slot), { ...forStorage(config), updatedAt })
  return updatedAt
}

/** Copies the draft over the published document — the one destructive step. */
export async function publishConfig(config: SiteConfig): Promise<number> {
  const updatedAt = await saveConfig('published', config)
  // Keeping the draft's timestamp in step is what lets the admin page say
  // whether there is anything left unpublished.
  await saveConfig('draft', config)
  return updatedAt
}
