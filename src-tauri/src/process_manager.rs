use crate::error::KutorError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Child;
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::System;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProcessStatus {
    Stopped,
    Running { pid: u32, started_at: u64 },
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
    pub memory_bytes: Option<u64>,
    pub uptime_secs: Option<u64>,
}

impl From<&Process> for ProcessView {
    fn from(process: &Process) -> Self {
        let (status, error_message) = match &process.status {
            ProcessStatus::Stopped => ("stopped".to_string(), None),
            ProcessStatus::Crashed { error } => ("crashed".to_string(), Some(error.clone())),
            ProcessStatus::Running {
                pid: _,
                started_at: _,
            } => ("running".to_string(), None),
        };

        ProcessView {
            id: process.id.clone(),
            name: process.name.clone(),
            command: process.command.clone(),
            working_directory: process.working_directory.clone(),
            status,
            error_message,
            memory_bytes: None,
            uptime_secs: None,
        }
    }
}

pub struct ProcessManager {
    processes: HashMap<String, Process>,
    child_processes: HashMap<String, Child>,
    config_path: PathBuf,
    system: System,
}

impl ProcessManager {
    pub fn new(config_path: PathBuf) -> Self {
        Self {
            processes: HashMap::new(),
            child_processes: HashMap::new(),
            config_path,
            system: System::new(),
        }
    }

    pub fn create_process(
        &mut self,
        name: String,
        command: String,
        working_directory: String,
    ) -> Result<String, KutorError> {
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

    pub fn get_all_processes(&mut self) -> Vec<ProcessView> {
        let now_millis = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        self.processes
            .values()
            .map(|process| {
                let (status, error_message, memory_bytes, uptime_secs) = match &process.status {
                    ProcessStatus::Stopped => ("stopped".to_string(), None, None, None),
                    ProcessStatus::Crashed { error } => {
                        ("crashed".to_string(), Some(error.clone()), None, None)
                    }
                    ProcessStatus::Running { pid, started_at } => {
                        use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate};

                        let pid = Pid::from_u32(*pid);
                        self.system.refresh_processes_specifics(
                            ProcessesToUpdate::Some(&[pid]),
                            true,
                            ProcessRefreshKind::nothing().with_memory(),
                        );

                        let memory_bytes = self.system.process(pid).map(|p| p.memory());
                        let uptime_secs = Some((now_millis.saturating_sub(*started_at)) / 1000);

                        ("running".to_string(), None, memory_bytes, uptime_secs)
                    }
                };

                ProcessView {
                    id: process.id.clone(),
                    name: process.name.clone(),
                    command: process.command.clone(),
                    working_directory: process.working_directory.clone(),
                    status,
                    error_message,
                    memory_bytes,
                    uptime_secs,
                }
            })
            .collect()
    }

    pub fn save_to_disk(&self) -> Result<(), KutorError> {
        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let json = serde_json::to_string(&self.processes)?;
        fs::write(&self.config_path, json)?;

        Ok(())
    }

    pub fn load_from_disk(&mut self) -> Result<(), KutorError> {
        if !self.config_path.exists() {
            return Ok(());
        }

        let content = fs::read_to_string(&self.config_path)?;
        self.processes = serde_json::from_str(&content)?;

        Ok(())
    }

    #[cfg(target_os = "windows")]
    pub fn start_process(&mut self, id: &str) -> Result<(), KutorError> {
        let process = self
            .processes
            .get_mut(id)
            .ok_or_else(|| KutorError::ProcessNotFound(id.to_string()))?;

        match &process.status {
            ProcessStatus::Running { .. } => {
                return Err(KutorError::ProcessAlreadyRunning(id.to_string()));
            }
            _ => {}
        }

        let child = std::process::Command::new("cmd")
            .args(["/C", &process.command])
            .current_dir(&process.working_directory)
            .spawn()
            .map_err(|e| KutorError::SpawnFailed(e.to_string()))?;

        let pid = child.id();
        let started_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        process.status = ProcessStatus::Running { pid, started_at };
        self.child_processes.insert(id.to_string(), child);
        self.save_to_disk()?;

        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn start_process(&mut self, id: &str) -> Result<(), KutorError> {
        let process = self
            .processes
            .get_mut(id)
            .ok_or_else(|| KutorError::ProcessNotFound(id.to_string()))?;

        match &process.status {
            ProcessStatus::Running { .. } => {
                return Err(KutorError::ProcessAlreadyRunning(id.to_string()));
            }
            _ => {}
        }

        let child = std::process::Command::new("sh")
            .args(["-c", &process.command])
            .current_dir(&process.working_directory)
            .spawn()
            .map_err(|e| KutorError::SpawnFailed(e.to_string()))?;

        let pid = child.id();
        let started_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        process.status = ProcessStatus::Running { pid, started_at };
        self.child_processes.insert(id.to_string(), child);
        self.save_to_disk()?;

        Ok(())
    }

    pub fn stop_process(&mut self, id: &str) -> Result<(), KutorError> {
        let process = self
            .processes
            .get_mut(id)
            .ok_or_else(|| KutorError::ProcessNotFound(id.to_string()))?;

        match &process.status {
            ProcessStatus::Stopped => {
                return Err(KutorError::ProcessNotRunning(id.to_string()));
            }
            _ => {}
        }

        if let Some(mut child) = self.child_processes.remove(id) {
            let pid = child.id();

            #[cfg(target_os = "windows")]
            {
                let _ = std::process::Command::new("taskkill")
                    .args(["/F", "/T", "/PID", &pid.to_string()])
                    .status();
            }

            let _ = child.kill();
            let _ = child.wait();
        }

        process.status = ProcessStatus::Stopped;
        self.save_to_disk()?;

        Ok(())
    }

    pub fn restart_process(&mut self, id: &str) -> Result<(), KutorError> {
        self.stop_process(id)?;
        self.start_process(id)?;
        Ok(())
    }

    pub fn delete_process(&mut self, id: &str) -> Result<(), KutorError> {
        if self.processes.contains_key(id) {
            let _ = self.stop_process(id);
            self.processes.remove(id);
            self.save_to_disk()?;
            Ok(())
        } else {
            Err(KutorError::ProcessNotFound(id.to_string()))
        }
    }

    pub fn get_process(&mut self, id: &str) -> Result<ProcessView, KutorError> {
        let process = self
            .processes
            .get(id)
            .ok_or_else(|| KutorError::ProcessNotFound(id.to_string()))?;

        let now_millis = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        let (status, error_message, memory_bytes, uptime_secs) = match &process.status {
            ProcessStatus::Stopped => ("stopped".to_string(), None, None, None),
            ProcessStatus::Crashed { error } => {
                ("crashed".to_string(), Some(error.clone()), None, None)
            }
            ProcessStatus::Running { pid, started_at } => {
                use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate};

                let pid = Pid::from_u32(*pid);
                self.system.refresh_processes_specifics(
                    ProcessesToUpdate::Some(&[pid]),
                    true,
                    ProcessRefreshKind::nothing().with_memory(),
                );

                let memory_bytes = self.system.process(pid).map(|p| p.memory());
                let uptime_secs = Some((now_millis.saturating_sub(*started_at)) / 1000);

                ("running".to_string(), None, memory_bytes, uptime_secs)
            }
        };

        Ok(ProcessView {
            id: process.id.clone(),
            name: process.name.clone(),
            command: process.command.clone(),
            working_directory: process.working_directory.clone(),
            status,
            error_message,
            memory_bytes,
            uptime_secs,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_status_serialization() {
        let status = ProcessStatus::Running {
            pid: 12345,
            started_at: 0,
        };
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
            status: ProcessStatus::Running {
                pid: 12345,
                started_at: 0,
            },
        };

        let view = ProcessView::from(&process);
        assert_eq!(view.status, "running");
        assert_eq!(view.id, "test-id");
    }

    #[test]
    fn test_process_view_with_metrics() {
        let process = Process {
            id: "test-id".to_string(),
            name: "Test Process".to_string(),
            command: "echo test".to_string(),
            working_directory: "/tmp".to_string(),
            status: ProcessStatus::Running {
                pid: 12345,
                started_at: 1000000,
            },
        };

        let view = ProcessView::from(&process);
        assert_eq!(view.status, "running");
        assert_eq!(view.id, "test-id");
        assert!(view.memory_bytes.is_none());
        assert!(view.uptime_secs.is_none());
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

        let id = manager
            .create_process(
                "Test".to_string(),
                "echo test".to_string(),
                "/tmp".to_string(),
            )
            .unwrap();
        assert!(!id.is_empty());
        assert_eq!(manager.processes.len(), 1);
    }

    #[test]
    fn test_persistence() {
        let dir = tempfile::tempdir().unwrap();
        let config_path = dir.path().join("processes.json");

        let mut manager = ProcessManager::new(config_path.clone());
        manager
            .create_process(
                "Test".to_string(),
                "echo test".to_string(),
                "/tmp".to_string(),
            )
            .unwrap();
        manager.save_to_disk().unwrap();

        let mut manager2 = ProcessManager::new(config_path);
        manager2.load_from_disk().unwrap();

        assert_eq!(manager2.processes.len(), 1);
    }
}
