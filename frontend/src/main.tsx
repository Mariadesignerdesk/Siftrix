import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeTheme } from './services/themeService'

// Initialize persisted theme mode (light, dark, system)
initializeTheme()

// Register Progressive Web App Service Worker if supported
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => {
        // Safe graceful degradation if offline worker fails
        console.warn('SIFTRIX Service Worker registration skipped:', err)
      })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
