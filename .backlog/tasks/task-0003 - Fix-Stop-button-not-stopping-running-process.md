---
id: TASK-0003
title: Fix Stop button not stopping running process
status: In Progress
assignee: []
created_date: '2026-03-20 07:21'
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
