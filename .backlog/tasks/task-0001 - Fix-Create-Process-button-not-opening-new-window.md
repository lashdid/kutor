---
id: TASK-0001
title: Fix "Create Process" button not opening new window
status: In Progress
assignee: []
created_date: '2026-03-20 03:05'
updated_date: '2026-03-20 03:07'
labels:
  - bug
  - ui
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The "Create Process" button is not triggering the action to open a new window when clicked. Users expect clicking this button to create a new process instance in a separate window.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Clicking the 'Create Process' button opens a new window
- [ ] #2 The button click event is properly wired and functional
- [ ] #3 No console errors when clicking the button
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Investigation

**Root Cause:** In Tauri v2, dynamically creating webview windows requires explicit permissions. The code in `home.tsx` creates a `WebviewWindow` without the required capability/permission, causing the operation to fail silently.

**Code Analysis:**
- `src/pages/home.tsx:6-11` - Creates `WebviewWindow('create-process', {...})`
- `src-tauri/capabilities/` - Directory does NOT exist (no capabilities defined)
- `src-tauri/gen/schemas/capabilities.json` - Empty `{}`

**Fix:**
1. Create `src-tauri/capabilities/default.json` granting `core:webview:allow-create` and `core:window:allow-create` permissions
2. Reference the capabilities in `tauri.conf.json` (if not auto-detected)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation Complete

**Created:** `src-tauri/capabilities/default.json`

**Permissions granted:**

- `core:window:default` - default window permissions

- `core:webview:default` - default webview permissions

- `core:window:allow-create` - allows creating new windows

- `core:webview:allow-create` - allows creating new webviews

- `core:event:default` - event handling

- `core:app:default` - app permissions

- `core:image:default` - image permissions

- `dialog:default` - dialog plugin permissions

- `shell:allow-open` - shell open permission

**Build:** Passed ✓
<!-- SECTION:NOTES:END -->
