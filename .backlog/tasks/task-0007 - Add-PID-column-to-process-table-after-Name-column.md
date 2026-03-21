---
id: TASK-0007
title: Add PID column to process table after Name column
status: To Do
assignee: []
created_date: '2026-03-21 02:37'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a new column to display the process PID (Process ID) in the main window's process table. The PID should be shown for running processes and hidden/null for stopped/crashed processes. Place the column after the Name column.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PID column appears after Name column in process table
- [ ] #2 PID displays for running processes
- [ ] #3 PID shows as empty/dash for stopped and crashed processes
- [ ] #4 Backend ProcessView struct includes pid field
- [ ] #5 Frontend Process type includes pid field
<!-- AC:END -->
