import { open } from '@tauri-apps/plugin-dialog'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useCreateProcess } from '../hooks/use-create-process'
import { useState } from 'react'
import { Button, Card, Form, Input, Label, TextField, FieldError } from '@heroui/react'

export default function CreateProcess() {
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [workingDirectory, setWorkingDirectory] = useState('')
  const createMutation = useCreateProcess()

  const handleBrowse = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    })
    if (selected) {
      setWorkingDirectory(selected as string)
    }
  }

  const handleClose = async () => {
    await getCurrentWindow().close()
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!name || !command || !workingDirectory) {
      return
    }

    createMutation.mutate(
      { name, command, working_directory: workingDirectory },
      {
        onSuccess: () => {
          handleClose()
        },
        onError: (error) => {
          console.error('Failed to create process:', error)
        },
      }
    )
  }

  return (
    <Card variant="transparent">
      <Card.Header>
        <Card.Title>Create Process</Card.Title>
      </Card.Header>
      <Form onSubmit={onSubmit}>
        <Card.Content>
          <div className="flex flex-col gap-4">
            <TextField
              name="name"
              isRequired
              onChange={setName}
              validate={(value) => {
                if (!value || value.trim() === '') {
                  return 'Name is required'
                }
                return null
              }}
            >
              <Label>Name</Label>
              <Input placeholder="Enter process name" value={name} />
              <FieldError />
            </TextField>

            <TextField
              name="command"
              isRequired
              onChange={setCommand}
              validate={(value) => {
                if (!value || value.trim() === '') {
                  return 'Command is required'
                }
                return null
              }}
            >
              <Label>Command</Label>
              <Input placeholder="Enter command" value={command} />
              <FieldError />
            </TextField>

            <TextField
              name="workingDirectory"
              isRequired
              onChange={setWorkingDirectory}
              validate={(value) => {
                if (!value || value.trim() === '') {
                  return 'Working directory is required'
                }
                return null
              }}
            >
              <Label>Working Directory</Label>
              <div className="flex gap-2">
                <Input placeholder="Select directory" value={workingDirectory} />
                <Button onPress={handleBrowse} variant="secondary" type="button">
                  Browse
                </Button>
              </div>
              <FieldError />
            </TextField>
          </div>
        </Card.Content>
        <Card.Footer>
          <div className="flex gap-2">
            <Button type="submit" isDisabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'OK'}
            </Button>
            <Button onPress={handleClose} variant="secondary" type="button">
              Cancel
            </Button>
          </div>
        </Card.Footer>
      </Form>
    </Card>
  )
}