import type { Process } from '../types/process'
import { formatMemory, formatUptime } from '../utils/format'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'

interface ProcessRowProps {
  process: Process
  onStart: (id: string) => void
  onStop: (id: string) => void
  onRestart: (id: string) => void
  onDelete: (id: string) => void
}

export function ProcessRow({ process, onStart, onStop, onRestart, onDelete }: ProcessRowProps) {
  const isRunning = process.status === 'running'
  const isStopped = process.status === 'stopped'
  const isCrashed = process.status === 'crashed'
  const isCompleted = process.status === 'completed'

  async function handleViewLog() {
    const mainWindow = getCurrentWindow()
    const webview = new WebviewWindow(`log-${process.id}`, {
      url: '/',
      title: `Log - ${process.name}`,
      width: 800,
      height: 500,
      parent: mainWindow.label,
    })
    
    webview.once('tauri://error', (e) => {
      console.error('Failed to create log window:', e)
    })
  }

  const getStatusColor = () => {
    if (isRunning) return 'green'
    if (isCompleted) return 'blue'
    if (isCrashed) return 'red'
    return 'gray'
  }

  return (
    <tr>
      <td>{process.name}</td>
      <td>{process.pid ?? '-'}</td>
      <td style={{ color: getStatusColor() }}>
        {process.status}
        {process.error_message && <span title={process.error_message}> (error)</span>}
      </td>
      <td>{process.working_directory}</td>
      <td>{formatMemory(process.memory_bytes)}</td>
      <td>{formatUptime(process.uptime_secs)}</td>
      <td>
        <button onClick={() => onStart(process.id)} disabled={!isStopped && !isCrashed && !isCompleted}>
          Start
        </button>
        <button onClick={() => onStop(process.id)} disabled={!isRunning}>
          Stop
        </button>
        <button onClick={() => onRestart(process.id)} disabled={!isRunning}>
          Restart
        </button>
        <button onClick={() => onDelete(process.id)}>
          Delete
        </button>
        <button onClick={handleViewLog}>
          Log
        </button>
      </td>
    </tr>
  )
}