/**
 * The draft the admin page edits, and the two questions it has to answer at
 * every moment: is there anything unsaved, and is there anything unpublished.
 *
 * Both are answered by comparing serialised snapshots rather than by tracking
 * flags. A flag set on every keystroke drifts — undo an edit by hand and the
 * page would still claim there was something to save. Comparing the actual
 * documents cannot drift.
 *
 * Photo bytes are excluded from the comparison because they are excluded from
 * what gets written: `forStorage` strips them, and the thumbnails the admin
 * page renders are resolved separately.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  defaultConfig,
  forStorage,
  loadConfig,
  publishConfig,
  saveConfig,
  type SiteConfig,
} from '../lib/siteConfig'
import { collectOrphans, resolvePhotos } from '../lib/photos'
import { describeError, withTimeout } from '../lib/firebase'
import type { WeddingContent } from '../data/wedding'
import type { SectionSetting } from '../data/sections'

const LOAD_TIMEOUT_MS = 15_000

function snapshot(config: SiteConfig): string {
  return JSON.stringify(forStorage(config))
}

export interface DraftStore {
  config: SiteConfig
  status: 'loading' | 'ready' | 'error'
  reason: string
  /** Edited since the last 임시저장. */
  unsaved: boolean
  /** Different from what guests are currently seeing. */
  unpublished: boolean
  busy: 'idle' | 'saving' | 'publishing'
  editContent(update: (content: WeddingContent) => WeddingContent): void
  setSections(sections: SectionSetting[]): void
  /** Writes the draft. Rejects on failure — the shell reports it. */
  save(): Promise<void>
  publish(): Promise<void>
  reload(): Promise<void>
}

const DraftContext = createContext<DraftStore | null>(null)

export function useDraft(): DraftStore {
  const store = useContext(DraftContext)
  if (!store) throw new Error('useDraft must be used inside a DraftProvider')
  return store
}

export function DraftProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(defaultConfig)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<'idle' | 'saving' | 'publishing'>('idle')
  const [savedMark, setSavedMark] = useState('')
  const [publishedMark, setPublishedMark] = useState('')

  const reload = useCallback(async () => {
    setStatus('loading')
    setReason('')
    try {
      // The draft is what is being edited; the published document is only read
      // so the page can say whether the two have diverged.
      const [draft, published] = await withTimeout(
        Promise.all([loadConfig('draft'), loadConfig('published')]),
        LOAD_TIMEOUT_MS,
        '설정을 불러오지 못했습니다',
      )

      const base = draft ?? published ?? defaultConfig()
      const resolved: SiteConfig = { ...base, content: await resolvePhotos(base.content) }

      setConfig(resolved)
      setSavedMark(snapshot(resolved))
      setPublishedMark(snapshot(published ?? defaultConfig()))
      setStatus('ready')
    } catch (error) {
      setReason(describeError(error))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const editContent = useCallback((update: (content: WeddingContent) => WeddingContent) => {
    setConfig((current) => ({ ...current, content: update(current.content) }))
  }, [])

  const setSections = useCallback((sections: SectionSetting[]) => {
    setConfig((current) => ({ ...current, sections }))
  }, [])

  const save = useCallback(async () => {
    setBusy('saving')
    try {
      const mark = snapshot(config)
      await saveConfig('draft', config)
      setSavedMark(mark)
    } finally {
      setBusy('idle')
    }
  }, [config])

  const publish = useCallback(async () => {
    setBusy('publishing')
    try {
      const mark = snapshot(config)
      await publishConfig(config)
      setSavedMark(mark)
      setPublishedMark(mark)
      // Draft and published now agree, which makes this the one safe moment to
      // drop the photos neither of them points at any more.
      await collectOrphans(config)
    } finally {
      setBusy('idle')
    }
  }, [config])

  const current = snapshot(config)
  const unsaved = status === 'ready' && current !== savedMark

  // Closing the tab mid-edit loses the edit; the browser's own dialog is the
  // only thing that can interrupt that in time.
  useEffect(() => {
    if (!unsaved) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [unsaved])

  const value = useMemo<DraftStore>(
    () => ({
      config,
      status,
      reason,
      unsaved,
      unpublished: status === 'ready' && current !== publishedMark,
      busy,
      editContent,
      setSections,
      save,
      publish,
      reload,
    }),
    [config, status, reason, current, unsaved, publishedMark, busy, editContent, setSections, save, publish, reload],
  )

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
}
