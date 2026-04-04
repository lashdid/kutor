---
id: TASK-0012
title: Fix window flicker when closing Create Process dialog
status: To Do
assignee: []
created_date: '2026-04-04 04:50'
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
