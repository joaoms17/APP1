import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// o iOS ignora user-scalable=no — bloquear o pinch-zoom por JS
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false })
}
document.addEventListener('touchmove', (e) => { if (e.scale && e.scale !== 1) e.preventDefault() }, { passive: false })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
