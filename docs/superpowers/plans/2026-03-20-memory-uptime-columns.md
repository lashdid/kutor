# Memory and Uptime Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add memory usage anduptime columns to the process table, displaying real-time metrics for running processes.

**Architecture:** Store `started_at` timestamp in `ProcessStatus::Running` variant. On each `get_all_processes` call, use `sysinfo` crate to query memory by PID and calculate uptime. Frontend formats and displays values.

**Tech Stack:** Rust (sysinfo crate), TypeScript, React

---

## File Structure

| File |Action | Purpose |
|------|--------|---------|
| `src-tauri/Cargo.toml` | Modify | Add sysinfo dependency |
| `src-tauri/src/process_manager.rs` | Modify | Update ProcessStatus, ProcessView, add metrics logic |
| `src-tauri/src/commands.rs` | Modify | Update method signatures to `&mut self` |
| `src/types/process.ts` | Modify | Add memory_bytes, uptime_secs fields |
| `src/utils/format.ts` | Create | Formatting utilities for memory and uptime |
| `src/components/process-table.tsx` | Modify | Add Memory and Uptime columns |
| `src/components/process-row.tsx` | Modify | Display formatted values |

---

### Task 1: Add sysinfo Dependency

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Add sysinfo dependency**

```toml
sysinfo = "0.33"
```

Add after line 17 (after `thiserror` line).

- [ ] **Step 2: Verify dependency resolves**

Run: `cd src-tauri && cargo check`
Expected: Compiles successfully, sysinfo downloaded

- [ ] **Step 3: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "chore: add sysinfo dependency for process metrics"
```

---

### Task 2: Update Backend Data Model

**Files:**
- Modify: `src-tauri/src/process_manager.rs`

- [ ] **Step 1: Add sysinfo import and System field to ProcessManager**

At the top of the file, add after line 3:
```rust
use sysinfo::System;
```

In `ProcessManager` struct (after line 58), add `System` field:
```rust
pub struct ProcessManager {
    processes: HashMap<String, Process>,
    child_processes: HashMap<String, Child>,
    config_path: PathBuf,
    system: System,
}
```

- [ ] **Step 2: Update ProcessManager::new to initialize System**

In the `new` function (line 62), update to:
```rust
pub fn new(config_path: PathBuf) -> Self {
    Self {
        processes: HashMap::new(),
        child_processes: HashMap::new(),
        config_path,
        system: System::new(),
    }
}
```

- [ ] **Step 3: Update ProcessStatus to include started_at**

Replace ProcessStatus enum (lines 10-14):
```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProcessStatus {
    Stopped,
    Running { pid: u32, started_at: u64 },
    Crashed { error: String },
}
```

- [ ] **Step 4: Update ProcessView to include metrics**

Replace ProcessView struct (lines 16-23):
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessView {
    pub id: String,
    pub name: String,
    pub command: String,
    pub working_directory: String,
    pub status: String,
    pub error_message: Option<String>,
    pub memory_bytes: Option<u64>,
    pub uptime_secs: Option<u64>,
}
```

- [ ] **Step 5: Update From implementation for ProcessView**

Replace the From implementation (lines 35-52):
```rust
impl From<&Process> for ProcessView {
    fn from(process: &Process) -> Self {
        let (status, error_message) = match &process.status {
            ProcessStatus::Stopped => ("stopped".to_string(), None),
            ProcessStatus::Crashed { error } => ("crashed".to_string(), Some(error.clone())),
            ProcessStatus::Running { pid: _, started_at: _ } => ("running".to_string(), None),
        };

        ProcessView {
            id: process.id.clone(),
            name: process.name.clone(),
            command: process.command.clone(),
            working_directory: process.working_directory.clone(),
            status,
            error_message,
            memory_bytes: None,
            uptime_secs: None,
        }
    }
}
```

Note: This initial implementation sets `memory_bytes` and `uptime_secs` to `None`. Task 4 will add the logic to query these values for running processes.

- [ ] **Step 6: Verify backend compiles**

Run: `cd src-tauri && cargo check`
Expected: Compilation errors (expected - we'll fix in next tasks)

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/process_manager.rs
git commit -m "feat(backend): add started_at, memory_bytes, uptime_secs to data model"
```

---

### Task 3: Update start_process to Record start_time

**Files:**
- Modify: `src-tauri/src/process_manager.rs`

- [ ] **Step 1: Add std::time import**

Add at top of file after line 5:
```rust
use std::time::{SystemTime, UNIX_EPOCH};
```

- [ ] **Step 2: Update Windows start_process to record started_at**

In the `#[cfg(target_os = "windows")]` `start_process` function (around line 117), update the status assignment after `let pid = child.id();`:
```rust
let started_at = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap()
    .as_millis() as u64;
process.status = ProcessStatus::Running { pid, started_at };
```

- [ ] **Step 3: Update non-Windows start_process to record started_at**

In the `#[cfg(not(target_os = "windows"))]` `start_process` function (around line 145), update the status assignment after `let pid = child.id();`:
```rust
let started_at = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap()
    .as_millis() as u64;
process.status = ProcessStatus::Running { pid, started_at };
```

- [ ] **Step 4: Verify backend compiles**

Run: `cd src-tauri && cargo check`
Expected: Compiles successfully

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/process_manager.rs
git commit -m "feat(backend): record start time when process starts"
```

---

### Task 4: Implement Metrics Query in get_all_processes

**Files:**
- Modify: `src-tauri/src/process_manager.rs`

- [ ] **Step 1: Update get_all_processes signature to&mut self**

Change line 90:
```rust
pub fn get_all_processes(&mut self) -> Vec<ProcessView> {
```

- [ ] **Step 2: Implement metrics collection for running processes**

Replace the body of `get_all_processes`:
```rust
pub fn get_all_processes(&mut self) -> Vec<ProcessView> {
    let now_millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;

    self.processes.values().map(|process| {
        let (status, error_message, memory_bytes, uptime_secs) = match &process.status {
            ProcessStatus::Stopped => ("stopped".to_string(), None, None, None),
            ProcessStatus::Crashed { error } => ("crashed".to_string(), Some(error.clone()), None, None),
            ProcessStatus::Running { pid, started_at } => {
                use sysinfo::{Pid, ProcessesToUpdate, ProcessRefreshKind};
                
                let pid = Pid::from_u32(*pid);
                self.system.refresh_processes_specifics(
                    ProcessesToUpdate::Some(&[pid]),
                    true,
                    ProcessRefreshKind::new().with_memory(),
                );
                
                let memory_bytes = self.system.process(pid).map(|p| p.memory());
                let uptime_secs = Some((now_millis.saturating_sub(*started_at)) / 1000);
                
                ("running".to_string(), None, memory_bytes, uptime_secs)
            }
        };

        ProcessView {
            id: process.id.clone(),
            name: process.name.clone(),
            command: process.command.clone(),
            working_directory: process.working_directory.clone(),
            status,
            error_message,
            memory_bytes,
            uptime_secs,
        }
    }).collect()
}
```

- [ ] **Step 3: Update get_process signature to &mut self**

Change line 222:
```rust
pub fn get_process(&mut self, id: &str) -> Result<ProcessView, KutorError> {
```

- [ ] **Step 4: Implement metrics in get_process**

Update get_process body to use the same logic. Replace the entire method:
```rust
pub fn get_process(&mut self, id: &str) -> Result<ProcessView, KutorError> {
    let process = self.processes.get(id)
        .ok_or_else(|| KutorError::ProcessNotFound(id.to_string()))?;let now_millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;

    let (status, error_message, memory_bytes, uptime_secs) = match &process.status {
        ProcessStatus::Stopped => ("stopped".to_string(), None, None, None),
        ProcessStatus::Crashed { error } => ("crashed".to_string(), Some(error.clone()), None, None),
        ProcessStatus::Running { pid, started_at } => {
            use sysinfo::{Pid, ProcessesToUpdate, ProcessRefreshKind};
            
            let pid = Pid::from_u32(*pid);
            self.system.refresh_processes_specifics(
                ProcessesToUpdate::Some(&[pid]),
                true,
                ProcessRefreshKind::new().with_memory(),
            );
            
            let memory_bytes = self.system.process(pid).map(|p| p.memory());
            let uptime_secs = Some((now_millis.saturating_sub(*started_at)) / 1000);
            
            ("running".to_string(), None, memory_bytes, uptime_secs)
        }
    };

    Ok(ProcessView {
        id: process.id.clone(),
        name: process.name.clone(),
        command: process.command.clone(),
        working_directory: process.working_directory.clone(),
        status,
        error_message,
        memory_bytes,
        uptime_secs,
    })
}
```

- [ ] **Step 5: Verify backend compiles**

Run: `cd src-tauri && cargo check`
Expected: Compiles successfully

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/process_manager.rs
git commit -m "feat(backend): query memory and uptime for running processes"
```

---

### Task 5: Update Command Signatures

**Files:**
- Modify: `src-tauri/src/commands.rs`

- [ ] **Step 1: No changes needed in commands.rs**

The commands already use `Arc<Mutex<ProcessManager>>`, so calling `.lock()` gives mutable access. The `get_all_processes` and `get_process` methods now require `&mut self`, but this is satisfied by the `manager` variable obtained from `state.lock()`.

- [ ] **Step 2: Verify backend compiles and runs**

Run: `cd src-tauri && cargo build`
Expected: Compiles successfully

- [ ] **Step 3: Run backend tests**

Run: `cd src-tauri && cargo test`
Expected: All tests pass

- [ ] **Step 4: Commit (if any changes were needed)**

If no file changes needed, skip this step.

---

### Task 6: Update Frontend Process Type

**Files:**
- Modify: `src/types/process.ts`

- [ ] **Step 1: Add memory_bytes and uptime_secs fields**

Update the Process interface:
```typescript
export type ProcessStatus = 'running' | 'stopped' | 'crashed'

export interface Process {
  id: string
  name: string
  command: string
  working_directory: string
  status: ProcessStatus
  error_message: string | null
  memory_bytes: number | null
  uptime_secs: number | null
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build` or `npx tsc --noEmit`
Expected: Compiles successfully

- [ ] **Step 3: Commit**

```bash
git add src/types/process.ts
git commit -m "feat(frontend): add memory and uptime fields to Process type"
```

---

### Task 7: Create Format Utilities

**Files:**
- Create: `src/utils/format.ts`

- [ ] **Step 1: Create utils directory and format.ts**

Create file `src/utils/format.ts`:
```typescript
export function formatMemory(bytes: number | null): string {
  if (bytes === null) return '-'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = 0
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

export function formatUptime(secs: number | null): string {
  if (secs === null) return '-'
  
  const hours = Math.floor(secs / 3600)
  const minutes = Math.floor((secs % 3600) / 60)
  const seconds = secs % 60
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Compiles successfully

- [ ] **Step 3: Commit**

```bash
git add src/utils/format.ts
git commit -m "feat(frontend): add memory and uptime formatting utilities"
```

---

### Task 8: Update Process Table Component

**Files:**
- Modify: `src/components/process-table.tsx`

- [ ] **Step 1: Add Memory and Uptime column headers**

Update the `<thead>` section:
```tsx
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
```

- [ ] **Step 2: Verify frontend compiles**

Run: `npm run build`
Expected: Compiles successfully

- [ ] **Step 3: Commit**

```bash
git add src/components/process-table.tsx
git commit -m "feat(frontend): add Memory and Uptime columns to table header"
```

---

### Task 9: Update Process Row Component

**Files:**
- Modify: `src/components/process-row.tsx`

- [ ] **Step 1: Import format utilities**

Add at top of file after line 1:
```tsx
import { formatMemory, formatUptime } from '../utils/format'
```

- [ ] **Step 2: Add Memory and Uptime cells before Actions**

Update the return statement to add cells before the Actions cell:
```tsx
return (
  <tr>
    <td>{process.name}</td>
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
    </td>
  </tr>
)
```

- [ ] **Step 3: Verify frontend compiles**

Run: `npm run build`
Expected: Compiles successfully

- [ ] **Step 4: Commit**

```bash
git add src/components/process-row.tsx
git commit -m "feat(frontend): display memory and uptime in process row"
```

---

### Task 10: Add Backend Unit Tests

**Files:**
- Modify: `src-tauri/src/process_manager.rs`

- [ ] **Step 1: Add test for ProcessView with metrics fields**

Add to the existing tests module (after line 255):
```rust
#[test]
fn test_process_view_with_metrics() {
    let process = Process {
        id: "test-id".to_string(),
        name: "Test Process".to_string(),
        command: "echo test".to_string(),
        working_directory: "/tmp".to_string(),
        status: ProcessStatus::Running { pid: 12345, started_at: 1000000 },
    };

    let view = ProcessView::from(&process);
    assert_eq!(view.status, "running");
    assert_eq!(view.id, "test-id");
    assert!(view.memory_bytes.is_none()); // Not queried in From impl
    assert!(view.uptime_secs.is_none()); // Not queried in From impl
}
```

- [ ] **Step 2: Run tests**

Run: `cd src-tauri && cargo test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/process_manager.rs
git commit -m "test(backend): add test for ProcessView with metrics fields"
```

---

### Task 11: Add Frontend Unit Tests

**Files:**
- Create: `src/utils/format.test.ts`

- [ ] **Step 1: Create test file**

Create file `src/utils/format.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { formatMemory, formatUptime } from './format'

describe('formatMemory', () => {
  it('returns dash for null', () => {
    expect(formatMemory(null)).toBe('-')
  })

  it('formats bytes', () => {
    expect(formatMemory(512)).toBe('512.0 B')
  })

  it('formats kilobytes', () => {
    expect(formatMemory(1024)).toBe('1.0 KB')
    expect(formatMemory(1536)).toBe('1.5 KB')
  })

  it('formats megabytes', () => {
    expect(formatMemory(1048576)).toBe('1.0 MB')
  })

  it('formats gigabytes', () => {
    expect(formatMemory(1073741824)).toBe('1.0 GB')
  })
})

describe('formatUptime', () => {
  it('returns dash for null', () => {
    expect(formatUptime(null)).toBe('-')
  })

  it('formats seconds only', () => {
    expect(formatUptime(45)).toBe('00:00:45')
  })

  it('formats minutes and seconds', () => {
    expect(formatUptime(125)).toBe('00:02:05')
  })

  it('formats hours, minutes, and seconds', () => {
    expect(formatUptime(3661)).toBe('01:01:01')
  })
})
```

- [ ] **Step 2: Verify test setup**

Note: This project uses vitest. If not installed, add to package.json:
```json
"devDependencies": {
  "vitest": "^1.0.0"
}
```

Add test script to package.json:
```json
"scripts": {
  "test": "vitest run"
}
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/utils/format.test.ts package.json
git commit -m "test(frontend): add unit tests for format utilities"
```

---

### Task 12: Integration Testing

**Files:**
- None (manual testing)

- [ ] **Step 1: Build the application**

Run: `npm run tauri dev`
Expected: Application starts

- [ ] **Step 2: Test metrics display**

1. Create a new process
2. Start the process
3. Verify Memory and Uptime columns show values
4. Stop the process
5. Verify Memory shows"-" and Uptime shows "-"

- [ ] **Step 3: Test cross-platform (if applicable)**

On Windows: Verify memory values are reasonable (non-zero for running processes)
On macOS/Linux: Verify sysinfo works correctly

- [ ] **Step 4: Final commit for integration**

```bash
git add -A
git commit -m "test: verify memory and uptime columns work end-to-end"
```

---

## Summary

This plan adds memory and uptime columns to the process table by:
1. Adding `sysinfo` crate for cross-platform process metrics
2. Storing `started_at` timestamp when processes start
3. Querying memory and calculating uptime in `get_all_processes`
4. Updating frontend types and components to display the new columns

**Estimated time:** 30-45 minutes for experienced developer