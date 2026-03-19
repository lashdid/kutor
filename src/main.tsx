import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getCurrentWindow } from '@tauri-apps/api/window'
import App from './App'
import CreateProcess from './pages/create-process'
import './style.css'

const queryClient = new QueryClient()

async function main() {
  const window = getCurrentWindow()
  const label = window.label
  
  const root = ReactDOM.createRoot(document.getElementById('root')!)
  
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        {label === 'main' ? <App /> : <CreateProcess />}
      </QueryClientProvider>
    </React.StrictMode>
  )
}

main()