import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { isAppError } from '@/lib/errors'
import { StorageErrorPage } from '@/pages/StorageErrorPage'
import { bootstrapStorage, storage } from '@/services/storage'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

function resetStorage() {
  if (!window.confirm('This permanently deletes all locally saved app data. Continue?')) return
  storage.clear()
  window.location.reload()
}

let content: ReactNode
try {
  bootstrapStorage(storage)
  content = <App />
} catch (error) {
  console.error('[storage] bootstrap failed', error)
  const message = isAppError(error) ? error.message : 'An unexpected storage error occurred.'
  content = <StorageErrorPage message={message} onReset={resetStorage} />
}

createRoot(rootElement).render(<StrictMode>{content}</StrictMode>)
