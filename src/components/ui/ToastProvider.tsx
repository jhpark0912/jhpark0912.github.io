import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import styles from './Toast.module.css'

interface Toast {
  id: number
  message: string
}

const ToastContext = createContext<(message: string) => void>(() => {})

/** Shows a short confirmation — used after copying an address or an account. */
export function useToast(): (message: string) => void {
  return useContext(ToastContext)
}

const VISIBLE_MS = 1800

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const show = useCallback((message: string) => {
    const id = nextId.current
    nextId.current += 1

    setToasts((current) => [...current, { id, message }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, VISIBLE_MS)
  }, [])

  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* polite: a copy confirmation should never interrupt what a guest is reading */}
      <div className={styles.stack} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <p key={toast.id} className={styles.toast}>
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
