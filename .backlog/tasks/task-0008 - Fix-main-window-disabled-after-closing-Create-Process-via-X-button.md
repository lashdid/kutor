---
id: TASK-0008
title: Fix main window disabled after closing Create Process via X button
status: In Progress
assignee: []
created_date: '2026-03-21 04:01'
updated_date: '2026-03-21 04:03'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### Problem
The X button (native window close) bypasses `handleClose()`, leaving the main window disabled.

### Solution
Use Tauri v2's `getCurrentWindow().onCloseRequested()` API to intercept all window close attempts.

### Changes to `src/pages/create-process.tsx`

1. Remove the re-enable logic from `handleClose()` (this will be handled by the close listener)
2. Add `useEffect` hook to register a closeRequested listener on mount
3. In the listener, re-enable the main window using `Window.getByLabel('main')`
4. Clean up the listener on unmount

### Code Flow
1. User clicks X button → `onCloseRequested` fires
2. Listener re-enables main window
3. Window closes normally
4. OK/Cancel buttons also work (they call window.close() which triggers the same listener)

### Files to Modify
- `src/pages/create-process.tsx` - Add closeRequested listener

### Testing
1. Open Create Process window
2. Close via X button → main window should be re-enabled
3. Close via OK button → main window should be re-enabled
4. Close via Cancel button → main window should be re-enabled
<!-- SECTION:PLAN:END -->
