import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ProcessTable } from '../components/process-table'

export default function Home() {
  const handleCreateProcess = async () => {
    const mainWindow = getCurrentWindow()
    await mainWindow.setEnabled(false)
    const webview = new WebviewWindow('create-process', {
      url: '/',
      title: 'Create Process',
      width: 400,
      height: 300,
      parent: mainWindow.label,
    })
    webview.once('tauri://destroyed', async () => {
      await mainWindow.setEnabled(true)
    })
    await webview.once('tauri://created', () => {
      console.log('Create process window created')
    })
    await webview.once('tauri://error', async (e) => {
      console.error('Failed to create window:', e)
      await mainWindow.setEnabled(true)
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