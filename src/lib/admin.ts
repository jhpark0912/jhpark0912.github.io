/**
 * Admin-side data access for the guestbook and the RSVP responses.
 *
 * Whether someone is an admin is decided by Firestore, not by this file: the
 * security rules check for a document at `admins/{uid}`. Signing in here only
 * gets you an identity — every read and delete below still has to pass those
 * rules, so a curious guest who reaches this page and creates an account of
 * their own sees nothing and can delete nothing.
 */

import { describeError, loadFirebase } from './firebase'
import { GUESTBOOK_LIMIT, type GuestbookEntry, type MealChoice, type RsvpSide } from './store'

export interface RsvpEntry {
  id: string
  side: RsvpSide
  name: string
  attending: boolean
  headcount: number
  meal: MealChoice
  phone: string
  note: string
  createdAt: number
}

export interface AdminSession {
  uid: string
  email: string
}

/** Distinguishes "wrong password" from "signed in but not an admin". */
export class NotAnAdminError extends Error {
  constructor() {
    super('이 계정에는 관리자 권한이 없습니다.')
    this.name = 'NotAnAdminError'
  }
}

async function requireDb() {
  const { db, firestore } = await loadFirebase()
  return { db, sdk: firestore }
}

/** Resolves with the current session, or null when nobody is signed in yet. */
export function watchSession(onChange: (session: AdminSession | null) => void): () => void {
  let unsubscribe: (() => void) | null = null
  let cancelled = false

  void loadFirebase().then(({ auth, authSdk }) => {
    if (cancelled) return
    unsubscribe = authSdk.onAuthStateChanged(auth, (user: any) => {
      // Anonymous guests are not admins; only a real account counts here.
      onChange(user && !user.isAnonymous ? { uid: user.uid, email: user.email ?? '' } : null)
    })
  })

  return () => {
    cancelled = true
    unsubscribe?.()
  }
}

export async function signIn(email: string, password: string): Promise<AdminSession> {
  const { auth, authSdk } = await loadFirebase()
  const credential = await authSdk.signInWithEmailAndPassword(auth, email, password)
  return { uid: credential.user.uid, email: credential.user.email ?? '' }
}

export async function signOut(): Promise<void> {
  const { auth, authSdk } = await loadFirebase()
  await authSdk.signOut(auth)
}

/**
 * Confirms the signed-in account is actually an admin by doing something only
 * an admin may do — reading the RSVP collection.
 *
 * Only a permission error means "not on the allowlist". Anything else (rules
 * never published, network down) is rethrown as-is: reporting those as a
 * missing admin entry would send someone looking in the wrong place.
 */
export async function verifyAdmin(): Promise<void> {
  const { db, sdk } = await requireDb()
  try {
    await sdk.getDocs(sdk.query(sdk.collection(db, 'rsvp'), sdk.limit(1)))
  } catch (error) {
    if (describeError(error) === 'permission-denied') throw new NotAnAdminError()
    throw error
  }
}

export async function listGuestbook(): Promise<GuestbookEntry[]> {
  const { db, sdk } = await requireDb()
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
}

export async function deleteGuestbookEntry(id: string): Promise<void> {
  const { db, sdk } = await requireDb()
  await sdk.deleteDoc(sdk.doc(db, 'guestbook', id))
}

export async function listRsvp(): Promise<RsvpEntry[]> {
  const { db, sdk } = await requireDb()
  const snapshot = await sdk.getDocs(
    sdk.query(sdk.collection(db, 'rsvp'), sdk.orderBy('createdAt', 'desc'), sdk.limit(500)),
  )
  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      side: data.side === 'bride' ? 'bride' : 'groom',
      name: String(data.name ?? ''),
      attending: Boolean(data.attending),
      headcount: Number(data.headcount ?? 0),
      meal: (['yes', 'no', 'undecided'] as const).includes(data.meal) ? data.meal : 'undecided',
      phone: String(data.phone ?? ''),
      note: String(data.note ?? ''),
      createdAt: Number(data.createdAt ?? 0),
    }
  })
}

export interface RsvpSummary {
  responses: number
  attending: number
  declined: number
  /** Total heads across everyone who said yes. */
  guests: number
  groomGuests: number
  brideGuests: number
  meals: number
}

export function summarise(entries: RsvpEntry[]): RsvpSummary {
  const summary: RsvpSummary = {
    responses: entries.length,
    attending: 0,
    declined: 0,
    guests: 0,
    groomGuests: 0,
    brideGuests: 0,
    meals: 0,
  }

  for (const entry of entries) {
    if (!entry.attending) {
      summary.declined += 1
      continue
    }
    summary.attending += 1
    summary.guests += entry.headcount
    if (entry.side === 'groom') summary.groomGuests += entry.headcount
    else summary.brideGuests += entry.headcount
    // '미정' is counted as a meal so catering is never under-ordered.
    if (entry.meal !== 'no') summary.meals += entry.headcount
  }

  return summary
}
