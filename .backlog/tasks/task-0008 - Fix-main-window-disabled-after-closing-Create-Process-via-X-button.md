---
id: TASK-0008
title: Fix main window disabled after closing Create Process via X button
status: In Progress
assignee: []
created_date: '2026-03-21 04:01'
updated_date: '2026-03-21 04:02'
labels:
  - bug
  - windows
  - modal
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When the user closes the Create Process window using the X button (window close button on the frame), the main window remains disabled. The current implementation only re-enables the main window when OK or Cancel buttons are clicked, but not when the native window close button is used.

**Root cause:** The `handleClose()` function re-enables the main window, but it is only called from `handleOk()` and `handleCancel()`. The X button triggers a native window close event that bypasses this code path.

**Fix:** Listen for the window close event and ensure the main window is re-enabled before the window closes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 [ ] Main window is re-enabled when Create Process window is closed via X button
- [ ] #2 [ ] Main window is re-enabled when closed via OK button
- [ ] #3 [ ] Main window is re-enabled when closed via Cancel button
- [ ] #4 [ ] No console errors during any close method
<!-- AC:END -->
