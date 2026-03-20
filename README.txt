# Kutor

## Overview

**Kutor** is a lightweight **PM2 alternative** built with:

* **Tauri (Rust)** → Backend (process management)
* **React + TypeScript** → Frontend (UI)

The goal is to build a **minimal, structurally clean process manager** that can grow over time.

UI should stay **very simple** (HTML-first, minimal CSS).

---

## Naming Conventions

### Frontend (React)

Use **kebab-case** for:

* Component files
* Folder names
* Utility files

Examples:

```bash
process-table.tsx
process-row.tsx
create-process-form.tsx
tauri-service.ts
```

Component names inside code can still use PascalCase, but **file names must be kebab-case**.

---

## Core Features

### 1. Process Management

* Create a process (e.g. `pnpm dev`)
* Run process in the background
* Stop process
* Restart process

---

### 2. UI Features

#### Process Table

Display:

* Process Name
* Status (running / stopped)
* Directory (optional)

#### Actions

Each process should support:

* Start
* Stop
* Restart

---

### 3. Create Process Flow

* Clicking "Create Process" opens a **new Tauri window**
* Form inputs:

  * Name
  * Command
  * Working directory
* On submit:

  * Save process
  * Display in main table

---

## Architecture

### High-Level Structure

```bash
/src-tauri          # Backend (Rust)
  /src
    process_manager.rs
    commands.rs

/src                # Frontend (React + TS)
  /components
    process-table.tsx
    process-row.tsx
  /pages
    home.tsx
    create-process.tsx
  /services
    tauri-service.ts
```

---

## Backend (Rust / Tauri)

### Responsibilities

* Spawn processes
* Stop processes
* Restart processes
* Track process state

### Suggested Structure

```rust
// process_manager.rs
struct Process {
    id: String,
    name: String,
    command: String,
    directory: String,
    status: ProcessStatus,
}

fn start_process(...)
fn stop_process(...)
fn restart_process(...)
```

```rust
// commands.rs
#[tauri::command]
fn start_process_command(...)

#[tauri::command]
fn stop_process_command(...)
```

Use:

* `std::process::Command`

---

## Frontend (React + TS)

### Responsibilities

* Display process list
* Trigger backend commands
* Manage simple UI state

### Suggested Structure

```bash
/components
  process-table.tsx
  process-row.tsx

/pages
  home.tsx
  create-process.tsx

/services
  tauri-service.ts
```

---

## TTD (Test-Driven Development)

### Backend

* Test:

  * process creation
  * start/stop/restart behavior
* Ensure predictable state transitions

### Frontend

* Keep logic separate from UI
* Use small testable functions

---

## Minimal UI Rules

* Use basic HTML:

  * `<table>`
  * `<button>`
  * `<input>`
* Avoid CSS frameworks
* Focus on functionality first

---

## Application Flow

1. Open app
2. See process table
3. Click "Create Process"
4. New window opens
5. Submit form
6. Process appears in table
7. User can:

   * Start
   * Stop
   * Restart

---

## Future Improvements

* Logs viewer
* Auto-restart on crash
* Environment variables
* Better UI

---

## Notes for AI Agent

* Follow **kebab-case naming strictly**
* Keep frontend and backend clearly separated
* Avoid unnecessary abstractions
* Prioritize working features over polish
* Keep code modular and clean