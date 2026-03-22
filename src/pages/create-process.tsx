import { open } from '@tauri-apps/plugin-dialog'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useCreateProcess } from '../hooks/use-create-process'
import { useState } from 'react'

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

  const handleOk = () => {
    if (!name || !command || !workingDirectory) {
      alert('All fields are required')
      return
    }

    createMutation.mutate(
      { name, command, working_directory: workingDirectory },
      {
        onSuccess: () => {
          handleClose()
        },
        onError: (error) => {
          alert(`Failed to create process: ${error}`)
        },
      }
    )
  }

  const handleCancel = () => {
    handleClose()
  }

  return (
    <div>
      <h2>Create Process</h2>
      
      <div>
        <label>Name:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      
      <div>
        <label>Command:</label>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
        />
      </div>
      
      <div>
        <label>Working Directory:</label>
        <input
          type="text"
          value={workingDirectory}
          onChange={(e) => setWorkingDirectory(e.target.value)}
        />
        <button onClick={handleBrowse}>Browse</button>
      </div>
      
      <div>
        <button onClick={handleOk}>OK</button>
        <button onClick={handleCancel}>Cancel</button>
      </div>
    </div>
  )
}