import { useEffect, useState } from 'react'
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
import styles from './App.module.css'

export default function App() {
  const [introDone, setIntroDone] = useState(false)

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
          <Invitation />
          <Contact />
          <CalendarSection />
          <Gallery />
          <Location />
          <Accounts />
          <Rsvp />
          <Guestbook />
          <ShareSection />
          <Footer />
        </main>
      </div>
    </ToastProvider>
  )
}
