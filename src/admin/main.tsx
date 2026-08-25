import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AdminApp from './AdminApp'
import '../styles/global.css'

const container = document.getElementById('root')
if (!container) throw new Error('#root container is missing from admin.html')

createRoot(container).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
)
