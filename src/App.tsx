import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { ToastProvider } from './components/ui/ToastProvider'
import { Intro } from './components/sections/Intro'
import { Cover } from './components/sections/Cover'
import { Invitation } from './components/sections/Invitation'
import { Contact } from './components/sections/Contact'
import { CalendarSection } from './components/sections/CalendarSection'
import { Gallery } from './components/sections/Gallery'
import { Location } from './components/sections/Location'
import { Accounts } from './components/sections/Accounts'
import { Rsvp } from './components/sections/Rsvp'
import { Guestbook } from './components/sections/Guestbook'
import { ShareSection } from './components/sections/ShareSection'
import { Footer } from './components/sections/Footer'
import { SiteConfigProvider, useSections } from './lib/useSiteConfig'
import type { SectionId } from './data/sections'
import styles from './App.module.css'

/**
 * Everything the admin page can reorder.
 *
 * The cover opens the invitation and the footer closes it — neither reads as
 * anything else — so they sit outside this map and outside the arrangement.
 */
const SECTIONS: Record<SectionId, ReactNode> = {
  invitation: <Invitation />,
  contact: <Contact />,
  calendar: <CalendarSection />,
  gallery: <Gallery />,
  location: <Location />,
  accounts: <Accounts />,
  rsvp: <Rsvp />,
  guestbook: <Guestbook />,
  share: <ShareSection />,
}

function InvitationPage() {
  const [introDone, setIntroDone] = useState(false)
  const sections = useSections()

  // A reopened invitation should start at the cover, not wherever the browser
  // last left the scroll position.
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
  }, [])

  return (
    <ToastProvider>
      {!introDone && <Intro onDone={() => setIntroDone(true)} />}

      <div className={styles.page}>
        <main className={styles.column}>
          <Cover started={introDone} />

          {sections
            .filter((section) => section.visible)
            .map((section) => (
              <Fragment key={section.id}>{SECTIONS[section.id]}</Fragment>
            ))}

          <Footer />
        </main>
      </div>
    </ToastProvider>
  )
}

export default function App() {
  return (
    <SiteConfigProvider>
      <InvitationPage />
    </SiteConfigProvider>
  )
}
