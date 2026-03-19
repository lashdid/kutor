# Kutor Initialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal PM2 alternative with Tauri + React that can create, start, stop, and restart processes with persistence.

**Architecture:** Single JSON file for persistence. ProcessManager struct in Rust backend manages process lifecycle. React frontend with @tanstack/react-table and @tanstack/react-query for data fetching. Tauri commands bridge frontend and backend.

**Tech Stack:** Tauri 2.x, Rust, React 18+, TypeScript, @tanstack/react-table, @tanstack/react-query, Zustand, Vitest, Cargo test

---

## File Structure

This plan creates the following files:

### Backend (Rust/Tauri)

| File | Purpose |
|------|---------|
| `src-tauri/src/main.rs` | App initialization, state setup, window management |
| `src-tauri/src/lib.rs` | Module exports |
| `src-tauri/src/process_manager.rs` | Process, ProcessStatus, ProcessManager implementation |
| `src-tauri/src/commands.rs` | Tauri IPC command handlers |
| `src-tauri/src/error.rs` | Error types |
| `src-tauri/Cargo.toml` | Dependencies (serde, serde_json, uuid) |
| `src-tauri/tauri.conf.json` | Tauri configuration |

### Frontend (React/TypeScript)

| File | Purpose |
|------|---------|
| `src/main.tsx` | React entry point |
| `src/App.tsx` | Root component |
| `src/components/process-table.tsx` | Table component using @tanstack/react-table |
| `src/components/process-row.tsx` | Single process row |
| `src/pages/home.tsx` | Main window page |
| `src/pages/create-process.tsx` | Create process window page |
| `src/services/tauri-service.ts` | Tauri command invocations |
| `src/hooks/use-processes.ts` | React Query hook for process list |
| `src/hooks/use-create-process.ts` | Mutation hook for creating |
| `src/hooks/use-start-process.ts` | Mutation hook for starting |
| `src/hooks/use-stop-process.ts` | Mutation hook for stopping |
| `src/hooks/use-restart-process.ts` | Mutation hook for restarting |
| `src/hooks/use-delete-process.ts` | Mutation hook for deleting |
| `src/types/process.ts` | TypeScript types for Process |
| `src/vite-env.d.ts` | Vite environment types |
| `index.html` | HTML entry |
| `package.json` | Dependencies |
| `tsconfig.json` | TypeScript config |
| `vite.config.ts` | Vite config |

### Tests

| File | Purpose |
|------|---------|
| `src-tauri/src/process_manager.rs` (inline) | Rust unit tests |
| `src/components/__tests__/process-row.test.tsx` | Component tests |

---

## Task 1: Initialize Project Structure

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/vite-env.d.ts`

- [ ] **Step 1: Initialize npm project**

Run: `npm init -y`

Expected: Creates `package.json`

- [ ] **Step 2: Install frontend dependencies**

Run: `npm install react react-dom @tanstack/react-table @tanstack/react-query zustand`

Run: `npm install -D typescript vite @types/react @types/react-dom @vitejs/plugin-react`

Expected: Dependencies installed

- [ ] **Step 3: Create TypeScript configuration**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create Vite configuration**

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})
```

- [ ] **Step 5: Create HTML entry**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kutor</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create Vite environment types**

Create `src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 7: Create TypeScript types for Process**

Create `src/types/process.ts`:

```typescript
export type ProcessStatus = 'running' | 'stopped' | 'crashed'

export interface Process {
  id: string
  name: string
  command: string
  working_directory: string
  status: ProcessStatus
  error_message: string | null
}

export interface CreateProcessParams {
  name: string
  command: string
  working_directory: string
}
```

- [ ] **Step 8: Commit project structure**

Run: `git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html src/vite-env.d.ts src/types/process.ts`

Run: `git commit -m "chore: initialize frontend project structure"`

---

## Task 2: Initialize Tauri Backend

**Files:**
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`

- [ ] **Step 1: Install Tauri CLI**

Run: `npm install -D @tauri-apps/cli`

Expected: Tauri CLI installed

- [ ] **Step 2: Create Cargo manifest**

Create `src-tauri/Cargo.toml`:

```toml
[package]
name = "kutor"
version = "0.1.0"
description = "A lightweight process manager"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["unstable"] }
tauri-plugin-dialog = "2"
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4", "serde"] }
thiserror = "2"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
```

- [ ] **Step 3: Create build script**

Create `src-tauri/build.rs`:

```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 4: Create Tauri configuration**

Create `src-tauri/tauri.conf.json`:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Kutor",
  "version": "0.1.0",
  "identifier": "com.kutor.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Kutor",
        "width": 800,
        "height": 600,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "plugins": {
    "dialog": {},
    "shell": {
      "open": true
    }
  }
}
```

- [ ] **Step 5: Create main entry point**

Create `src-tauri/src/main.rs`:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    kutor_lib::run()
}
```

- [ ] **Step 6: Create library root**

Create `src-tauri/src/lib.rs`:

```rust
mod commands;
mod error;
mod process_manager;

use std::sync::{Arc, Mutex};
use tauri::Manager;
use process_manager::ProcessManager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_handle = app.handle();
            let config_path = app_handle.path().app_data_dir()
                .expect("Failed to get app data directory")
                .join("processes.json");
            
            let manager = ProcessManager::new(config_path);
            app.manage(Arc::new(Mutex::new(manager)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_process,
            commands::start_process,
            commands::stop_process,
            commands::restart_process,
            commands::delete_process,
            commands::get_all_processes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 7: Commit Tauri setup**

Run: `git add src-tauri/`

Run: `git commit -m "chore: initialize Tauri backend structure"`

---

## Task 3: Implement Error Types

**Files:**
- Create: `src-tauri/src/error.rs`

- [ ] **Step 1: Write failing test for error types**

Add to `src-tauri/src/error.rs`:

```rust
use thiserror::Error;

#[derive(Error, Debug, serde::Serialize, serde::Deserialize)]
pub enum KutorError {
    #[error("Process not found: {0}")]
    ProcessNotFound(String),
    
    #[error("Process is already running: {0}")]
    ProcessAlreadyRunning(String),
    
    #[error("Process is not running: {0}")]
    ProcessNotRunning(String),
    
    #[error("Failed to spawn process: {0}")]
    SpawnFailed(String),
    
    #[error("IO error: {0}")]
    IoError(String),
}

impl From<std::io::Error> for KutorError {
    fn from(err: std::io::Error) -> Self {
        KutorError::IoError(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let err = KutorError::ProcessNotFound("test-id".to_string());
        assert_eq!(err.to_string(), "Process not found: test-id");
    }

    #[test]
    fn test_error_serialization() {
        let err = KutorError::ProcessNotFound("test-id".to_string());
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("ProcessNotFound"));
    }
}
```

- [ ] **Step 2: Run tests**

Run: `cd src-tauri && cargo test error::tests --no-fail-fast`

Expected: Tests pass

- [ ] **Step 3: Commit error types**

Run: `git add src-tauri/src/error.rs`

Run: `git commit -m "feat: add error types for process management"`

---

## Task 4: Implement Process and ProcessStatus Types

**Files:**
- Create: `src-tauri/src/process_manager.rs`

- [ ] **Step 1: Write failing test for ProcessStatus**

Add to `src-tauri/src/process_manager.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Child;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProcessStatus {
    Stopped,
    Running { pid: u32 },
    Crashed { error: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Process {
    pub id: String,
    pub name: String,
    pub command: String,
    pub working_directory: String,
    pub status: ProcessStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessView {
    pub id: String,
    pub name: String,
    pub command: String,
    pub working_directory: String,
    pub status: String,
    pub error_message: Option<String>,
}

impl From<&Process> for ProcessView {
    fn from(process: &Process) -> Self {
        let (status, error_message) = match &process.status {
            ProcessStatus::Stopped => ("stopped".to_string(), None),
            ProcessStatus::Running { pid: _ } => ("running".to_string(), None),
            ProcessStatus::Crashed { error } => ("crashed".to_string(), Some(error.clone())),
        };
        
        ProcessView {
            id: process.id.clone(),
            name: process.name.clone(),
            command: process.command.clone(),
            working_directory: process.working_directory.clone(),
            status,
            error_message,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_status_serialization() {
        let status = ProcessStatus::Running { pid: 12345 };
        let json = serde_json::to_string(&status).unwrap();
        assert!(json.contains("Running"));
    }

    #[test]
    fn test_process_view_from_process() {
        let process = Process {
            id: "test-id".to_string(),
            name: "Test Process".to_string(),
            command: "echo test".to_string(),
            working_directory: "/tmp".to_string(),
            status: ProcessStatus::Running { pid: 12345 },
        };
        
        let view = ProcessView::from(&process);
        assert_eq!(view.status, "running");
        assert_eq!(view.id, "test-id");
    }
}
```

- [ ] **Step 2: Run tests**

Run: `cd src-tauri && cargo test process_manager::tests --no-fail-fast`

Expected: Tests pass

- [ ] **Step 3: Commit types**

Run: `git add src-tauri/src/process_manager.rs`

Run: `git commit -m "feat: add Process and ProcessStatus types"`

---

## Task 5: Implement ProcessManager

**Files:**
- Modify: `src-tauri/src/process_manager.rs`

- [ ] **Step 1: Write failing test for ProcessManager creation**

Add to `src-tauri/src/process_manager.rs` (append to existing content):

```rust
pub struct ProcessManager {
    processes: HashMap<String, Process>,
    child_processes: HashMap<String, Child>,
    config_path: PathBuf,
}

impl ProcessManager {
    pub fn new(config_path: PathBuf) -> Self {
        Self {
            processes: HashMap::new(),
            child_processes: HashMap::new(),
            config_path,
        }
    }
    
    pub fn create_process(&mut self, name: String, command: String, working_directory: String) -> Result<String, crate::error::KutorError> {
        let id = Uuid::new_v4().to_string();
        let process = Process {
            id: id.clone(),
            name,
            command,
            working_directory,
            status: ProcessStatus::Stopped,
        };
        
        self.processes.insert(id.clone(), process);
        self.save_to_disk()?;
        
        Ok(id)
    }
    
    pub fn get_all_processes(&self) -> Vec<ProcessView> {
        self.processes.values().map(ProcessView::from).collect()
    }
    
    pub fn save_to_disk(&self) -> Result<(), crate::error::KutorError> {
        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent)?;
        }
        
        let json = serde_json::to_string(&self.processes)?;
        fs::write(&self.config_path, json)?;
        
        Ok(())
    }
    
    pub fn load_from_disk(&mut self) -> Result<(), crate::error::KutorError> {
        if !self.config_path.exists() {
            return Ok(());
        }
        
        let content = fs::read_to_string(&self.config_path)?;
        self.processes = serde_json::from_str(&content)?;
        
        Ok(())
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;
    use tempfile::tempdir;
    
    #[test]
    fn test_create_process() {
        let dir = tempdir().unwrap();
        let config_path = dir.path().join("processes.json");
        let mut manager = ProcessManager::new(config_path);
        
        let id = manager.create_process("Test".to_string(), "echo test".to_string(), "/tmp".to_string()).unwrap();
        assert!(!id.is_empty());
        assert_eq!(manager.processes.len(), 1);
    }
    
    #[test]
    fn test_persistence() {
        let dir = tempfile::tempdir().unwrap();
        let config_path = dir.path().join("processes.json");
        
        let mut manager = ProcessManager::new(config_path.clone());
        manager.create_process("Test".to_string(), "echo test".to_string(), "/tmp".to_string()).unwrap();
        manager.save_to_disk().unwrap();
        
        let mut manager2 = ProcessManager::new(config_path);
        manager2.load_from_disk().unwrap();
        
        assert_eq!(manager2.processes.len(), 1);
    }
}
```

- [ ] **Step 2: Add tempfile dev dependency**

Update `src-tauri/Cargo.toml`, add:

```toml
[dev-dependencies]
tempfile = "3"
```

- [ ] **Step 3: Run tests**

Run: `cd src-tauri && cargo test process_manager --no-fail-fast`

Expected: Tests pass

- [ ] **Step 4: Commit ProcessManager**

Run: `git add src-tauri/src/process_manager.rs src-tauri/Cargo.toml`

Run: `git commit -m "feat: implement ProcessManager with persistence"`

---

## Task 6: Implement Start/Stop/Restart/Delete Operations

**Files:**
- Modify: `src-tauri/src/process_manager.rs`

- [ ] **Step 1: Write failing tests for start/stop operations**

Append to `src-tauri/src/process_manager.rs` in the `impl ProcessManager` block:

```rust
    pub fn start_process(&mut self, id: &str) -> Result<(), crate::error::KutorError> {
        let process = self.processes.get_mut(id)
            .ok_or_else(|| crate::error::KutorError::ProcessNotFound(id.to_string()))?;
        
        match &process.status {
            ProcessStatus::Running { .. } => {
                return Err(crate::error::KutorError::ProcessAlreadyRunning(id.to_string()));
            }
            _ => {}
        }
        
        let child = std::process::Command::new("sh")
            .arg("-c")
            .arg(&process.command)
            .current_dir(&process.working_directory)
            .spawn()
            .map_err(|e| crate::error::KutorError::SpawnFailed(e.to_string()))?;
        
        let pid = child.id();
        process.status = ProcessStatus::Running { pid };
        self.child_processes.insert(id.to_string(), child);
        self.save_to_disk()?;
        
        Ok(())
    }
    
    pub fn stop_process(&mut self, id: &str) -> Result<(), crate::error::KutorError> {
        let process = self.processes.get_mut(id)
            .ok_or_else(|| crate::error::KutorError::ProcessNotFound(id.to_string()))?;
        
        match &process.status {
            ProcessStatus::Stopped => {
                return Err(crate::error::KutorError::ProcessNotRunning(id.to_string()));
            }
            _ => {}
        }
        
        if let Some(mut child) = self.child_processes.remove(id) {
            let _ = child.kill();
        }
        
        process.status = ProcessStatus::Stopped;
        self.save_to_disk()?;
        
        Ok(())
    }
    
    pub fn restart_process(&mut self, id: &str) -> Result<(), crate::error::KutorError> {
        self.stop_process(id)?;
        self.start_process(id)?;
        Ok(())
    }
    
    pub fn delete_process(&mut self, id: &str) -> Result<(), crate::error::KutorError> {
        if self.processes.contains_key(id) {
            let _ = self.stop_process(id);
            self.processes.remove(id);
            self.save_to_disk()?;
            Ok(())
        } else {
            Err(crate::error::KutorError::ProcessNotFound(id.to_string()))
        }
    }

    pub fn get_process(&self, id: &str) -> Result<ProcessView, crate::error::KutorError> {
        self.processes.get(id)
            .map(ProcessView::from)
            .ok_or_else(|| crate::error::KutorError::ProcessNotFound(id.to_string()))
    }
}
```

- [ ] **Step 2: Run tests**

Run: `cd src-tauri && cargo test process_manager --no-fail-fast`

Expected: Tests pass

- [ ] **Step 3: Commit operations**

Run: `git add src-tauri/src/process_manager.rs`

Run: `git commit -m "feat: add start/stop/restart/delete operations to ProcessManager"`

---

## Task 7: Implement Tauri Commands

**Files:**
- Create: `src-tauri/src/commands.rs`

- [ ] **Step 1: Write commands module**

Create `src-tauri/src/commands.rs`:

```rust
use std::sync::{Arc, Mutex};
use tauri::State;
use crate::process_manager::{ProcessManager, ProcessView};
use crate::error::KutorError;

#[tauri::command]
pub fn create_process(
    name: String,
    command: String,
    working_directory: String,
    state: State<'_, Arc<Mutex<ProcessManager>>>,
) -> Result<String, KutorError> {
    let mut manager = state.lock().map_err(|_| KutorError::IoError("Failed to lock manager".to_string()))?;
    manager.create_process(name, command, working_directory)
}

#[tauri::command]
pub fn start_process(
    id: String,
    state: State<'_, Arc<Mutex<ProcessManager>>>,
) -> Result<(), KutorError> {
    let mut manager = state.lock().map_err(|_| KutorError::IoError("Failed to lock manager".to_string()))?;
    manager.start_process(&id)
}

#[tauri::command]
pub fn stop_process(
    id: String,
    state: State<'_, Arc<Mutex<ProcessManager>>>,
) -> Result<(), KutorError> {
    let mut manager = state.lock().map_err(|_| KutorError::IoError("Failed to lock manager".to_string()))?;
    manager.stop_process(&id)
}

#[tauri::command]
pub fn restart_process(
    id: String,
    state: State<'_, Arc<Mutex<ProcessManager>>>,
) -> Result<(), KutorError> {
    let mut manager = state.lock().map_err(|_| KutorError::IoError("Failed to lock manager".to_string()))?;
    manager.restart_process(&id)
}

#[tauri::command]
pub fn delete_process(
    id: String,
    state: State<'_, Arc<Mutex<ProcessManager>>>,
) -> Result<(), KutorError> {
    let mut manager = state.lock().map_err(|_| KutorError::IoError("Failed to lock manager".to_string()))?;
    manager.delete_process(&id)
}

#[tauri::command]
pub fn get_all_processes(
    state: State<'_, Arc<Mutex<ProcessManager>>>,
) -> Result<Vec<ProcessView>, KutorError> {
    let manager = state.lock().map_err(|_| KutorError::IoError("Failed to lock manager".to_string()))?;
    Ok(manager.get_all_processes())
}
```

- [ ] **Step 2: Commit commands**

Run: `git add src-tauri/src/commands.rs`

Run: `git commit -m "feat: add Tauri IPC command handlers"`

---

## Task 8: Implement Tauri Service Layer

**Files:**
- Create: `src/services/tauri-service.ts`

- [ ] **Step 1: Create tauri-service**

Create `src/services/tauri-service.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core'
import type { Process, CreateProcessParams } from '../types/process'

export async function createProcess(params: CreateProcessParams): Promise<string> {
  return invoke<string>('create_process', {
    name: params.name,
    command: params.command,
    workingDirectory: params.working_directory,
  })
}

export async function startProcess(id: string): Promise<void> {
  return invoke('start_process', { id })
}

export async function stopProcess(id: string): Promise<void> {
  return invoke('stop_process', { id })
}

export async function restartProcess(id: string): Promise<void> {
  return invoke('restart_process', { id })
}

export async function deleteProcess(id: string): Promise<void> {
  return invoke('delete_process', { id })
}

export async function getAllProcesses(): Promise<Process[]> {
  return invoke('get_all_processes')
}
```

- [ ] **Step 2: Install Tauri API**

Run: `npm install @tauri-apps/api`

- [ ] **Step 3: Commit service layer**

Run: `git add src/services/tauri-service.ts package.json package-lock.json`

Run: `git commit -m "feat: add Tauri service layer for IPC"`

---

## Task 9: Implement React Query Hooks

**Files:**
- Create: `src/hooks/use-processes.ts`
- Create: `src/hooks/use-create-process.ts`
- Create: `src/hooks/use-start-process.ts`
- Create: `src/hooks/use-stop-process.ts`
- Create: `src/hooks/use-restart-process.ts`
- Create: `src/hooks/use-delete-process.ts`

- [ ] **Step 1: Create useProcesses hook**

Create `src/hooks/use-processes.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { getAllProcesses } from '../services/tauri-service'
import type { Process } from '../types/process'

export function useProcesses() {
  return useQuery<Process[]>({
    queryKey: ['processes'],
    queryFn: getAllProcesses,
    refetchInterval: 1000,
  })
}
```

- [ ] **Step 2: Create useCreateProcess hook**

Create `src/hooks/use-create-process.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createProcess } from '../services/tauri-service'
import type { CreateProcessParams } from '../types/process'

export function useCreateProcess() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createProcess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] })
    },
  })
}
```

- [ ] **Step 3: Create useStartProcess hook**

Create `src/hooks/use-start-process.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { startProcess } from '../services/tauri-service'

export function useStartProcess() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: startProcess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] })
    },
  })
}
```

- [ ] **Step 4: Create useStopProcess hook**

Create `src/hooks/use-stop-process.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { stopProcess } from '../services/tauri-service'

export function useStopProcess() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: stopProcess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] })
    },
  })
}
```

- [ ] **Step 5: Create useRestartProcess hook**

Create `src/hooks/use-restart-process.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { restartProcess } from '../services/tauri-service'

export function useRestartProcess() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: restartProcess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] })
    },
  })
}
```

- [ ] **Step 6: Create useDeleteProcess hook**

Create `src/hooks/use-delete-process.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteProcess } from '../services/tauri-service'

export function useDeleteProcess() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteProcess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] })
    },
  })
}
```

- [ ] **Step 7: Commit hooks**

Run: `git add src/hooks/`

Run: `git commit -m "feat: add React Query hooks for process operations"`

---

## Task 10: Implement React Entry Point and App

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`

- [ ] **Step 1: Create main entry point**

Create `src/main.tsx`:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
```

- [ ] **Step 2: Create App component**

Create `src/App.tsx`:

```typescript
import Home from './pages/home'

function App() {
  return <Home />
}

export default App
```

- [ ] **Step 3: Commit entry point**

Run: `git add src/main.tsx src/App.tsx`

Run: `git commit -m "feat: add React entry point and App component"`

---

## Task 11: Implement Process Table and Row Components

**Files:**
- Create: `src/components/process-table.tsx`
- Create: `src/components/process-row.tsx`

- [ ] **Step 1: Create ProcessRow component**

Create `src/components/process-row.tsx`:

```typescript
import type { Process } from '../types/process'

interface ProcessRowProps {
  process: Process
  onStart: (id: string) => void
  onStop: (id: string) => void
  onRestart: (id: string) => void
  onDelete: (id: string) => void
}

export function ProcessRow({ process, onStart, onStop, onRestart, onDelete }: ProcessRowProps) {
  const isRunning = process.status === 'running'
  const isStopped = process.status === 'stopped'
  const isCrashed = process.status === 'crashed'

  return (
    <tr>
      <td>{process.name}</td>
      <td style={{ color: isRunning ? 'green' : isCrashed ? 'red' : 'gray' }}>
        {process.status}
        {process.error_message && <span title={process.error_message}> (error)</span>}
      </td>
      <td>{process.working_directory}</td>
      <td>
        <button onClick={() => onStart(process.id)} disabled={!isStopped && !isCrashed}>
          Start
        </button>
        <button onClick={() => onStop(process.id)} disabled={!isRunning}>
          Stop
        </button>
        <button onClick={() => onRestart(process.id)} disabled={!isRunning}>
          Restart
        </button>
        <button onClick={() => onDelete(process.id)}>
          Delete
        </button>
      </td>
    </tr>
  )
}
```

- [ ] **Step 2: Create ProcessTable component**

Create `src/components/process-table.tsx`:

```typescript
import { useProcesses } from '../hooks/use-processes'
import { useStartProcess } from '../hooks/use-start-process'
import { useStopProcess } from '../hooks/use-stop-process'
import { useRestartProcess } from '../hooks/use-restart-process'
import { useDeleteProcess } from '../hooks/use-delete-process'
import { ProcessRow } from './process-row'

export function ProcessTable() {
  const { data: processes, isLoading, error } = useProcesses()
  const startMutation = useStartProcess()
  const stopMutation = useStopProcess()
  const restartMutation = useRestartProcess()
  const deleteMutation = useDeleteProcess()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Directory</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {processes?.map((process) => (
          <ProcessRow
            key={process.id}
            process={process}
            onStart={(id) => startMutation.mutate(id)}
            onStop={(id) => stopMutation.mutate(id)}
            onRestart={(id) => restartMutation.mutate(id)}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 3: Commit components**

Run: `git add src/components/`

Run: `git commit -m "feat: add ProcessTable and ProcessRow components"`

---

## Task 12: Implement Home Page

**Files:**
- Create: `src/pages/home.tsx`

- [ ] **Step 1: Create Home page**

Create `src/pages/home.tsx`:

```typescript
import { open } from '@tauri-apps/plugin-dialog'
import { ProcessTable } from '../components/process-table'
import { useCreateProcess } from '../hooks/use-create-process'
import { useState } from 'react'

export default function Home() {
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [workingDirectory, setWorkingDirectory] = useState('')
  const createMutation = useCreateProcess()

  const handleBrowse = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    })
    if (selected) {
      setWorkingDirectory(selected as string)
    }
  }

  const handleCreate = () => {
    if (!name || !command || !workingDirectory) {
      alert('All fields are required')
      return
    }

    createMutation.mutate(
      { name, command, working_directory: workingDirectory },
      {
        onSuccess: () => {
          setName('')
          setCommand('')
          setWorkingDirectory('')
        },
        onError: (error) => {
          alert(`Failed to create process: ${error}`)
        },
      }
    )
  }

  return (
    <div>
      <h1>Kutor</h1>
      
      <div>
        <h2>Create Process</h2>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Command"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
        />
        <input
          type="text"
          placeholder="Working Directory"
          value={workingDirectory}
          onChange={(e) => setWorkingDirectory(e.target.value)}
        />
        <button onClick={handleBrowse}>Browse</button>
        <button onClick={handleCreate}>Create</button>
      </div>

      <h2>Processes</h2>
      <ProcessTable />
    </div>
  )
}
```

- [ ] **Step 2: Install Tauri dialog plugin**

Run: `npm install @tauri-apps/plugin-dialog`

- [ ] **Step 3: Commit home page**

Run: `git add src/pages/home.tsx package.json package-lock.json`

Run: `git commit -m "feat: add Home page with process creation form"`

---

## Task 13: Add Create Process Window

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src/pages/home.tsx`
- Create: `src/pages/create-process.tsx`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update main.tsx to handle multiple windows**

Modify `src/main.tsx`:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getCurrentWindow } from '@tauri-apps/api/window'
import App from './App'
import CreateProcess from './pages/create-process'

const queryClient = new QueryClient()

async function main() {
  const window = getCurrentWindow()
  const label = window.label
  
  const root = ReactDOM.createRoot(document.getElementById('root')!)
  
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        {label === 'main' ? <App /> : <CreateProcess />}
      </QueryClientProvider>
    </React.StrictMode>
  )
}

main()
```

- [ ] **Step 2: Create CreateProcess page**

Create `src/pages/create-process.tsx`:

```typescript
import { open } from '@tauri-apps/plugin-dialog'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useCreateProcess } from '../hooks/use-create-process'
import { useState } from 'react'

export default function CreateProcess() {
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [workingDirectory, setWorkingDirectory] = useState('')
  const createMutation = useCreateProcess()

  const handleBrowse = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    })
    if (selected) {
      setWorkingDirectory(selected as string)
    }
  }

  const handleOk = () => {
    if (!name || !command || !workingDirectory) {
      alert('All fields are required')
      return
    }

    createMutation.mutate(
      { name, command, working_directory: workingDirectory },
      {
        onSuccess: () => {
          getCurrentWindow().close()
        },
        onError: (error) => {
          alert(`Failed to create process: ${error}`)
        },
      }
    )
  }

  const handleCancel = () => {
    getCurrentWindow().close()
  }

  return (
    <div>
      <h2>Create Process</h2>
      
      <div>
        <label>Name:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      
      <div>
        <label>Command:</label>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
        />
      </div>
      
      <div>
        <label>Working Directory:</label>
        <input
          type="text"
          value={workingDirectory}
          onChange={(e) => setWorkingDirectory(e.target.value)}
        />
        <button onClick={handleBrowse}>Browse</button>
      </div>
      
      <div>
        <button onClick={handleOk}>OK</button>
        <button onClick={handleCancel}>Cancel</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update home.tsx to open new window**

Modify `src/pages/home.tsx`:

```typescript
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { ProcessTable } from '../components/process-table'

export default function Home() {
  const handleCreateProcess = async () => {
    const webview = new WebviewWindow('create-process', {
      url: '/',
      title: 'Create Process',
      width: 400,
      height: 300,
    })
    await webview.once('tauri://created', () => {
      console.log('Create process window created')
    })
    await webview.once('tauri://error', (e) => {
      console.error('Failed to create window:', e)
    })
  }

  return (
    <div>
      <h1>Kutor</h1>
      <button onClick={handleCreateProcess}>Create Process</button>
      <h2>Processes</h2>
      <ProcessTable />
    </div>
  )
}
```

- [ ] **Step 4: Install Tauri window API**

Run: `npm install @tauri-apps/api`

- [ ] **Step 5: Commit create process window**

Run: `git add src/main.tsx src/App.tsx src/pages/home.tsx src/pages/create-process.tsx package.json package-lock.json`

Run: `git commit -m "feat: add separate create process window"`

---

## Task 14: Add Basic Styling

**Files:**
- Create: `src/style.css`

- [ ] **Step 1: Create basic stylesheet**

Create `src/style.css`:

```css
* {
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  margin: 16px;
}

h1, h2 {
  margin-bottom: 16px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

th {
  background-color: #f2f2f2;
}

button {
  margin-right: 4px;
  padding: 4px 12px;
}

input {
  margin-right: 8px;
  padding: 4px 8px;
}
```

- [ ] **Step 2: Import stylesheet in main.tsx**

Modify `src/main.tsx` to add import:

```typescript
import './style.css'
```

- [ ] **Step 3: Commit styling**

Run: `git add src/style.css src/main.tsx`

Run: `git commit -m "feat: add basic CSS styling"`

---

## Task 15: Add NPM Scripts and Test Build

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add npm scripts**

Modify `package.json` to add scripts section:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  }
}
```

- [ ] **Step 2: Test build**

Run: `npm run build`

Expected: Build completes without errors

- [ ] **Step 3: Commit npm scripts**

Run: `git add package.json`

Run: `git commit -m "chore: add npm scripts for build and dev"`

---

## Task 16: Test Tauri Build

**Files:**
- None (verification only)

- [ ] **Step 1: Verify Tauri builds**

Run: `cd src-tauri && cargo build`

Expected: Cargo build completes without errors

- [ ] **Step 2: Commit any fixes**

If fixes were needed:

Run: `git add . && git commit -m "fix: resolve Tauri build issues"`

---

## Task 17: Add Loading Persistence on Startup

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Load processes from disk on startup**

Modify `src-tauri/src/lib.rs`:

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_handle = app.handle();
            let config_path = app_handle.path().app_data_dir()
                .expect("Failed to get app data directory")
                .join("processes.json");
            
            let mut manager = ProcessManager::new(config_path);
            if let Err(e) = manager.load_from_disk() {
                eprintln!("Warning: Failed to load processes from disk: {}", e);
            }
            
            app.manage(Arc::new(Mutex::new(manager)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_process,
            commands::start_process,
            commands::stop_process,
            commands::restart_process,
            commands::delete_process,
            commands::get_all_processes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: Commit persistence loading**

Run: `git add src-tauri/src/lib.rs`

Run: `git commit -m "feat: load persisted processes on app startup"`

---

## Task 18: Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full Cargo test suite**

Run: `cd src-tauri && cargo test`

Expected: All tests pass

- [ ] **Step 2: Build release version**

Run: `npm run tauri build`

Expected: Build completes successfully

- [ ] **Step 3: Create final commit**

Run: `git add . && git commit -m "chore: final verification and cleanup"`