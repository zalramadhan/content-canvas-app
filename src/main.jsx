import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// PWA: saat service worker versi baru mengambil alih (skipWaiting + clientsClaim),
// muat ulang halaman otomatis supaya selalu memakai bundle/index.html terbaru
// (mencegah layar blank akibat cache lama yang menunjuk ke file yang sudah dihapus).
if ('serviceWorker' in navigator) {
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
