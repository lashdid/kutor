import type { Process } from '../types/process'
import { formatMemory, formatUptime } from '../utils/format'

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

  return (
    <tr>
      <td>{process.name}</td>
      <td style={{ color: isRunning ? 'green' : isCrashed ? 'red' : 'gray' }}>
        {process.status}
        {process.error_message && <span title={process.error_message}> (error)</span>}
      </td>
      <td>{process.working_directory}</td>
      <td>{formatMemory(process.memory_bytes)}</td>
      <td>{formatUptime(process.uptime_secs)}</td>
      <td>
        <button onClick={() => onStart(process.id)} disabled={!isStopped && !isCrashed}>
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
      </td>
    </tr>
  )
}