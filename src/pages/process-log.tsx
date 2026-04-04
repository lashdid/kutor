import { useEffect, useRef } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useProcessLogs } from '../hooks/use-process-logs'
import { Card } from '@heroui/react'

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
    return (
      <Card variant="transparent">
        <Card.Content>Loading...</Card.Content>
      </Card>
    )
  }

  if (error) {
    return (
      <Card variant="transparent">
        <Card.Content>Error: {error}</Card.Content>
      </Card>
    )
  }

  return (
    <Card variant="transparent">
      <Card.Content
        ref={logContainerRef}
        className="h-screen overflow-y-auto p-2 font-mono text-xs"
        style={{
          backgroundColor: '#1e1e1e',
          color: '#d4d4d4',
        }}
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 italic">
            No logs yet. Start the process to see output.
          </div>
        ) : (
          <div className="space-y-0.5">
            {logs.map((log, index) => (
              <div
                key={index}
                className="whitespace-pre-wrap break-all"
                style={{ color: log.stream === 'stderr' ? '#f14c4c' : '#d4d4d4' }}
              >
                {log.content}
              </div>
            ))}
          </div>
        )}
      </Card.Content>
    </Card>
  )
}