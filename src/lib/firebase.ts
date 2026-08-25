/**
 * Shared Firebase bootstrap.
 *
 * The SDK is imported dynamically and initialised once, then handed to whoever
 * asks. Sign-in is deliberately *not* done here: the invitation signs guests in
 * anonymously, while the admin page signs in with a real account, and the two
 * must never overwrite each other's session.
 */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => typeof value === 'string' && value.length > 0,
)

/**
 * Fails a hanging request instead of leaving a spinner on screen forever.
 *
 * A rejected promise gives the guest a retry button and a reason; a promise
 * that never settles gives them nothing at all.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}: ${ms}ms 안에 응답이 없습니다`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/** Best-effort human-readable reason, used to explain a failure on screen. */
export function describeError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: unknown }).code)
    if (code) return code
  }
  if (error instanceof Error) return error.message
  return String(error)
}

export interface FirebaseBundle {
  db: any
  auth: any
  firestore: typeof import('firebase/firestore/lite')
  authSdk: typeof import('firebase/auth')
}

let bundlePromise: Promise<FirebaseBundle> | null = null

export function loadFirebase(): Promise<FirebaseBundle> {
  if (!bundlePromise) {
    bundlePromise = (async () => {
      const [appSdk, firestore, authSdk] = await Promise.all([
        import('firebase/app'),
        // The lite build talks REST instead of opening a streaming channel. We
        // only ever read a list and write single documents, so the realtime and
        // offline machinery in the full SDK is weight guests pay for nothing.
        import('firebase/firestore/lite'),
        import('firebase/auth'),
      ])

      const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(firebaseConfig)
      return { db: firestore.getFirestore(app), auth: authSdk.getAuth(app), firestore, authSdk }
    })().catch((error) => {
      bundlePromise = null
      throw error
    })
  }
  return bundlePromise
}
