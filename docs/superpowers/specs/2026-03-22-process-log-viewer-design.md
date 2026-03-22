# Process Log Viewer Design

## Overview

Add a "Log" button to the process table that appears only when a process is running. When clicked, it opens a new window displaying real-time stdout/stderr output from that process.

## Requirements

### Functional
- Log button visible only for running processes
- Clicking Log opens a dedicated window for that process's output
- Logs display stdout and stderr in real-time
- Bounded buffer (10,000 lines) per process
- Logs discarded when process stops

### Non-Functional
- Minimal memory footprint via ring buffer
- Real-time updates via Tauri events
- Responsive UI with auto-scroll

## Architecture

### Backend (Rust)

**ProcessLog struct:**
```rust
struct LogLine {
    content: String,
    stream: LogStream,  // "stdout" | "stderr"
}

struct ProcessLog {
    buffer: VecDeque<LogLine>,  // Ring buffer, max 10,000 lines
}

// In ProcessManager
logs: HashMap<Uuid, ProcessLog>,
```

**Process spawn modification:**
```rust
let child = std::process::Command::new(&process.command)
    .args(&process.args)
    .current_dir(&process.working_directory)
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()?;
```

**Output capture thread:**
- Spawn thread per process to read stdout/stderr
- Append to ring buffer (evict oldest when full)
- Emit Tauri event `process-output` with `{ process_id, line, stream }`
- On process stop: clear buffer, stop capture thread

**New commands:**
```rust
#[tauri::command]
fn get_process_logs(process_id: Uuid, state: State) -> Result<Vec<LogLine>, String>

#[tauri::command]
fn stream_process_logs(process_id: Uuid, window: Window)  // Subscribe window to events
```

### Frontend (TypeScript/React)

**ProcessRow.tsx:**
- Add conditional Log button: `status === 'Running'`
- On click: create WebviewWindow with label `log-{process_id}`

**ProcessLog.tsx (new):**
- Extract process ID from window label
- Fetch initial logs via `get_process_logs`
- Subscribe to `process-output` event, filter by process ID
- Render in scrollable container with auto-scroll
- Style: monospace, dark background, stderr in red

**Routing (main.tsx):**
```typescript
const label = getCurrentWindow().label;
if (label === 'main') return <Home />;
if (label.startsWith('log-')) return <ProcessLog />;
if (label === 'create-process') return <CreateProcess />;
```

## Data Flow

```
Process spawned
     │
     ▼
Rust captures stdout/stderr via Stdio::piped()
     │
     ▼
Append to ring buffer (max 10,000 lines)
     │
     ├──► Emit Tauri event 'process-output'
     │         with { process_id, line, stream }
     │         │
     │         ▼
     │    Frontend log window (if open for this process)
     │         │
     │         ▼
     │    Append line to UI display
     │
     ▼
Process stopped
     │
     ▼
Clear log buffer
     │
     ▼
Log window shows empty state
```

## Window Management

**Log window creation:**
```typescript
new WebviewWindow(`log-${process.id}`, {
  url: '/',
  title: `Log - ${process.name}`,
  width: 800,
  height: 500,
  parent: mainWindow.label,
});
```

**Multiple windows:** Each process gets unique label, allowing simultaneous log windows.

**Parent window:** Not disabled (unlike Create Process modal) - user can interact with main window while viewing logs.

## Implementation Order

1. Backend: Add ProcessLog struct and HashMap to ProcessManager
2. Backend: Modify spawn to capture stdout/stderr
3. Backend: Add output capture thread with event emission
4. Backend: Implement `get_process_logs` command
5. Frontend: Create ProcessLog.tsx component
6. Frontend: Update routing in main.tsx
7. Frontend: Add Log button to ProcessRow.tsx
8. Backend: Clear logs on process stop

## Future Enhancements

- Persist logs to file for history across app restarts
- "Clear logs" button in log window
- Search/filter within logs
- ANSI color code support