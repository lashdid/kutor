export type ProcessStatus = 'running' | 'stopped' | 'crashed'

export interface Process {
  id: string
  name: string
  command: string
  working_directory: string
  status: ProcessStatus
  error_message: string | null
}

export interface CreateProcessParams {
  name: string
  command: string
  working_directory: string
}