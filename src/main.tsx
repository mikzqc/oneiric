import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { backupService } from './services/backupService'
import { wakeTimeService } from './services/wakeTimeService'

// Clean up any ephemeral sample exploration data on startup / page refresh
backupService.cleanupSamplePreviewOnStartup().finally(() => {
  // Non-blocking background time zone verification
  wakeTimeService.refreshTimeZone().catch(() => {})

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
