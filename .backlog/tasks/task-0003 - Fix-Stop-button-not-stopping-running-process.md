---
id: TASK-0003
title: Fix Stop button not stopping running process
status: In Progress
assignee: []
created_date: '2026-03-20 07:21'
updated_date: '2026-03-20 07:21'
labels:
  - bug
  - process-control
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Stop button in the process table does not stop processes that have already started. Users expect clicking Stop to terminate the running process.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Clicking Stop button terminates a running process
- [ ] #2 Process status updates to stopped after clicking Stop
- [ ] #3 No errors in console when stopping process
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Investigation

**Root Cause Analysis:**
In `process_manager.rs:172-193`, the `stop_process` method:
1. Calls `child.kill()` but doesn't wait for process termination
2. On Windows, `cmd /C <command>` spawns a subprocess - killing `cmd` may not kill the child

**Code Flow:**
- `src/components/process-row.tsx:28` - Stop button calls `onStop(process.id)`
- `src/hooks/use-stop-process.ts` - Mutation calls `stopProcess(id)`
- `src/services/tauri-service.ts:16-18` - Invokes `stop_process` command
- `src-tauri/src/commands.rs:31-39` - Calls `manager.stop_process(&id)`
- `src-tauri/src/process_manager.rs:172-193` - The actual stop logic

**Fix:**
1. Import `std::process::Command` for Windows-specific kill
2. Modify `stop_process` to:
   - Get the PID before killing
   - Use `taskkill /F /T /PID <pid>` on Windows to kill process tree
   - Call `child.wait()` to ensure clean termination
   - Fall back to `child.kill()` on non-Windows
<!-- SECTION:PLAN:END -->
