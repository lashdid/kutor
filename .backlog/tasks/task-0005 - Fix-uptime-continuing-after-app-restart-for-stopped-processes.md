---
id: TASK-0005
title: Fix uptime continuing after app restart for stopped processes
status: In Progress
assignee: []
created_date: '2026-03-21 02:09'
updated_date: '2026-03-21 02:09'
labels:
  - bug
  - backend
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When the app restarts, processes that were running when the app closed still show as "running" with uptime continuing to increment. The app needs to check if PIDs are still alive on startup and update status accordingly.

**Root cause:** `load_from_disk` loads `ProcessStatus::Running { pid, started_at }` without verifying the PID is still alive. The child process handle is lost on app close, and the actual process may have been killed or become orphaned.

**Expected fix:** On app startup after loading from disk, reconcile process states - check if each PID marked as "running" is actually alive. If not, update status to `Stopped` or `Crashed`.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add `reconcile_processes` method to `ProcessManager` that checks if PIDs marked as Running are still alive
2. Use sysinfo to check if each PID exists
3. If PID not found, update status to Stopped
4. Call `reconcile_processes` after `load_from_disk` in app startup
5. Save updated state to disk
<!-- SECTION:PLAN:END -->
