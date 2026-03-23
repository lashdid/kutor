import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getCurrentWindow } from '@tauri-apps/api/window'
import App from './App'
import CreateProcess from './pages/create-process'
import ProcessLog from './pages/process-log'
import './style.css'

const queryClient = new QueryClient()

async function main() {
  const window = getCurrentWindow()
  const label = window.label
  
  const root = ReactDOM.createRoot(document.getElementById('root')!)
  
  let content: React.ReactNode
  if (label === 'main') {
    content = <App />
  } else if (label === 'create-process') {
    content = <CreateProcess />
  } else if (label.startsWith('log-')) {
    content = <ProcessLog />
  } else {
    content = <App />
  }
  
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        {content}
      </QueryClientProvider>
    </React.StrictMode>
  )
}

main()