import { invoke } from '@tauri-apps/api/core'
import type { Process, CreateProcessParams } from '../types/process'

export async function createProcess(params: CreateProcessParams): Promise<string> {
  return invoke<string>('create_process', {
    name: params.name,
    command: params.command,
    workingDirectory: params.working_directory,
  })
}

export async function startProcess(id: string): Promise<void> {
  return invoke('start_process', { id })
}

export async function stopProcess(id: string): Promise<void> {
  return invoke('stop_process', { id })
}

export async function restartProcess(id: string): Promise<void> {
  return invoke('restart_process', { id })
}

export async function deleteProcess(id: string): Promise<void> {
  return invoke('delete_process', { id })
}

export async function getAllProcesses(): Promise<Process[]> {
  return invoke('get_all_processes')
}