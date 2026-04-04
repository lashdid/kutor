---
id: TASK-0012
title: Fix window flicker when closing Create Process dialog
status: In Progress
assignee: []
created_date: '2026-04-04 04:50'
updated_date: '2026-04-04 04:51'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
**Bug:** When pressing the "Create Process" button and then closing the dialog, there is a noticeable flicker effect. The user initially thought this was related to opening a new window, but testing with the Logs window shows no flicker when opened/closed.

**Observation:** The flicker appears specific to the Create Process dialog. This suggests an issue with focus management or window state handling in that specific dialog implementation, rather than a general window-opening problem.

**Affected component:** Create Process dialog/window

**Not affected:** Logs window (opens/closes without flicker)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 [ ] Open Create Process dialog and close it - no flicker should occur
- [ ] #2 [ ] Verify keyboard focus returns to the main window properly after closing
- [ ] #3 [ ] Compare behavior with Logs window to ensure consistent window focus handling
- [ ] #4 [ ] Test on multiple focus/defocus cycles to confirm stability
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Root Cause Analysis

**Investigation Date:** 2026-04-04

**Findings:**

- **Root Cause:** The Create Process dialog disables the main window (`setEnabled(false)`) when opening and re-enables it (`setEnabled(true)`) + sets focus (`setFocus()`) when closing

- **Why it flickers:** The enable/disable state transitions create visible visual artifacts during window lifecycle

- **Contrast with Logs window:** Logs window opens WITHOUT manipulating main window state - it just creates the WebviewWindow with no setEnabled/setFocus calls

- **Comparison:**

- Create Process (broken): Disables main → opens dialog → on close: enables main + sets focus

- Logs (working): No main window manipulation at all

**Solution:** Remove the setEnabled(false) call on open and remove the setFocus() call on close. The WebviewWindow's parent property already handles modal-like behavior.

**Files to modify:**

- `src/pages/home.tsx` (lines 9, 18-19): Remove mainWindow.setEnabled(false) and remove mainWindow.setEnabled(true) + setFocus() from destroyed handler
<!-- SECTION:NOTES:END -->
