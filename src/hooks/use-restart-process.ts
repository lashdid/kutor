import { useMutation, useQueryClient } from '@tanstack/react-query'
import { restartProcess } from '../services/tauri-service'

export function useRestartProcess() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: restartProcess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] })
    },
  })
}