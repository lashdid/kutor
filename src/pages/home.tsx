import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { ProcessTable } from '../components/process-table'

export default function Home() {
  const handleCreateProcess = async () => {
    const webview = new WebviewWindow('create-process', {
      url: '/',
      title: 'Create Process',
      width: 400,
      height: 300,
    })
    await webview.once('tauri://created', () => {
      console.log('Create process window created')
    })
    await webview.once('tauri://error', (e) => {
      console.error('Failed to create window:', e)
    })
  }

  return (
    <div>
      <h1>Kutor</h1>
      <button onClick={handleCreateProcess}>Create Process</button>
      <h2>Processes</h2>
      <ProcessTable />
    </div>
  )
}