# Memory and Uptime Columns Feature

## Summary

Add memory usage and uptime columns to the process table, displaying real-time metrics for running processes.

## Requirements

- Display memory (working set) for running processes
- Display uptime (time since start) for running processes
- Cross-platform support with Windows prioritized
- Auto-refresh via existing useQuery polling (1 second)
- Show "N/A" or similar for stopped/crashed processes

## Architecture

### Backend (Rust)

#### Data Model Changes

**ProcessStatus enum** - add `started_at` timestamp:
```rust
pub enum ProcessStatus {
    Stopped,
    Running { pid: u32, started_at: u64 },  // Unix timestamp in milliseconds
    Crashed { error: String },
}
```

**ProcessView struct** - add metrics fields:
```rust
pub struct ProcessView {
    pub id: String,
    pub name: String,
    pub command: String,
    pub working_directory: String,
    pub status: String,
    pub error_message: Option<String>,
    pub memory_bytes: Option<u64>,    // Working set memory in bytes
    pub uptime_secs: Option<u64>,     // Seconds since process started
}
```

#### Implementation

**ProcessManager:**
- Add `sysinfo::System` field for querying process metrics
- On `start_process`:record `started_at` as `SystemTime::now().duration_since(UNIX_EPOCH).as_millis()`
- On `get_all_processes`: for each running process:
  - Query sysinfo for memory by PID using`refresh_processes_specifics`
  - Calculate `uptime_secs = (now_millis - started_at) / 1000`

**Memory query approach:**
```rust
use sysinfo::{System, ProcessesToUpdate, ProcessRefreshKind};

// In get_all_processes for running processes:
system.refresh_processes_specifics(
    ProcessesToUpdate::Some(&[pid]),
    true,
    ProcessRefreshKind::new().with_memory()
);

let memory_bytes = system.process(pid).map(|p| p.memory());
```

**Uptime calculation:**
```rust
let now_millis = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap()
    .as_millis() as u64;
letuptime_secs = (now_millis.saturating_sub(started_at)) / 1000;
```

#### Dependencies

Add to `Cargo.toml`:
```toml
sysinfo = "0.33"
```

### Frontend (TypeScript/React)

#### Type Changes

**Process type** (`src/types/process.ts`):
```typescript
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

#### Utility Functions

New file `src/utils/format.ts`:
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

#### UI Changes

**ProcessTable** (`src/components/process-table.tsx`):
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

**ProcessRow** (`src/components/process-row.tsx`):
```tsx
<td>{formatMemory(process.memory_bytes)}</td>
<td>{formatUptime(process.uptime_secs)}</td>
```

## Data Flow

```
Frontend (every 1s via useQuery)
    ↓
get_all_processes (Tauri command)
    ↓
ProcessManager::get_all_processes()
    - For each process:
      - If Running: query sysinfo for memory, calculate uptime
      - If Stopped/Crashed: memory=null, uptime=null
    ↓
Return ProcessView[]
    ↓
Frontend formats and displays
```

## Platform Support

| Platform | Memory | Uptime |
|----------|--------|--------|
| Windows | ✅ Full support | ✅ Full support |
| macOS | ✅ Planned | ✅ Planned |
| Linux | ✅ Planned | ✅ Planned |

The `sysinfo` crate provides cross-platform APIs. Windows is implemented first; macOS/Linux will work with the same code.

## Error Handling

- If sysinfo fails to query a process: return `null` for memory (process may have terminated)
- If process no longer exists in sysinfo: keep running status, return `null` for memory
- Stopped/crashed processes always have `null` for both metrics

## Testing

### Backend Tests
- Test `ProcessView` serialization with new fields
- Test uptime calculation from timestamps
- Test memory formatting edge cases

### Frontend Tests
- Test `formatMemory` with various byte values
- Test `formatUptime` with various second values
- Test null handling in display

## Implementation Order

1. Add `sysinfo` dependency to Cargo.toml
2. Update `ProcessStatus` enum with `started_at`
3. Update `ProcessView` struct with metrics fields
4. Modify `ProcessManager::start_process` to record start time
5. Modify `ProcessManager::get_all_processes` to query sysinfo
6. Update frontend `Process` type
7. Create `format.ts` utility
8. Update `ProcessTable` and `ProcessRow` components