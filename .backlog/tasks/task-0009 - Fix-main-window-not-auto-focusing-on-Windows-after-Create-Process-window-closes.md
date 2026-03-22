---
id: TASK-0009
title: >-
  Fix main window not auto-focusing on Windows after Create Process window
  closes
status: Done
assignee: []
created_date: '2026-03-22 01:49'
updated_date: '2026-03-22 01:55'
labels:
  - bug
  - windows
  - focus
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On Windows, when the Create Process window is closed, the main window does not automatically receive focus. The user has to manually click on the main window to bring it to the foreground.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When Create Process window closes, main window automatically receives focus on Windows
- [ ] #2 Main window appears in foreground without user interaction
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Plan

**Root cause**: On Windows, when a child window closes, the OS may give focus to another application instead of the parent window due to focus stealing prevention. Simply calling `setEnabled(true)` and `setFocus()` is not enough.

**Fix**: Use `setAlwaysOnTop(true)` followed by `setAlwaysOnTop(false)` before `setFocus()` in the `tauri://destroyed` handler. This forces the window to the foreground on Windows.

**File modified**: `src/pages/home.tsx`

**Change**:
```typescript
webview.once('tauri://destroyed', async () => {
  await mainWindow.setEnabled(true)
  await mainWindow.setAlwaysOnTop(true)
  await mainWindow.setAlwaysOnTop(false)
  await mainWindow.setFocus()
})
```
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Previous fix with only setFocus() was insufficient on Windows - focus stealing prevention kicks in

Added setAlwaysOnTop(true/false) workaround to force window to foreground
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed main window not auto-focusing after Create Process window closes by adding `mainWindow.setFocus()` call after `setEnabled(true)` in the `tauri://destroyed` event handler in `src/pages/home.tsx`.
<!-- SECTION:FINAL_SUMMARY:END -->
