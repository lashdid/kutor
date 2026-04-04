import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Button } from '@heroui/react'
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
      await mainWindow.setFocus()
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Processes</h2>
        <Button onPress={handleCreateProcess}>Create Process</Button>
      </div>
      <ProcessTable />
    </div>
  )
}