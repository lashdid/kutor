import { useMutation, useQueryClient } from '@tanstack/react-query'
import { stopProcess } from '../services/tauri-service'

export function useStopProcess() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: stopProcess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] })
    },
  })
}