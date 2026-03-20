---
id: TASK-0002
title: Fix Cancel/OK buttons not closing Create Process window
status: Done
assignee: []
created_date: '2026-03-20 07:16'
updated_date: '2026-03-20 07:25'
labels:
  - bug
  - ui
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Cancel and OK buttons in the Create Process window do not close the window after their actions complete. The window should close when clicking Cancel, or after successfully creating a process (OK button).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Clicking Cancel closes the Create Process window
- [x] #2 Clicking OK after filling form closes the Create Process window
- [x] #3 Window closes without errors
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed Cancel/OK buttons not closing Create Process window.

**Root Cause:** Missing Tauri v2 permissions for window/webview close operations.

**Fix in `src-tauri/capabilities/default.json`:**
- Added `core:window:allow-close`
- Added `core:webview:allow-webview-close`

**Build:** Passed ✓
<!-- SECTION:FINAL_SUMMARY:END -->
