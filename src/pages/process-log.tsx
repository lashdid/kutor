import { useEffect, useRef } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useProcessLogs } from '../hooks/use-process-logs'
import './process-log.css'

export default function ProcessLog() {
  const window = getCurrentWindow()
  const label = window.label
  const processId = label.replace('log-', '')
  const { logs, isLoading, error } = useProcessLogs(processId)
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.setTitle(`Process Log - ${processId}`)
  }, [window, processId])

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  if (isLoading) {
    return <div className="process-log-container">Loading...</div>
  }

  if (error) {
    return <div className="process-log-container">Error: {error}</div>
  }

  return (
    <div className="process-log-container" ref={logContainerRef}>
      {logs.length === 0 ? (
        <div className="process-log-empty">No logs yet. Start the process to see output.</div>
      ) : (
        logs.map((log, index) => (
          <div
            key={index}
            className={`process-log-line ${log.stream === 'stderr' ? 'stderr' : 'stdout'}`}
          >
            {log.content}
          </div>
        ))
      )}
    </div>
  )
}