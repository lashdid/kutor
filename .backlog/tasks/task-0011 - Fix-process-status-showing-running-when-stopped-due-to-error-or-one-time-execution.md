---
id: TASK-0011
title: >-
  Fix process status showing "running" when stopped due to error or one-time
  execution
status: To Do
assignee: []
created_date: '2026-03-23 10:47'
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
- [ ] #1 Process status shows 'stopped' or 'error' when process terminates due to error
- [ ] #2 Process status shows 'completed' when one-time execution script finishes successfully
- [ ] #3 Status no longer shows 'running' for terminated processes
- [ ] #4 Status updates in real-time when process state changes
<!-- AC:END -->
