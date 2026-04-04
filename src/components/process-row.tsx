import type { Process } from '../types/process'
import { formatMemory, formatUptime } from '../utils/format'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Button, Chip, Table, Tooltip } from '@heroui/react'
import { Play, Stop, ArrowRotateRight, TrashBin, TextAlignLeft } from '@gravity-ui/icons'

interface ProcessRowProps {
  process: Process
  onStart: (id: string) => void
  onStop: (id: string) => void
  onRestart: (id: string) => void
  onDelete: (id: string) => void
}

export function ProcessRow({ process, onStart, onStop, onRestart, onDelete }: ProcessRowProps) {
  const isRunning = process.status === 'running'
  const isCrashed = process.status === 'crashed'
  const isCompleted = process.status === 'completed'

  async function handleViewLog() {
    const mainWindow = getCurrentWindow()
    const webview = new WebviewWindow(`log-${process.id}`, {
      url: '/',
      title: `Log - ${process.name}`,
      width: 800,
      height: 500,
      parent: mainWindow.label,
    })
    
    webview.once('tauri://error', (e) => {
      console.error('Failed to create log window:', e)
    })
  }

  const getStatusColor = (): 'success' | 'danger' | 'warning' | 'default' => {
    if (isRunning) return 'success'
    if (isCompleted) return 'default'
    if (isCrashed) return 'danger'
    return 'warning'
  }

  return (
    <Table.Row id={process.id}>
      <Table.Cell>{process.name}</Table.Cell>
      <Table.Cell>{process.pid ?? '-'}</Table.Cell>
      <Table.Cell>
        <div className="flex gap-1 items-center">
          <Chip color={getStatusColor()} variant="soft" size="sm">
            {process.status}
          </Chip>
          {process.error_message && (
            <Chip color="danger" variant="soft" size="sm">
              error
            </Chip>
          )}
        </div>
      </Table.Cell>
      <Table.Cell>{process.working_directory}</Table.Cell>
      <Table.Cell>{formatMemory(process.memory_bytes)}</Table.Cell>
      <Table.Cell>{formatUptime(process.uptime_secs)}</Table.Cell>
      <Table.Cell>
        <div className="flex gap-1">
          {isRunning ? (
            <Tooltip delay={0}>
              <Button
                onPress={() => onStop(process.id)}
                isIconOnly
                size="sm"
                variant="secondary"
              >
                <Stop />
              </Button>
              <Tooltip.Content>
                <p>Stop</p>
              </Tooltip.Content>
            </Tooltip>
          ) : (
            <Tooltip delay={0}>
              <Button
                onPress={() => onStart(process.id)}
                isDisabled={isRunning}
                isIconOnly
                size="sm"
                variant="secondary"
              >
                <Play />
              </Button>
              <Tooltip.Content>
                <p>Start</p>
              </Tooltip.Content>
            </Tooltip>
          )}

          <Tooltip delay={0}>
            <Button
              onPress={() => onRestart(process.id)}
              isDisabled={!isRunning}
              isIconOnly
              size="sm"
              variant="secondary"
            >
              <ArrowRotateRight />
            </Button>
            <Tooltip.Content>
              <p>Restart</p>
            </Tooltip.Content>
          </Tooltip>

          <Tooltip delay={0}>
            <Button
              onPress={() => onDelete(process.id)}
              isIconOnly
              size="sm"
              variant="danger-soft"
            >
              <TrashBin />
            </Button>
            <Tooltip.Content>
              <p>Delete</p>
            </Tooltip.Content>
          </Tooltip>

          <Tooltip delay={0}>
            <Button onPress={handleViewLog} isIconOnly size="sm" variant="tertiary">
              <TextAlignLeft />
            </Button>
            <Tooltip.Content>
              <p>View Log</p>
            </Tooltip.Content>
          </Tooltip>
        </div>
      </Table.Cell>
    </Table.Row>
  )
}