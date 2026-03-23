import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { getProcessLogs } from '../services/tauri-service'
import type { LogLine } from '../types/process'

interface ProcessOutputEvent {
  process_id: string
  line: string
  stream: 'stdout' | 'stderr'
}

export function useProcessLogs(processId: string) {
  const [logs, setLogs] = useState<LogLine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchInitialLogs() {
      try {
        const initialLogs = await getProcessLogs(processId)
        if (mounted) {
          setLogs(initialLogs)
          setIsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch logs')
          setIsLoading(false)
        }
      }
    }

    fetchInitialLogs()

    const unlistenPromise = listen<ProcessOutputEvent>('process-output', (event) => {
      if (event.payload.process_id === processId) {
        setLogs((prev) => [
          ...prev,
          { content: event.payload.line, stream: event.payload.stream },
        ])
      }
    })

    return () => {
      mounted = false
      unlistenPromise.then((fn) => fn())
    }
  }, [processId])

  return { logs, isLoading, error }
}