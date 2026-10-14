import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { backupService } from './services/backupService'

// Clean up any ephemeral sample exploration data on startup / page refresh
backupService.cleanupSamplePreviewOnStartup().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
