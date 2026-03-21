---
id: TASK-0006
title: Kill child processes on app exit
status: Done
assignee: []
created_date: '2026-03-21 02:16'
updated_date: '2026-03-21 02:17'
labels:
  - bug
  - backend
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When the app closes, all running child processes should be terminated. Currently they continue running as orphaned processes.

**Implementation:** Use Tauri's app lifecycle to hook into close/cleanup events and call stop_process for all running processes.
<!-- SECTION:DESCRIPTION:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added `stop_all_processes` method to ProcessManager and hooked it into Tauri's `ExitRequested` event. When the app closes, all running processes are now terminated.

Files changed:
- `src-tauri/src/process_manager.rs`: Added `stop_all_processes` method
- `src-tauri/src/lib.rs`: Changed from `.run()` to `.build()` + `.run()` with event handler for `RunEvent::ExitRequested`
<!-- SECTION:FINAL_SUMMARY:END -->
