import { useProcesses } from '../hooks/use-processes'
import { useStartProcess } from '../hooks/use-start-process'
import { useStopProcess } from '../hooks/use-stop-process'
import { useRestartProcess } from '../hooks/use-restart-process'
import { useDeleteProcess } from '../hooks/use-delete-process'
import { ProcessRow } from './process-row'

export function ProcessTable() {
  const { data: processes, isLoading, error } = useProcesses()
  const startMutation = useStartProcess()
  const stopMutation = useStopProcess()
  const restartMutation = useRestartProcess()
  const deleteMutation = useDeleteProcess()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Directory</th>
          <th>Memory</th>
          <th>Uptime</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {processes?.map((process) => (
          <ProcessRow
            key={process.id}
            process={process}
            onStart={(id) => startMutation.mutate(id)}
            onStop={(id) => stopMutation.mutate(id)}
            onRestart={(id) => restartMutation.mutate(id)}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </tbody>
    </table>
  )
}