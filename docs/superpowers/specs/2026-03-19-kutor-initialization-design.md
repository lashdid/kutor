# Kutor Initialization Design

## Overview

**Kutor** is a lightweight PM2 alternative built with Tauri (Rust backend) and React + TypeScript (frontend). This design covers the MVP implementation for process management.

## Requirements Summary

- **Persistence**: Save processes to disk, restore on app reopen
- **Startup**: All processes start in stopped state after app restart
- **Error handling**: Display error status, no auto-restart (MVP)
- **Create window**: OK/Cancel buttons, OK creates+closes
- **Process ID**: User name + internal UUID
- **Logs**: No log capture in MVP

## Architecture

### High-Level Structure

```
src-tauri/
  src/
    main.rs           # App setup, window management
    lib.rs            # Module exports
    process_manager.rs # Core logic: Process, ProcessManager
    commands.rs       # Tauri commands (IPC handlers)
    error.rs          # Error types

src/
  components/
    process-table.tsx
    process-row.tsx
  pages/
    home.tsx
    create-process.tsx
  services/
    tauri-service.ts  # Tauri command invocations
  hooks/
    use-processes.ts   # React Query hooks
    use-create-process.ts
    use-start-process.ts
    use-stop-process.ts
    use-restart-process.ts
    use-delete-process.ts
```

### Window Layout

```
┌─────────────────────────────────────────────────────────┐
│                    Main Window                           │
│  ┌─────────────────────────────────────────────────────┐│
│  │                   Process Table                      ││
│  │  ┌───────────────────────────────────────────────┐ ││
│  │  │ Process Row • Status • Directory • Actions    │ ││
│  │  └───────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────┘│
│                    [Create Process]                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 Create Process Window                    │
│  Name: [________]                                       │
│  Command: [________]                                     │
│  Working Directory: [________] [Browse...]              │
│                    [OK]  [Cancel]                         │
└─────────────────────────────────────────────────────────┘
```

## Backend (Rust)

### Core Types (`process_manager.rs`)

```rust
pub enum ProcessStatus {
    Stopped,
    Running { pid: u32 },
    Crashed { error: String },
}

pub struct Process {
    pub id: String,           // UUID
    pub name: String,         // User-provided
    pub command: String,
    pub working_directory: String,
    pub status: ProcessStatus,
}

pub struct ProcessManager {
    processes: HashMap<String, Process>,
    child_processes: HashMap<String, Child>,  // Running processes
    config_path: PathBuf,  // Path to processes.json
}
```

### Key Operations

- `create_process(name, command, working_dir)` → Returns new process ID
- `start_process(id)` → Spawns process, updates status to Running
- `stop_process(id)` → Kills process, updates status to Stopped
- `restart_process(id)` → Stop then start
- `delete_process(id)` → Remove from manager and disk
- `get_all_processes()` → Returns list for frontend
- `save_to_disk()` → Persist to JSON
- `load_from_disk()` → Restore on startup

### Error Handling (`error.rs`)

- `ProcessNotFound` - Invalid ID
- `ProcessAlreadyRunning` - Start called on running process
- `ProcessNotRunning` - Stop called on stopped process
- `SpawnFailed` - Command execution failed
- `IoError` - File operations failed

### Threading

- `ProcessManager` wrapped in `Arc<Mutex<>>` for thread-safe access
- Spawned processes run independently
- Status updates happen synchronously when queried

## Frontend (React)

### Libraries

- **@tanstack/react-table** - Table component with sorting, filtering
- **@tanstack/react-query** - Data fetching, caching, auto-polling
- **Zustand** - Global UI state if needed

### Components

**`process-table.tsx`** - Main table view
- Props: `processes: Process[]`
- Renders table with headers: Name, Status, Directory, Actions
- Uses @tanstack/react-table for table management

**`process-row.tsx`** - Single process row
- Props: `process`, `onStart`, `onStop`, `onRestart`, `onDelete`
- Displays process info and action buttons
- Status with color indicator (running=green, stopped=gray, crashed=red)
- Action buttons conditionally enabled/disabled based on status

### Pages

**`home.tsx`** - Main window
- Uses `useProcesses()` hook for polling process list
- State: `processes` (from React Query), `loading`
- "Create Process" button opens new Tauri window

**`create-process.tsx`** - Create process window
- Form with: Name, Command, Working Directory (folder picker)
- OK button: validates, calls mutation, closes window
- Cancel button: closes window without action

### Service Layer (`tauri-service.ts`)

Wraps Tauri command invocations:

```typescript
export async function createProcess(params: CreateProcessParams): Promise<string>
export async function startProcess(id: string): Promise<void>
export async function stopProcess(id: string): Promise<void>
export async function restartProcess(id: string): Promise<void>
export async function deleteProcess(id: string): Promise<void>
export async function getAllProcesses(): Promise<ProcessView[]>
```

### React Query Hooks

```typescript
// use-processes.ts
export function useProcesses() {
  return useQuery({
    queryKey: ['processes'],
    queryFn: getAllProcesses,
    refetchInterval: 1000, // Poll every second for status updates
  })
}

// use-create-process.ts
export function useCreateProcess() {
  return useMutation({
    mutationFn: createProcess,
    onSuccess: () => queryClient.invalidateQueries(['processes']),
  })
}
// Similar pattern for start/stop/restart/delete
```

## Tauri Commands

| Command | Parameters | Returns |
|---------|------------|---------|
| `create_process` | `name, command, working_directory` | `String` (process ID) |
| `start_process` | `id` | `()` |
| `stop_process` | `id` | `()` |
| `restart_process` | `id` | `()` |
| `delete_process` | `id` | `()` |
| `get_all_processes` | (none) | `Vec<ProcessView>` |
| `get_process` | `id` | `ProcessView` |

### ProcessView

Simplified struct for frontend (no internal Rust types):

```rust
pub struct ProcessView {
    pub id: String,
    pub name: String,
    pub command: String,
    pub working_directory: String,
    pub status: String, // "running", "stopped", "crashed"
    pub error_message: Option<String>,
}
```

### State Management

- `ProcessManager` stored in Tauri's `State` with `Arc<Mutex<ProcessManager>>`
- Commands access via `State<'_, Arc<Mutex<ProcessManager>>>`
- App state initialized in `main.rs` and managed by Tauri

## Error Handling

### Backend

- All commands return `Result<T, KutorError>`
- Errors serialized to JSON for frontend
- `KutorError` variants: `ProcessNotFound`, `ProcessAlreadyRunning`, `SpawnFailed`, `IoError`

### Frontend

- React Query mutations handle errors via `onError` callback
- Toast/notification for error display
- Form validation errors shown inline

### Error Display

- Process row shows "Crashed" status with error message tooltip
- Action buttons disabled when operation would fail
- Network/command failure shows toast notification

### Form Validation

- Name: Required, unique check
- Command: Required
- Working Directory: Required, folder picker dialog (Tauri's `dialog` API)

## Testing Strategy

### Backend Tests (Rust)

- `ProcessManager::create_process` - Verify process added to map
- `ProcessManager::start_process` - Verify spawn, status update
- `ProcessManager::stop_process` - Verify kill, status update
- `ProcessManager::restart_process` - Verify stop→start sequence
- `ProcessManager::persistence` - Verify save/load round-trip

**Test Setup:**
- Use `tempfile` crate for isolated test directories
- Mock `Command` where possible, use simple test commands (e.g., `echo "test"`)
- Unit tests for `ProcessStatus` transitions

### Frontend Tests (Vitest + Testing Library)

- `ProcessRow` - Renders status correctly, buttons enabled/disabled
- `ProcessTable` - Renders process list
- `tauri-service` hooks - Mock Tauri invoke, verify called with correct args

## File Naming Conventions

### Frontend (React)

Use **kebab-case** for:
- Component files: `process-table.tsx`
- Folder names: `components/`, `pages/`
- Utility files: `tauri-service.ts`
- Hook files: `use-processes.ts`

Component names inside code can use PascalCase.

## Future Improvements (Post-MVP)

- Logs viewer
- Auto-restart on crash (per-process setting)
- Environment variables
- Better UI polish