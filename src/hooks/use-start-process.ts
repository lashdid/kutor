import { useMutation, useQueryClient } from '@tanstack/react-query'
import { startProcess } from '../services/tauri-service'

export function useStartProcess() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: startProcess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] })
    },
  })
}