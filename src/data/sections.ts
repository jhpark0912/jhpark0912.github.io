/**
 * The order and visibility of the invitation's scrollable sections.
 *
 * The cover always comes first and the footer always last — neither reads as
 * anything else — so only the nine sections between them are arrangeable. The
 * admin page reorders and hides them; `normaliseSections` below is what keeps a
 * stored arrangement working after this list changes in code.
 */

export const SECTION_IDS = [
  'invitation',
  'contact',
  'calendar',
  'gallery',
  'location',
  'accounts',
  'rsvp',
  'guestbook',
  'share',
] as const

export type SectionId = (typeof SECTION_IDS)[number]

export interface SectionSetting {
  id: SectionId
  visible: boolean
}

/** Human-readable names, used by the admin page and nowhere else. */
export const SECTION_LABELS: Record<SectionId, string> = {
  invitation: '초대합니다',
  contact: '연락하기',
  calendar: '예식 일정',
  gallery: '우리의 순간',
  location: '오시는 길',
  accounts: '마음 전하실 곳',
  rsvp: '참석 여부',
  guestbook: '축하 메시지',
  share: '공유하기',
}

export const DEFAULT_SECTIONS: SectionSetting[] = SECTION_IDS.map((id) => ({ id, visible: true }))

/**
 * Reconciles a stored arrangement with the sections that exist today.
 *
 * Ids that no longer exist are dropped and ids that are new are appended in
 * their default order, so adding a section in code never leaves it invisible on
 * a site whose arrangement was saved before it existed. Anything malformed
 * falls back to the defaults rather than emptying the page.
 */
export function normaliseSections(stored: unknown): SectionSetting[] {
  if (!Array.isArray(stored)) return DEFAULT_SECTIONS.map((section) => ({ ...section }))

  const known = new Set<string>(SECTION_IDS)
  const seen = new Set<string>()
  const result: SectionSetting[] = []

  for (const item of stored) {
    if (!item || typeof item !== 'object') continue
    const id = String((item as { id?: unknown }).id ?? '')
    if (!known.has(id) || seen.has(id)) continue
    seen.add(id)
    result.push({ id: id as SectionId, visible: (item as { visible?: unknown }).visible !== false })
  }

  for (const id of SECTION_IDS) {
    if (!seen.has(id)) result.push({ id, visible: true })
  }

  return result
}
