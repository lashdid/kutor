---
id: TASK-0011
title: >-
  Fix process status showing "running" when stopped due to error or one-time
  execution
status: Done
assignee: []
created_date: '2026-03-23 10:47'
updated_date: '2026-03-23 10:57'
labels:
  - bug
  - status
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Currently, when a process is stopped due to an error or is a one-time execution script type, the status still shows as "running" even though technically the process has ceased execution. This creates confusion for users who see "running" status when the process is actually stopped.

The status should accurately reflect the actual state of the process - when it stops (whether by error or completion of one-time scripts), the UI should display the correct status.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Process status shows 'stopped' or 'error' when process terminates due to error
- [x] #2 Process status shows 'completed' when one-time execution script finishes successfully
- [x] #3 Status no longer shows 'running' for terminated processes
- [x] #4 Status updates in real-time when process state changes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Analysis

The issue is that when a process terminates (either by error or completion), the status remains "running" because there's no monitoring mechanism to detect process exit and update status.

Current flow:
1. `start_process` spawns child and stdout/stderr reader threads
2. Child is stored in `child_processes` HashMap
3. No thread waits for process exit → status never updates

## Implementation Plan

1. **Add 'completed' status** to ProcessStatus enum (Rust) and ProcessStatus type (TypeScript)
   - 'completed' = finished successfully (exit code 0)
   - 'crashed' = errored (non-zero exit code)
   - 'stopped' = manually stopped by user

2. **Add monitoring thread** in `start_process`:
   - Periodically calls `child.try_wait()` to check if process exited
   - On exit, locks ProcessManager and updates status:
     - Exit code 0 → `ProcessStatus::Completed`
     - Non-zero exit code → `ProcessStatus::Crashed { error: exit_code }`
   - Emits `process-status-change` event to frontend

3. **Update TypeScript frontend** to handle 'completed' status display

4. **Save to disk** when status changes from monitoring thread

5. **Handle stop_process interaction**:
   - When manually stopped, set status to `Stopped` (existing behavior)
   - Monitoring thread detects child_processes removal and exits cleanly
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation complete

- Added ProcessStatus::Completed variant to Rust enum

- Added 'completed' to TypeScript ProcessStatus type

- Updated ProcessView conversions for Completed status

- Added monitoring thread in start_process (both Windows and non-Windows)

- Monitoring thread uses try_wait() to poll for process exit every 100ms

- On exit: exit_code 0 → Completed, non-zero → Crashed with error message

- Updated process-row.tsx to handle 'completed' status (blue color)

- Start button now enabled for completed processes
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Summary

Fixed process status not updating when processes terminate due to error or completion.

### Changes Made

**Rust (src-tauri/src/process_manager.rs):**
1. Added `ProcessStatus::Completed` variant to the enum
2. Added `self_ref: Option<Weak<Mutex<ProcessManager>>>` field to enable monitoring threads to access ProcessManager
3. Added `set_self_ref()` method to set the weak reference after Arc creation
4. Updated all `ProcessView` conversions to handle `Completed` status
5. Added monitoring thread in `start_process()` for both Windows and non-Windows platforms:
   - Polls `child.try_wait()` every 100ms
   - On process exit: exit code 0 → `Completed`, non-zero → `Crashed { error }`
   - Emits `process-status-change` event to frontend
   - Saves status to disk
   - Handles graceful thread exit when process is removed by `stop_process()`

**Rust (src-tauri/src/lib.rs):**
- Updated setup to call `set_self_ref()` after creating the Arc

**TypeScript (src/types/process.ts):**
- Added 'completed' to ProcessStatus type union

**TypeScript (src/components/process-row.tsx):**
- Added `isCompleted` check
- Updated `getStatusColor()` to show blue for completed status
- Start button now enabled for completed processes (can restart a completed script)

### Behavior
- **Running** → Process is actively executing
- **Completed** → Process exited with code 0 (success)
- **Crashed** → Process exited with non-zero code (error)
- **Stopped** → Process was manually stopped by user

The frontend already polls every 1 second via TanStack Query's refetchInterval, so status updates are reflected within 1 second of process termination.
<!-- SECTION:FINAL_SUMMARY:END -->
