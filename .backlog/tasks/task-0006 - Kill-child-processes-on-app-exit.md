---
id: TASK-0006
title: Kill child processes on app exit
status: To Do
assignee: []
created_date: '2026-03-21 02:16'
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
