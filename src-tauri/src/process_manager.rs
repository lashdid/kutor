use crate::error::KutorError;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::Child;
use std::sync::{Arc, Mutex, Weak};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use sysinfo::System;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogLine {
    pub content: String,
    pub stream: String,
}

pub struct ProcessLog {
    pub buffer: VecDeque<LogLine>,
}

impl ProcessLog {
    pub fn new() -> Self {
        Self {
            buffer: VecDeque::with_capacity(10000),
        }
    }

    pub fn push(&mut self, line: LogLine) {
        if self.buffer.len() >= 10000 {
            self.buffer.pop_front();
        }
        self.buffer.push_back(line);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProcessStatus {
    Stopped,
    Running { pid: u32, started_at: u64 },
    Crashed { error: String },
    Completed,
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
    pub pid: Option<u32>,
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
            ProcessStatus::Completed => ("completed".to_string(), None),
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
            pid: None,
        }
    }
}

pub struct ProcessManager {
    processes: HashMap<String, Process>,
    child_processes: HashMap<String, Child>,
    config_path: PathBuf,
    system: System,
    logs: Arc<Mutex<HashMap<String, ProcessLog>>>,
    app_handle: Option<AppHandle>,
    self_ref: Option<Weak<Mutex<ProcessManager>>>,
}

impl ProcessManager {
    pub fn new(config_path: PathBuf) -> Self {
        Self {
            processes: HashMap::new(),
            child_processes: HashMap::new(),
            config_path,
            system: System::new(),
            logs: Arc::new(Mutex::new(HashMap::new())),
            app_handle: None,
            self_ref: None,
        }
    }

    pub fn set_app_handle(&mut self, handle: AppHandle) {
        self.app_handle = Some(handle);
    }

    pub fn set_self_ref(&mut self, weak_ref: Weak<Mutex<ProcessManager>>) {
        self.self_ref = Some(weak_ref);
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
                let (status, error_message, memory_bytes, uptime_secs, pid) = match &process.status
                {
                    ProcessStatus::Stopped => ("stopped".to_string(), None, None, None, None),
                    ProcessStatus::Crashed { error } => {
                        ("crashed".to_string(), Some(error.clone()), None, None, None)
                    }
                    ProcessStatus::Running { pid, started_at } => {
                        use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate};

                        let sysinfo_pid = Pid::from_u32(*pid);
                        self.system.refresh_processes_specifics(
                            ProcessesToUpdate::Some(&[sysinfo_pid]),
                            true,
                            ProcessRefreshKind::nothing().with_memory(),
                        );

                        let memory_bytes = self.system.process(sysinfo_pid).map(|p| p.memory());
                        let uptime_secs = Some((now_millis.saturating_sub(*started_at)) / 1000);

                        (
                            "running".to_string(),
                            None,
                            memory_bytes,
                            uptime_secs,
                            Some(*pid),
                        )
                    }
                    ProcessStatus::Completed => ("completed".to_string(), None, None, None, None),
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
                    pid,
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

    pub fn reconcile_processes(&mut self) -> Result<(), KutorError> {
        use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate, System};

        let mut system = System::new();
        let mut needs_save = false;

        for process in self.processes.values_mut() {
            if let ProcessStatus::Running { pid, .. } = &process.status {
                system.refresh_processes_specifics(
                    ProcessesToUpdate::All,
                    true,
                    ProcessRefreshKind::nothing(),
                );

                let pid = Pid::from_u32(*pid);
                if system.process(pid).is_none() {
                    process.status = ProcessStatus::Stopped;
                    needs_save = true;
                }
            }
        }

        if needs_save {
            self.save_to_disk()?;
        }

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

        let mut child = std::process::Command::new("cmd")
            .args(["/C", &process.command])
            .current_dir(&process.working_directory)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| KutorError::SpawnFailed(e.to_string()))?;

        let pid = child.id();
        let started_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        process.status = ProcessStatus::Running { pid, started_at };

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        self.child_processes.insert(id.to_string(), child);

        if let Ok(mut logs) = self.logs.lock() {
            logs.insert(id.to_string(), ProcessLog::new());
        }

        self.save_to_disk()?;

        if let (Some(app_handle), Some(stdout), Some(stderr)) = (&self.app_handle, stdout, stderr) {
            let process_id = id.to_string();
            let logs = Arc::clone(&self.logs);
            let app_handle_stdout = app_handle.clone();
            let app_handle_stderr = app_handle.clone();

            std::thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines().flatten() {
                    if let Ok(mut logs) = logs.lock() {
                        if let Some(pl) = logs.get_mut(&process_id) {
                            pl.push(LogLine {
                                content: line.clone(),
                                stream: "stdout".to_string(),
                            });
                        }
                    }
                    let _ = app_handle_stdout.emit(
                        "process-output",
                        serde_json::json!({
                            "process_id": process_id,
                            "line": line,
                            "stream": "stdout"
                        }),
                    );
                }
            });

            let process_id = id.to_string();
            let logs = Arc::clone(&self.logs);

            std::thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines().flatten() {
                    if let Ok(mut logs) = logs.lock() {
                        if let Some(pl) = logs.get_mut(&process_id) {
                            pl.push(LogLine {
                                content: line.clone(),
                                stream: "stderr".to_string(),
                            });
                        }
                    }
                    let _ = app_handle_stderr.emit(
                        "process-output",
                        serde_json::json!({
                            "process_id": process_id,
                            "line": line,
                            "stream": "stderr"
                        }),
                    );
                }
            });

            let monitor_process_id = id.to_string();
            let monitor_self_ref = self.self_ref.clone();
            let monitor_app_handle = app_handle.clone();

            std::thread::spawn(move || loop {
                std::thread::sleep(Duration::from_millis(100));

                if let Some(self_arc) = monitor_self_ref.as_ref().and_then(|w| w.upgrade()) {
                    if let Ok(mut manager) = self_arc.lock() {
                        if let Some(child) = manager.child_processes.get_mut(&monitor_process_id) {
                            match child.try_wait() {
                                Ok(Some(status)) => {
                                    let exit_code = status.code();
                                    if let Some(process) =
                                        manager.processes.get_mut(&monitor_process_id)
                                    {
                                        if exit_code == Some(0) {
                                            process.status = ProcessStatus::Completed;
                                        } else {
                                            process.status = ProcessStatus::Crashed {
                                                error: format!(
                                                    "Process exited with code: {:?}",
                                                    exit_code
                                                ),
                                            };
                                        }
                                    }
                                    manager.child_processes.remove(&monitor_process_id);
                                    let _ = manager.save_to_disk();
                                    let _ = monitor_app_handle.emit(
                                            "process-status-change",
                                            serde_json::json!({
                                                "process_id": monitor_process_id,
                                                "status": if exit_code == Some(0) { "completed" } else { "crashed" }
                                            }),
                                        );
                                    break;
                                }
                                Ok(None) => {}
                                Err(_) => {
                                    break;
                                }
                            }
                        } else {
                            break;
                        }
                    }
                } else {
                    break;
                }
            });
        }

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

        let mut child = std::process::Command::new("sh")
            .args(["-c", &process.command])
            .current_dir(&process.working_directory)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| KutorError::SpawnFailed(e.to_string()))?;

        let pid = child.id();
        let started_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        process.status = ProcessStatus::Running { pid, started_at };

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        self.child_processes.insert(id.to_string(), child);

        if let Ok(mut logs) = self.logs.lock() {
            logs.insert(id.to_string(), ProcessLog::new());
        }

        self.save_to_disk()?;

        if let (Some(app_handle), Some(stdout), Some(stderr)) = (&self.app_handle, stdout, stderr) {
            let process_id = id.to_string();
            let logs = Arc::clone(&self.logs);
            let app_handle_stdout = app_handle.clone();
            let app_handle_stderr = app_handle.clone();

            std::thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines().flatten() {
                    if let Ok(mut logs) = logs.lock() {
                        if let Some(pl) = logs.get_mut(&process_id) {
                            pl.push(LogLine {
                                content: line.clone(),
                                stream: "stdout".to_string(),
                            });
                        }
                    }
                    let _ = app_handle_stdout.emit(
                        "process-output",
                        serde_json::json!({
                            "process_id": process_id,
                            "line": line,
                            "stream": "stdout"
                        }),
                    );
                }
            });

            let process_id = id.to_string();
            let logs = Arc::clone(&self.logs);

            std::thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines().flatten() {
                    if let Ok(mut logs) = logs.lock() {
                        if let Some(pl) = logs.get_mut(&process_id) {
                            pl.push(LogLine {
                                content: line.clone(),
                                stream: "stderr".to_string(),
                            });
                        }
                    }
                    let _ = app_handle_stderr.emit(
                        "process-output",
                        serde_json::json!({
                            "process_id": process_id,
                            "line": line,
                            "stream": "stderr"
                        }),
                    );
                }
            });

            let monitor_process_id = id.to_string();
            let monitor_self_ref = self.self_ref.clone();
            let monitor_app_handle = app_handle.clone();

            std::thread::spawn(move || loop {
                std::thread::sleep(Duration::from_millis(100));

                if let Some(self_arc) = monitor_self_ref.as_ref().and_then(|w| w.upgrade()) {
                    if let Ok(mut manager) = self_arc.lock() {
                        if let Some(child) = manager.child_processes.get_mut(&monitor_process_id) {
                            match child.try_wait() {
                                Ok(Some(status)) => {
                                    let exit_code = status.code();
                                    if let Some(process) =
                                        manager.processes.get_mut(&monitor_process_id)
                                    {
                                        if exit_code == Some(0) {
                                            process.status = ProcessStatus::Completed;
                                        } else {
                                            process.status = ProcessStatus::Crashed {
                                                error: format!(
                                                    "Process exited with code: {:?}",
                                                    exit_code
                                                ),
                                            };
                                        }
                                    }
                                    manager.child_processes.remove(&monitor_process_id);
                                    let _ = manager.save_to_disk();
                                    let _ = monitor_app_handle.emit(
                                            "process-status-change",
                                            serde_json::json!({
                                                "process_id": monitor_process_id,
                                                "status": if exit_code == Some(0) { "completed" } else { "crashed" }
                                            }),
                                        );
                                    break;
                                }
                                Ok(None) => {}
                                Err(_) => {
                                    break;
                                }
                            }
                        } else {
                            break;
                        }
                    }
                } else {
                    break;
                }
            });
        }

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

    pub fn stop_all_processes(&mut self) -> Result<(), KutorError> {
        let ids: Vec<String> = self.processes.keys().cloned().collect();
        for id in ids {
            let _ = self.stop_process(&id);
        }
        Ok(())
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

        let (status, error_message, memory_bytes, uptime_secs, pid) = match &process.status {
            ProcessStatus::Stopped => ("stopped".to_string(), None, None, None, None),
            ProcessStatus::Crashed { error } => {
                ("crashed".to_string(), Some(error.clone()), None, None, None)
            }
            ProcessStatus::Running { pid, started_at } => {
                use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate};

                let sysinfo_pid = Pid::from_u32(*pid);
                self.system.refresh_processes_specifics(
                    ProcessesToUpdate::Some(&[sysinfo_pid]),
                    true,
                    ProcessRefreshKind::nothing().with_memory(),
                );

                let memory_bytes = self.system.process(sysinfo_pid).map(|p| p.memory());
                let uptime_secs = Some((now_millis.saturating_sub(*started_at)) / 1000);

                (
                    "running".to_string(),
                    None,
                    memory_bytes,
                    uptime_secs,
                    Some(*pid),
                )
            }
            ProcessStatus::Completed => ("completed".to_string(), None, None, None, None),
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
            pid,
        })
    }

    pub fn get_process_logs(&self, id: &str) -> Result<Vec<LogLine>, KutorError> {
        let logs = self
            .logs
            .lock()
            .map_err(|_| KutorError::IoError("Failed to lock logs".to_string()))?;
        logs.get(id)
            .map(|pl| pl.buffer.iter().cloned().collect())
            .ok_or_else(|| KutorError::ProcessNotFound(id.to_string()))
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
