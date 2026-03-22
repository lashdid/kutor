# Process Log Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkpoint (`- [ ]`) syntax for tracking.

**Goal:** Add a Log button to the process table that opens a window displaying real-time stdout/stderr output from that process, with logs persisting after process stops.

**Architecture:** Backend captures process output via Stdio::piped(), stores in ring buffer (10,000 lines), emits Tauri events for real-time updates. Frontend displays logs in a new window with route-based rendering.

**Tech Stack:** Rust (Tauri 2), React 19, TypeScript, TanStack React Query

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src-tauri/src/process_manager.rs` | Modify | Add ProcessLog struct, logs HashMap, modify spawn to capture output |
| `src-tauri/src/commands.rs` | Modify | Add `get_process_logs` command |
| `src-tauri/src/lib.rs` | Modify | Register new command |
| `src/types/process.ts` | Modify | Add `LogLine` type |
| `src/services/tauri-service.ts` | Modify | Add `getProcessLogs` function |
| `src/hooks/use-process-logs.ts` | Create | Hook for fetching logs and subscribing to events |
| `src/pages/process-log.tsx` | Create | Log viewer component |
| `src/main.tsx` | Modify | Add routing for log window |
| `src/components/process-row.tsx` | Modify | Add Log button |

---

## Task 1: Backend - Add Log Types and Storage

**Files:**
- Modify: `src-tauri/src/process_manager.rs`

- [ ] **Step 1: Add LogLine and ProcessLog structs**

Add after the imports, before `ProcessStatus`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogLine {
    pub content: String,
    pub stream: String, // "stdout" | "stderr"
}

pub struct ProcessLog {
    pub buffer: VecDeque<LogLine>,
}

impl ProcessLog {
    pub fn new() -> Self {
        Self {
            buffer: VecDeque::with_capacity(10000),
        }
    }

    pub fn push(&mut self, line: LogLine) {
        if self.buffer.len() >= 10000 {
            self.buffer.pop_front();
        }
        self.buffer.push_back(line);
    }
}
```

- [ ] **Step 2: Add logs field to ProcessManager**

Add to `ProcessManager` struct:

```rust
pub struct ProcessManager {
    processes: HashMap<String, Process>,
    child_processes: HashMap<String, Child>,
    config_path: PathBuf,
    system: System,
    logs: HashMap<String, ProcessLog>, // Add this line
}
```

Update `ProcessManager::new`:

```rust
pub fn new(config_path: PathBuf) -> Self {
    Self {
        processes: HashMap::new(),
        child_processes: HashMap::new(),
        config_path,
        system: System::new(),
        logs: HashMap::new(), // Add this line
    }
}
```

- [ ] **Step 3: Ensure VecDeque is imported**

Add to imports at top of file:

```rust
use std::collections::VecDeque;
```

- [ ] **Step 4: Run Rust tests to verify compilation**

Run: `cd src-tauri && cargo check`
Expected: Compiles without errors

- [ ] **Step 5: Commit backend scaffolding**

```bash
git add src-tauri/src/process_manager.rs
git commit -m "feat(backend): add ProcessLog struct and logs storage"
```

---

## Task 2: Backend - Capture Process Output

**Files:**
- Modify: `src-tauri/src/process_manager.rs`

- [ ] **Step 1: Modify start_process to capture stdout/stderr (Windows)**

Replace the `#[cfg(target_os = "windows")]` `start_process` function:

```rust
#[cfg(target_os = "windows")]
pub fn start_process(&mut self, id: &str) -> Result<(), KutorError> {
    let process = self
        .processes
        .get_mut(id)
        .ok_or_else(|| KutorError::ProcessNotFound(id.to_string()))?;

    match &process.status {
        ProcessStatus::Running { .. } => {
            return Err(KutorError::ProcessAlreadyRunning(id.to_string()));
        }
        _ => {}
    }

    let mut child = std::process::Command::new("cmd")
        .args(["/C", &process.command])
        .current_dir(&process.working_directory)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| KutorError::SpawnFailed(e.to_string()))?;

    let pid = child.id();
    let started_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;
    process.status = ProcessStatus::Running { pid, started_at };
    
    // Take stdout and stderr pipes before moving child
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    
    self.child_processes.insert(id.to_string(), child);
    self.logs.insert(id.to_string(), ProcessLog::new());
    self.save_to_disk()?;

    // Note: For full real-time streaming, we'd spawn threads here to read stdout/stderr
    // and emit Tauri events. For now, we capture but don't stream (that's Task 3).

    Ok(())
}
```

- [ ] **Step 2: Modify start_process for non-Windows**

Replace the `#[cfg(not(target_os = "windows"))` `start_process` function:

```rust
#[cfg(not(target_os = "windows"))]
pub fn start_process(&mut self, id: &str) -> Result<(), KutorError> {
    let process = self
        .processes
        .get_mut(id)
        .ok_or_else(|| KutorError::ProcessNotFound(id.to_string()))?;

    match &process.status {
        ProcessStatus::Running { .. } => {
            return Err(KutorError::ProcessAlreadyRunning(id.to_string()));
        }
        _ => {}
    }

    let mut child = std::process::Command::new("sh")
        .args(["-c", &process.command])
        .current_dir(&process.working_directory)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| KutorError::SpawnFailed(e.to_string()))?;

    let pid = child.id();
    let started_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;
    process.status = ProcessStatus::Running { pid, started_at };
    
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    
    self.child_processes.insert(id.to_string(), child);
    self.logs.insert(id.to_string(), ProcessLog::new());
    self.save_to_disk()?;

    Ok(())
}
```

- [ ] **Step 3: Run cargo check**

Run: `cd src-tauri && cargo check`
Expected: Compiles without errors

- [ ] **Step 4: Commit output capture changes**

```bash
git add src-tauri/src/process_manager.rs
git commit -m "feat(backend): capture stdout/stderr from spawned processes"
```

---

## Task 3: Backend - Add Output Capture Thread with Event Emission

**Files:**
- Modify: `src-tauri/src/process_manager.rs`

- [ ] **Step 1: Add app_handle to ProcessManager for event emission**

Add to imports at top:

```rust
use tauri::{AppHandle, Emitter};
```

Modify `ProcessManager` struct:

```rust
pub struct ProcessManager {
    processes: HashMap<String, Process>,
    child_processes: HashMap<String, Child>,
    config_path: PathBuf,
    system: System,
    logs: HashMap<String, ProcessLog>,
    app_handle: Option<AppHandle>, // Add this
}
```

Update `ProcessManager::new`:

```rust
pub fn new(config_path: PathBuf) -> Self {
    Self {
        processes: HashMap::new(),
        child_processes: HashMap::new(),
        config_path,
        system: System::new(),
        logs: HashMap::new(),
        app_handle: None, // Add this
    }
}

// Add new method:
pub fn set_app_handle(&mut self, handle: AppHandle) {
    self.app_handle = Some(handle);
}
```

- [ ] **Step 2: Add spawn_output_reader helper function**

Add before `ProcessManager` impl block:

```rust
use std::io::{BufRead, BufReader};

fn spawn_output_reader(
    process_id: String,
    stream: String,
    reader: Box<dyn std::io::Read + Send>,
    logs: Arc<Mutex<HashMap<String, ProcessLog>>>,
    app_handle: AppHandle,
) -> std::thread::JoinHandle<()> {
    std::thread::spawn(move || {
        let reader = BufReader::new(reader);
        for line in reader.lines() {
            match line {
                Ok(content) => {
                    let log_line = LogLine {
                        content: content.clone(),
                        stream: stream.clone(),
                    };
                    
                    if let Ok(mut logs_guard) = logs.lock() {
                        if let Some(process_log) = logs_guard.get_mut(&process_id) {
                            process_log.push(log_line);
                        }
                    }
                    
                    let _ = app_handle.emit("process-output", serde_json::json!({
                        "process_id": process_id,
                        "line": content,
                        "stream": stream,
                    }));
                }
                Err(_) => break,
            }
        }
    })
}
```

- [ ] **Step 3: Import Arc and Mutex**

Add to imports:

```rust
use std::sync::{Arc, Mutex};
```

- [ ] **Step 4: Modify start_process to spawn reader threads (Windows)**

Replace Windows `start_process` with full implementation that spawns threads:

```rust
#[cfg(target_os = "windows")]
pub fn start_process(&mut self, id: &str) -> Result<(), KutorError> {
    let process = self
        .processes
        .get_mut(id)
        .ok_or_else(|| KutorError::ProcessNotFound(id.to_string()))?;

    match &process.status {
        ProcessStatus::Running { .. } => {
            return Err(KutorError::ProcessAlreadyRunning(id.to_string()));
        }
        _ => {}
    }

    let mut child = std::process::Command::new("cmd")
        .args(["/C", &process.command])
        .current_dir(&process.working_directory)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| KutorError::SpawnFailed(e.to_string()))?;

    let pid = child.id();
    let started_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;
    process.status = ProcessStatus::Running { pid, started_at };
    
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    
    self.child_processes.insert(id.to_string(), child);
    self.logs.insert(id.to_string(), ProcessLog::new());
    self.save_to_disk()?;

    if let (Some(app_handle), Some(stdout), Some(stderr)) = 
        (&self.app_handle, stdout, stderr) 
    {
        let logs = Arc::new(Mutex::new(HashMap::new()));
        self.logs.clone_into(&mut logs.lock().unwrap());
        
        spawn_output_reader(
            id.to_string(),
            "stdout".to_string(),
            Box::new(stdout),
            logs.clone(),
            app_handle.clone(),
        );
        
        spawn_output_reader(
            id.to_string(),
            "stderr".to_string(),
            Box::new(stderr),
            logs.clone(),
            app_handle.clone(),
        );
    }

    Ok(())
}
```

- [ ] **Step 5: Run cargo check**

Run: `cd src-tauri && cargo check`
Expected: May have lifetime issues - we'll fix in next step

- [ ] **Step 6: Fix compilation - use self.logs with Arc properly**

Actually, we need a different approach. The logs HashMap belongs to ProcessManager which is behind Arc<Mutex<>> in Tauri state. Let's pass a reference correctly:

```rust
#[cfg(target_os = "windows")]
pub fn start_process(&mut self, id: &str) -> Result<(), KutorError> {
    // ... existing code to spawn child ...
    
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    
    self.child_processes.insert(id.to_string(), child);
    self.logs.insert(id.to_string(), ProcessLog::new());
    self.save_to_disk()?;

    if let Some(app_handle) = &self.app_handle {
        if let (Some(stdout), Some(stderr)) = (stdout, stderr) {
            let process_id = id.to_string();
            let app_handle = app_handle.clone();
            
            // We'll read from pipes in background thread
            // The thread owns the pipe readers
            std::thread::spawn(move || {
                use std::io::{BufRead, BufReader};
                
                let stdout_reader = BufReader::new(stdout);
                for line in stdout_reader.lines().flatten() {
                    let _ = app_handle.emit("process-output", serde_json::json!({
                        "process_id": process_id,
                        "line": line,
                        "stream": "stdout",
                    }));
                }
            });
            
            let process_id = id.to_string();
            let app_handle = app_handle.clone();
            
            std::thread::spawn(move || {
                use std::io::{BufRead, BufReader};
                
                let stderr_reader = BufReader::new(stderr);
                for line in stderr_reader.lines().flatten() {
                    let _ = app_handle.emit("process-output", serde_json::json!({
                        "process_id": process_id,
                        "line": line,
                        "stream": "stderr",
                    }));
                }
            });
        }
    }

    Ok(())
}
```

- [ ] **Step 7: Run cargo check**

Run: `cd src-tauri && cargo check`
Expected: Compiles without errors

- [ ] **Step 8: Commit output capture threads**

```bash
git add src-tauri/src/process_manager.rs
git commit -m "feat(backend): spawn threads to capture process output and emit events"
```

---

## Task 4: Backend - Add get_process_logs Command

**Files:**
- Modify: `src-tauri/src/process_manager.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add get_process_logs method to ProcessManager**

Add to `ProcessManager` impl:

```rust
pub fn get_process_logs(&self, id: &str) -> Result<Vec<LogLine>, KutorError> {
    self.logs
        .get(id)
        .map(|pl| pl.buffer.iter().cloned().collect())
        .ok_or_else(|| KutorError::ProcessNotFound(id.to_string()))
}
```

- [ ] **Step 2: Make LogLine public and add Serialize**

Ensure `LogLine` has `Serialize` derive (already added in Task 1).

- [ ] **Step 3: Add command to commands.rs**

Add to `src-tauri/src/commands.rs`:

```rust
use crate::process_manager::LogLine;

#[tauri::command]
pub fn get_process_logs(
    id: String,
    state: State<'_, Arc<Mutex<crate::process_manager::ProcessManager>>>,
) -> Result<Vec<LogLine>, KutorError> {
    let manager = state
        .lock()
        .map_err(|_| KutorError::IoError("Failed to lock manager".to_string()))?;
    manager.get_process_logs(&id)
}
```

- [ ] **Step 4: Register command in lib.rs**

Add `commands::get_process_logs` to the invoke_handler:

```rust
.invoke_handler(tauri::generate_handler![
    commands::create_process,
    commands::start_process,
    commands::stop_process,
    commands::restart_process,
    commands::delete_process,
    commands::get_all_processes,
    commands::get_process_logs, // Add this
])
```

- [ ] **Step 5: Run cargo check**

Run: `cd src-tauri && cargo check`
Expected: Compiles without errors

- [ ] **Step 6: Commit get_process_logs command**

```bash
git add src-tauri/src/process_manager.rs src-tauri/src/commands.rs src-tauri/src/lib.rs
git commit -m "feat(backend): add get_process_logs command"
```

---

## Task 5: Backend - Store Logs in ProcessManager and Wire App Handle

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Store app handle in ProcessManager**

Update `lib.rs` setup to call `set_app_handle`:

```rust
.setup(|app| {
    let app_handle = app.handle();
    let config_path = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory")
        .join("processes.json");

    let mut manager = ProcessManager::new(config_path);
    if let Err(e) = manager.load_from_disk() {
        eprintln!("Warning: Failed to load processes from disk: {}", e);
    }
    if let Err(e) = manager.reconcile_processes() {
        eprintln!("Warning: Failed to reconcile processes: {}", e);
    }
    manager.set_app_handle(app_handle.clone()); // Add this

    app.manage(Arc::new(Mutex::new(manager)));
    Ok(())
})
```

- [ ] **Step 2: Run cargo check**

Run: `cd src-tauri && cargo check`
Expected: Compiles without errors

- [ ] **Step 3: Commit app handle wiring**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(backend): wire app handle to ProcessManager for event emission"
```

---

## Task 6: Frontend - Add LogLine Type

**Files:**
- Modify: `src/types/process.ts`

- [ ] **Step 1: Add LogLine interface**

Add to `src/types/process.ts`:

```typescript
export interface LogLine {
  content: string
  stream: 'stdout' | 'stderr'
}
```

- [ ] **Step 2: Commit type addition**

```bash
git add src/types/process.ts
git commit -m "feat(frontend): add LogLine type"
```

---

## Task 7: Frontend - Add getProcessLogs Service

**Files:**
- Modify: `src/services/tauri-service.ts`

- [ ] **Step 1: Add getProcessLogs function**

Add to `src/services/tauri-service.ts`:

```typescript
export async function getProcessLogs(id: string): Promise<LogLine[]> {
  return invoke<LogLine[]>('get_process_logs', { id })
}
```

- [ ] **Step 2: Import LogLine type**

Add import at top:

```typescript
import type { Process, CreateProcessParams, LogLine } from '../types/process'
```

- [ ] **Step 3: Commit service addition**

```bash
git add src/services/tauri-service.ts
git commit -m "feat(frontend): add getProcessLogs service function"
```

---

## Task 8: Frontend - Create useProcessLogs Hook

**Files:**
- Create: `src/hooks/use-process-logs.ts`

- [ ] **Step 1: Create the hook file**

Create `src/hooks/use-process-logs.ts`:

```typescript
import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { getProcessLogs } from '../services/tauri-service'
import type { LogLine } from '../types/process'

interface ProcessOutputEvent {
  process_id: string
  line: string
  stream: 'stdout' | 'stderr'
}

export function useProcessLogs(processId: string) {
  const [logs, setLogs] = useState<LogLine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchInitialLogs() {
      try {
        const initialLogs = await getProcessLogs(processId)
        if (mounted) {
          setLogs(initialLogs)
          setIsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch logs')
          setIsLoading(false)
        }
      }
    }

    fetchInitialLogs()

    const unlisten = listen<ProcessOutputEvent>('process-output', (event) => {
      if (event.payload.process_id === processId) {
        setLogs((prev) => [
          ...prev,
          { content: event.payload.line, stream: event.payload.stream },
        ])
      }
    })

    return () => {
      mounted = false
      unlisten.then((fn) => fn())
    }
  }, [processId])

  return { logs, isLoading, error }
}
```

- [ ] **Step 2: Commit hook creation**

```bash
git add src/hooks/use-process-logs.ts
git commit -m "feat(frontend): create useProcessLogs hook"
```

---

## Task 9: Frontend - Create ProcessLog Page

**Files:**
- Create: `src/pages/process-log.tsx`

- [ ] **Step 1: Create the process-log page**

Create `src/pages/process-log.tsx`:

```typescript
import { useEffect, useRef } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useProcessLogs } from '../hooks/use-process-logs'
import './process-log.css'

export default function ProcessLog() {
  const window = getCurrentWindow()
  const label = window.label
  const processId = label.replace('log-', '')
  const { logs, isLoading, error } = useProcessLogs(processId)
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.setTitle(`Process Log - ${processId}`)
  }, [window, processId])

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  if (isLoading) {
    return <div className="process-log-container">Loading...</div>
  }

  if (error) {
    return <div className="process-log-container">Error: {error}</div>
  }

  return (
    <div className="process-log-container" ref={logContainerRef}>
      {logs.length === 0 ? (
        <div className="process-log-empty">No logs yet. Start the process to see output.</div>
      ) : (
        logs.map((log, index) => (
          <div
            key={index}
            className={`process-log-line ${log.stream === 'stderr' ? 'stderr' : 'stdout'}`}
          >
            {log.content}
          </div>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create the CSS file**

Create `src/pages/process-log.css`:

```css
.process-log-container {
  background-color: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  padding: 8px;
  height: 100vh;
  overflow-y: auto;
  box-sizing: border-box;
}

.process-log-line {
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}

.process-log-line.stdout {
  color: #d4d4d4;
}

.process-log-line.stderr {
  color: #f14c4c;
}

.process-log-empty {
  color: #808080;
  font-style: italic;
}
```

- [ ] **Step 3: Commit page creation**

```bash
git add src/pages/process-log.tsx src/pages/process-log.css
git commit -m "feat(frontend): create ProcessLog page component"
```

---

## Task 10: Frontend - Add Log Window Routing

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Update main.tsx routing**

Replace `src/main.tsx` content:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getCurrentWindow } from '@tauri-apps/api/window'
import App from './App'
import CreateProcess from './pages/create-process'
import ProcessLog from './pages/process-log'
import './style.css'

const queryClient = new QueryClient()

async function main() {
  const window = getCurrentWindow()
  const label = window.label
  
  const root = ReactDOM.createRoot(document.getElementById('root')!)
  
  let content: React.ReactNode
  if (label === 'main') {
    content = <App />
  } else if (label === 'create-process') {
    content = <CreateProcess />
  } else if (label.startsWith('log-')) {
    content = <ProcessLog />
  } else {
    content = <App />
  }
  
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        {content}
      </QueryClientProvider>
    </React.StrictMode>
  )
}

main()
```

- [ ] **Step 2: Commit routing update**

```bash
git add src/main.tsx
git commit -m "feat(frontend): add routing for log window"
```

---

## Task 11: Frontend - Add Log Button to ProcessRow

**Files:**
- Modify: `src/components/process-row.tsx`

- [ ] **Step 1: Import WebviewWindow**

Add import:

```typescript
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
```

- [ ] **Step 2: Add Log button and handler**

Update `ProcessRow` component:

```typescript
import type { Process } from '../types/process'
import { formatMemory, formatUptime } from '../utils/format'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'

interface ProcessRowProps {
  process: Process
  onStart: (id: string) => void
  onStop: (id: string) => void
  onRestart: (id: string) => void
  onDelete: (id: string) => void
}

export function ProcessRow({ process, onStart, onStop, onRestart, onDelete }: ProcessRowProps) {
  const isRunning = process.status === 'running'
  const isStopped = process.status === 'stopped'
  const isCrashed = process.status === 'crashed'

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
    <tr>
      <td>{process.name}</td>
      <td>{process.pid ?? '-'}</td>
      <td style={{ color: isRunning ? 'green' : isCrashed ? 'red' : 'gray' }}>
        {process.status}
        {process.error_message && <span title={process.error_message}> (error)</span>}
      </td>
      <td>{process.working_directory}</td>
      <td>{formatMemory(process.memory_bytes)}</td>
      <td>{formatUptime(process.uptime_secs)}</td>
      <td>
        <button onClick={() => onStart(process.id)} disabled={!isStopped && !isCrashed}>
          Start
        </button>
        <button onClick={() => onStop(process.id)} disabled={!isRunning}>
          Stop
        </button>
        <button onClick={() => onRestart(process.id)} disabled={!isRunning}>
          Restart
        </button>
        <button onClick={() => onDelete(process.id)}>
          Delete
        </button>
        <button onClick={handleViewLog}>
          Log
        </button>
      </td>
    </tr>
  )
}
```

- [ ] **Step 3: Commit Log button addition**

```bash
git add src/components/process-row.tsx
git commit -m "feat(frontend): add Log button to ProcessRow"
```

---

## Task 12: Integration Testing

- [ ] **Step 1: Build and run the application**

Run: `npm run tauri dev`
Expected: Application starts without errors

- [ ] **Step 2: Test Log button functionality**

1. Create a new process (e.g., `echo "test"` or a long-running command like `ping localhost`)
2. Click Start to run the process
3. Click Log button
4. Verify log window opens
5. Verify output appears in real-time
6. Stop the process
7. Verify logs still visible (not cleared)

- [ ] **Step 3: Test multiple log windows**

1. Create two different processes
2. Start both
3. Open log windows for both simultaneously
4. Verify both windows show correct output

- [ ] **Step 4: Run TypeScript check**

Run: `npm run typecheck` (or equivalent)
Expected: No type errors

- [ ] **Step 5: Run lint**

Run: `npm run lint` (or equivalent)
Expected: No lint errors

---

## Task 13: Final Commit

- [ ] **Step 1: Verify all changes**

Run: `git status`
Expected: All changes committed

- [ ] **Step 2: Final verification build**

Run: `npm run tauri build` (optional - may take time)
Expected: Build succeeds