import { Chip, Button, Tooltip } from '@heroui/react'
import { Play, Stop, ArrowRotateRight, TrashBin, TextAlignLeft } from '@gravity-ui/icons'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type { Process, ProcessStatus } from '../types/process'

export function StatusChip({ status, hasError }: { status: ProcessStatus; hasError: boolean }) {
  const color = status === 'running' ? 'success' : status === 'crashed' ? 'danger' : status === 'completed' ? 'default' : 'warning'
  return (
    <div className="flex gap-1 items-center">
      <Chip color={color} variant="soft" size="sm">
        {status}
      </Chip>
      {hasError && (
        <Chip color="danger" variant="soft" size="sm">
          error
        </Chip>
      )}
    </div>
  )
}

interface ActionButtonsProps {
  process: Process
  onStart: () => void
  onStop: () => void
  onRestart: () => void
  onDelete: () => void
}

export function ActionButtons({ process, onStart, onStop, onRestart, onDelete }: ActionButtonsProps) {
  const isRunning = process.status === 'running'

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

  return (
    <div className="flex gap-1">
      {isRunning ? (
        <Tooltip delay={0}>
          <Button onPress={onStop} isIconOnly size="sm" variant="secondary">
            <Stop />
          </Button>
          <Tooltip.Content>
            <p>Stop</p>
          </Tooltip.Content>
        </Tooltip>
      ) : (
        <Tooltip delay={0}>
          <Button onPress={onStart} isDisabled={isRunning} isIconOnly size="sm" variant="secondary">
            <Play />
          </Button>
          <Tooltip.Content>
            <p>Start</p>
          </Tooltip.Content>
        </Tooltip>
      )}

      <Tooltip delay={0}>
        <Button
          onPress={onRestart}
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
        <Button onPress={onDelete} isIconOnly size="sm" variant="danger-soft">
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
  )
}