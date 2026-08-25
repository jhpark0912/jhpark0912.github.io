/**
 * Reads public documents over Firestore's REST API, without the SDK.
 *
 * The invitation holds its first paint until the published configuration
 * arrives, and loading the Firebase SDK to fetch one small document would put
 * roughly 85 KB of gzipped JavaScript in front of every guest before they see
 * anything. A plain `fetch` fetches the same document in a few hundred bytes of
 * code.
 *
 * This only works for documents the security rules leave world-readable — the
 * published configuration and the uploaded photos. Everything that needs a
 * signed-in identity (the draft, the guestbook, the RSVP responses) still goes
 * through the SDK.
 */

import { firebaseConfig } from './firebase'

const BASE = 'https://firestore.googleapis.com/v1'

type Bag = Record<string, unknown>

/**
 * Unwraps Firestore's typed JSON into ordinary values.
 *
 * Integers arrive as strings because JSON cannot carry a 64-bit integer, so
 * they are converted back here rather than surprising a caller later.
 */
function decodeValue(value: Bag): unknown {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('booleanValue' in value) return Boolean(value.booleanValue)
  if ('nullValue' in value) return null
  if ('timestampValue' in value) return String(value.timestampValue)
  if ('mapValue' in value) return decodeFields(((value.mapValue as Bag)?.fields as Bag) ?? {})
  if ('arrayValue' in value) {
    const values = ((value.arrayValue as Bag)?.values as Bag[]) ?? []
    return values.map((item) => decodeValue(item))
  }
  // A type this file does not know about is likelier to be a mistake in the
  // console than something to guess at.
  return undefined
}

function decodeFields(fields: Bag): Bag {
  const result: Bag = {}
  for (const [key, value] of Object.entries(fields)) {
    result[key] = decodeValue(value as Bag)
  }
  return result
}

/**
 * Fetches one document by path, e.g. `site/published`.
 *
 * Resolves to null when the document does not exist — the normal state of a
 * project where nothing has been published yet. Anything else (a refused read,
 * a network failure) rejects, so the caller can tell "nothing there" apart from
 * "could not look".
 */
export async function readPublicDoc(path: string): Promise<Bag | null> {
  const { projectId, apiKey } = firebaseConfig
  const url = `${BASE}/projects/${projectId}/databases/(default)/documents/${path}?key=${apiKey}`

  const response = await fetch(url)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`firestore-rest-${response.status}`)

  const body = (await response.json()) as Bag
  return decodeFields((body.fields as Bag) ?? {})
}
