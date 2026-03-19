import { useQuery } from '@tanstack/react-query'
import { getAllProcesses } from '../services/tauri-service'
import type { Process } from '../types/process'

export function useProcesses() {
  return useQuery<Process[]>({
    queryKey: ['processes'],
    queryFn: getAllProcesses,
    refetchInterval: 1000,
  })
}