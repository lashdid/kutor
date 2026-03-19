import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteProcess } from '../services/tauri-service'

export function useDeleteProcess() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteProcess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] })
    },
  })
}