---
id: TASK-0010
title: Add process log viewer with conditional "Log" button
status: Done
assignee: []
created_date: '2026-03-22 14:18'
updated_date: '2026-03-23 09:42'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a "Log" button to the process table that appears only when a process is running. When clicked, it opens a new window/view displaying the log output of that process.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Log button is hidden when process is not running
- [ ] #2 Log button is visible when process is running
- [ ] #3 Clicking Log button opens a new window/view with process logs
- [ ] #4 Process logs display stdout and stderr output from the running process
- [ ] #5 Log window updates in real-time as process produces output
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented process log viewer feature:

**Backend Changes:**
- Added `LogLine` and `ProcessLog` structs with ring buffer (10,000 lines max)
- Modified `ProcessManager` to capture stdout/stderr via `Stdio::piped()`
- Spawned background threads to read process output and emit `process-output` Tauri events
- Added `get_process_logs` command to fetch buffered logs
- Logs persist after process stops until app restart

**Frontend Changes:**
- Added `LogLine` type and `getProcessLogs` service function
- Created `useProcessLogs` hook for fetching initial logs and subscribing to real-time events
- Created `ProcessLog` page with dark theme, monospace font, stderr in red
- Added routing for `log-{process_id}` window labels in `main.tsx`
- Added Log button to `ProcessRow` component (always visible)

**Commits:**
- feat(backend): add ProcessLog struct and logs storage
- feat(backend): capture stdout/stderr from spawned processes
- feat(backend): add get_process_logs command  
- feat(frontend): add LogLine type
- feat(frontend): add getProcessLogs service function
- feat(frontend): create useProcessLogs hook
- feat(frontend): create ProcessLog page component
- feat(frontend): add routing for log window
- feat(frontend): add Log button to ProcessRow
<!-- SECTION:FINAL_SUMMARY:END -->
