/**
 * Hands the published configuration to the invitation.
 *
 * Sections no longer import `wedding` directly; they call `useContent()` and
 * get whatever the admin page last published, merged over the bundled defaults.
 * Nothing here can fail visibly: a missing document, a refused read or a broken
 * network all end at the defaults, which are a complete, correct invitation.
 *
 * Three things arrive at different speeds, so they are handled separately:
 *
 *   the cached copy   instant, from a previous visit
 *   the configuration one small document, held for before the first paint
 *   the photos        one document each, filled in as they land
 *
 * Holding the first paint for the small document is what stops the names and
 * the date from visibly changing a second after the curtain rises. Photos are
 * not worth holding for — they appear as pictures normally do.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { defaultConfig, forStorage, loadConfig, mergeConfig, type SiteConfig } from './siteConfig'
import { resolvePhotos } from './photos'
import type { WeddingContent } from '../data/wedding'
import type { SectionSetting } from '../data/sections'

const CACHE_KEY = 'wedding:published'

/** Long enough for a slow phone, short enough not to look broken. */
const LOAD_TIMEOUT_MS = 5_000

const SiteConfigContext = createContext<SiteConfig>(defaultConfig())

export function useSiteConfig(): SiteConfig {
  return useContext(SiteConfigContext)
}

export function useContent(): WeddingContent {
  return useContext(SiteConfigContext).content
}

export function useSections(): SectionSetting[] {
  return useContext(SiteConfigContext).sections
}

/* ------------------------------------------------------------------ cache -- */

/**
 * The last published configuration, minus the photo bytes.
 *
 * Its only job is to let a returning guest see the right names immediately
 * instead of waiting on the network. It is refreshed on every visit, so a stale
 * copy survives exactly one paint.
 */
function readCache(): SiteConfig | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? mergeConfig(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function writeCache(config: SiteConfig): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...forStorage(config), updatedAt: config.updatedAt }))
  } catch {
    // Private mode or a full quota. The next visit just waits on the network.
  }
}

/* --------------------------------------------------------------- provider -- */

/**
 * `/?preview=draft` renders the unpublished draft instead of the live site.
 *
 * This is how the admin page previews an edit: the real invitation, in the
 * same browser, reading the other document. Nothing is exposed by supporting
 * it — the security rules only let an admin read the draft, so a guest who
 * types the parameter still gets the published site.
 */
function isDraftPreview(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('preview') === 'draft'
  } catch {
    return false
  }
}

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const preview = isDraftPreview()
  const [config, setConfig] = useState<SiteConfig | null>(() => (preview ? null : readCache()))
  const [waited, setWaited] = useState(false)

  useEffect(() => {
    let cancelled = false

    // Never leave the page blank because one request hung.
    const timer = window.setTimeout(() => {
      if (!cancelled) setWaited(true)
    }, LOAD_TIMEOUT_MS)

    void (async () => {
      let loaded: SiteConfig
      try {
        loaded = (await loadConfig(preview ? 'draft' : 'published')) ?? defaultConfig()
      } catch {
        loaded = defaultConfig()
      }
      if (cancelled) return

      setConfig(loaded)
      setWaited(true)
      // A draft is one person's work in progress; it must not become what the
      // next guest sees first.
      if (!preview) writeCache(loaded)

      try {
        const content = await resolvePhotos(loaded.content)
        if (!cancelled) setConfig({ ...loaded, content })
      } catch {
        // The uploaded photos stay out; everything else is already on screen.
      }
    })()

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [preview])

  // A first-time guest waits on the network here. The page background is
  // already painted by the document, so this reads as a beat, not a blank.
  if (!config && !waited) return null

  return <SiteConfigContext.Provider value={config ?? defaultConfig()}>{children}</SiteConfigContext.Provider>
}
