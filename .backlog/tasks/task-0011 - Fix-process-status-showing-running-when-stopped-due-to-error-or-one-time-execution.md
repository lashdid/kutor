---
id: TASK-0011
title: >-
  Fix process status showing "running" when stopped due to error or one-time
  execution
status: In Progress
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
