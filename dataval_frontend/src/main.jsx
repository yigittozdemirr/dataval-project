import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
        {/* Global toast renderer — lives outside Router so toasts survive navigation */}
        <Toaster
            position="bottom-right"
            theme="dark"
            richColors
            toastOptions={{
                style: {
                    background: '#252520',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontFamily: 'inherit',
                },
            }}
        />
    </React.StrictMode>,
)
