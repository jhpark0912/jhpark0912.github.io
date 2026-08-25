/**
 * Guestbook and RSVP persistence.
 *
 * Firestore is used when the six VITE_FIREBASE_* variables are present;
 * otherwise everything falls back to a localStorage mock so the page is fully
 * clickable during development and on a preview deploy without secrets.
 *
 * Ownership: writers are signed in anonymously and their uid is stamped on each
 * document. That uid is what the security rule checks on delete, so a guest can
 * remove their own message and nobody else's. Clearing browser storage drops
 * the anonymous session — and with it the ability to delete earlier messages
 * from that device. See README for the matching rules.
 */

export interface GuestbookEntry {
  id: string
  name: string
  message: string
  /** Epoch milliseconds. */
  createdAt: number
  ownerId: string
}

export interface GuestbookDraft {
  name: string
  message: string
}

export type RsvpSide = 'groom' | 'bride'
export type MealChoice = 'yes' | 'no' | 'undecided'

export interface RsvpDraft {
  side: RsvpSide
  name: string
  attending: boolean
  /** Total heads including the guest themselves. */
  headcount: number
  meal: MealChoice
  phone: string
  note: string
}

export interface PendingEntry {
  /** Ready to render immediately — the id is generated before the round trip. */
  entry: GuestbookEntry
  /** Settles once the server has accepted the write; rejects if it refuses. */
  saved: Promise<void>
}

export interface Store {
  /** 'firestore' when real persistence is configured, 'local' for the mock. */
  readonly mode: 'firestore' | 'local'
  getOwnerId(): Promise<string>
  listGuestbook(): Promise<GuestbookEntry[]>
  /**
   * Returns as soon as the write is queued rather than when it lands, so the
   * message appears the moment a guest submits it. Firestore applies the write
   * locally first and syncs in the background; watch `saved` to catch refusals.
   */
  addGuestbook(draft: GuestbookDraft): Promise<PendingEntry>
  removeGuestbook(id: string): Promise<void>
  submitRsvp(draft: RsvpDraft): Promise<void>
}

export const GUESTBOOK_LIMIT = 300
export const NAME_MAX = 20
export const MESSAGE_MAX = 300

import { isFirebaseConfigured, loadFirebase } from './firebase'

/* ------------------------------------------------------------------ local -- */

const LOCAL_OWNER_KEY = 'wedding:ownerId'
const LOCAL_GUESTBOOK_KEY = 'wedding:guestbook'
const LOCAL_RSVP_KEY = 'wedding:rsvp'

function randomId(): string {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode or a full quota — the UI still shows the optimistic result.
  }
}

const localStore: Store = {
  mode: 'local',

  async getOwnerId() {
    let id = readLocal<string | null>(LOCAL_OWNER_KEY, null)
    if (!id) {
      id = randomId()
      writeLocal(LOCAL_OWNER_KEY, id)
    }
    return id
  },

  async listGuestbook() {
    const entries = readLocal<GuestbookEntry[]>(LOCAL_GUESTBOOK_KEY, [])
    return [...entries].sort((a, b) => b.createdAt - a.createdAt)
  },

  async addGuestbook(draft) {
    const entry: GuestbookEntry = {
      id: randomId(),
      name: draft.name,
      message: draft.message,
      createdAt: Date.now(),
      ownerId: await localStore.getOwnerId(),
    }
    const entries = readLocal<GuestbookEntry[]>(LOCAL_GUESTBOOK_KEY, [])
    writeLocal(LOCAL_GUESTBOOK_KEY, [entry, ...entries].slice(0, GUESTBOOK_LIMIT))
    return { entry, saved: Promise.resolve() }
  },

  async removeGuestbook(id) {
    const entries = readLocal<GuestbookEntry[]>(LOCAL_GUESTBOOK_KEY, [])
    writeLocal(
      LOCAL_GUESTBOOK_KEY,
      entries.filter((entry) => entry.id !== id),
    )
  },

  async submitRsvp(draft) {
    const entries = readLocal<Array<RsvpDraft & { id: string; createdAt: number }>>(LOCAL_RSVP_KEY, [])
    writeLocal(LOCAL_RSVP_KEY, [{ ...draft, id: randomId(), createdAt: Date.now() }, ...entries])
  },
}

/* -------------------------------------------------------------- firestore -- */

interface FirebaseContext {
  db: any
  uid: string
  sdk: typeof import('firebase/firestore')
}

let contextPromise: Promise<FirebaseContext> | null = null

async function getContext(): Promise<FirebaseContext> {
  if (!contextPromise) {
    contextPromise = (async () => {
      const { db, auth, firestore, authSdk } = await loadFirebase()
      // Returns the already-signed-in anonymous user when one exists, so the
      // same uid — and therefore the same delete rights — persists per browser.
      const credential = await authSdk.signInAnonymously(auth)
      return { db, uid: credential.user.uid, sdk: firestore }
    })().catch((error) => {
      contextPromise = null
      throw error
    })
  }
  return contextPromise
}

const firestoreStore: Store = {
  mode: 'firestore',

  async getOwnerId() {
    const { uid } = await getContext()
    return uid
  },

  async listGuestbook() {
    const { db, sdk } = await getContext()
    const snapshot = await sdk.getDocs(
      sdk.query(sdk.collection(db, 'guestbook'), sdk.orderBy('createdAt', 'desc'), sdk.limit(GUESTBOOK_LIMIT)),
    )
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        name: String(data.name ?? ''),
        message: String(data.message ?? ''),
        createdAt: Number(data.createdAt ?? 0),
        ownerId: String(data.ownerId ?? ''),
      }
    })
  },

  async addGuestbook(draft) {
    const { db, sdk, uid } = await getContext()
    // Generating the reference locally gives us the id up front, so the entry
    // can be rendered before the server has been asked about it.
    const ref = sdk.doc(sdk.collection(db, 'guestbook'))
    const data = {
      name: draft.name,
      message: draft.message,
      createdAt: Date.now(),
      ownerId: uid,
    }

    return { entry: { id: ref.id, ...data }, saved: sdk.setDoc(ref, data) }
  },

  async removeGuestbook(id) {
    const { db, sdk } = await getContext()
    await sdk.deleteDoc(sdk.doc(db, 'guestbook', id))
  },

  async submitRsvp(draft) {
    const { db, sdk, uid } = await getContext()
    await sdk.addDoc(sdk.collection(db, 'rsvp'), { ...draft, ownerId: uid, createdAt: Date.now() })
  },
}

export const store: Store = isFirebaseConfigured ? firestoreStore : localStore
