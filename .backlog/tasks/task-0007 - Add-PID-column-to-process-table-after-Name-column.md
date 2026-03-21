---
id: TASK-0007
title: Add PID column to process table after Name column
status: Done
assignee: []
created_date: '2026-03-21 02:37'
updated_date: '2026-03-21 02:38'
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
- [x] #1 PID column appears after Name column in process table
- [x] #2 PID displays for running processes
- [x] #3 PID shows as empty/dash for stopped and crashed processes
- [x] #4 Backend ProcessView struct includes pid field
- [x] #5 Frontend Process type includes pid field
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added PID column to the process table, positioned after the Name column as requested. 

Changes made:
- Backend (Rust): Added `pid: Option<u32>` field to `ProcessView` struct and updated all conversion points to populate it
- Frontend (TypeScript): Added `pid` field to `Process` interface
- UI: Added PID column header in `ProcessTable` and PID cell in `ProcessRow` displaying `pid ?? '-'`

The PID displays for running processes and shows '-' for stopped/crashed processes.
<!-- SECTION:FINAL_SUMMARY:END -->
