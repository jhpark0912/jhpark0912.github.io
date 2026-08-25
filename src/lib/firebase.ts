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

export interface FirebaseBundle {
  db: any
  auth: any
  firestore: typeof import('firebase/firestore')
  authSdk: typeof import('firebase/auth')
}

let bundlePromise: Promise<FirebaseBundle> | null = null

export function loadFirebase(): Promise<FirebaseBundle> {
  if (!bundlePromise) {
    bundlePromise = (async () => {
      const [appSdk, firestore, authSdk] = await Promise.all([
        import('firebase/app'),
        import('firebase/firestore'),
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
