export type ProcessStatus = 'running' | 'stopped' | 'crashed' | 'completed'

export interface Process {
  id: string
  name: string
  command: string
  working_directory: string
  status: ProcessStatus
  error_message: string | null
  memory_bytes: number | null
  uptime_secs: number | null
  pid: number | null
}

export interface CreateProcessParams {
  name: string
  command: string
  working_directory: string
}

export interface LogLine {
  content: string
  stream: 'stdout' | 'stderr'
}