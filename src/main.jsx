import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Asegúrate de tener tus estilos o Tailwind aquí
import { BrowserRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter> {/* <--- ESTO ES CRUCIAL PARA QUE FUNCIONE App.jsx */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)