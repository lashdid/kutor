import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createProcess } from '../services/tauri-service'

export function useCreateProcess() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createProcess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] })
    },
  })
}