---
id: TASK-0004
title: Make Create Process window modal - disable main window interaction
status: In Progress
assignee: []
created_date: '2026-03-20 08:20'
updated_date: '2026-03-20 08:21'
labels:
  - ux
  - windows
  - modal
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When the Create Process window is open, users should not be able to interact with the main window. This prevents confusion and potential data inconsistency. On Windows, play a warning/ding sound when attempting to click the main window while Create Process is open, and continue until the modal is closed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Main window is not clickable/interactive when Create Process window is open
- [ ] #2 Windows: Warning sound plays when user attempts to click main window while Create Process window is open
- [ ] #3 Warning sound stops when Create Process window is closed
- [ ] #4 Cross-platform: On macOS/Linux, use appropriate system feedback (no sound required)
<!-- AC:END -->
