import { useProcesses } from '../hooks/use-processes'
import { useStartProcess } from '../hooks/use-start-process'
import { useStopProcess } from '../hooks/use-stop-process'
import { useRestartProcess } from '../hooks/use-restart-process'
import { useDeleteProcess } from '../hooks/use-delete-process'
import { ProcessRow } from './process-row'
import { Table } from '@heroui/react'

export function ProcessTable() {
  const { data: processes, isLoading, error } = useProcesses()
  const startMutation = useStartProcess()
  const stopMutation = useStopProcess()
  const restartMutation = useRestartProcess()
  const deleteMutation = useDeleteProcess()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Processes table">
          <Table.Header>
            <Table.Column isRowHeader>Name</Table.Column>
            <Table.Column>PID</Table.Column>
            <Table.Column>Status</Table.Column>
            <Table.Column>Directory</Table.Column>
            <Table.Column>Memory</Table.Column>
            <Table.Column>Uptime</Table.Column>
            <Table.Column>Actions</Table.Column>
          </Table.Header>
          <Table.Body>
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
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}