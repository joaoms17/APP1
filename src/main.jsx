import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import App from './App.jsx'

// o iOS ignora user-scalable=no — bloquear o pinch-zoom por JS
// (compensado pelo "Tamanho do texto" nas Definições e pelas unidades --u)
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false })
}
document.addEventListener('touchmove', (e) => { if (e.scale && e.scale !== 1) e.preventDefault() }, { passive: false })

// o scroll de cada separador é reposto pela shell, não pelo browser
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
