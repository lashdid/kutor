use crate::error::KutorError;
use crate::process_manager::ProcessView;
use std::sync::{Arc, Mutex};
use tauri::State;

#[tauri::command]
pub fn create_process(
    name: String,
    command: String,
    working_directory: String,
    state: State<'_, Arc<Mutex<crate::process_manager::ProcessManager>>>,
) -> Result<String, KutorError> {
    let mut manager = state
        .lock()
        .map_err(|_| KutorError::IoError("Failed to lock manager".to_string()))?;
    manager.create_process(name, command, working_directory)
}

#[tauri::command]
pub fn start_process(
    id: String,
    state: State<'_, Arc<Mutex<crate::process_manager::ProcessManager>>>,
) -> Result<(), KutorError> {
    let mut manager = state
        .lock()
        .map_err(|_| KutorError::IoError("Failed to lock manager".to_string()))?;
    manager.start_process(&id)
}

#[tauri::command]
pub fn stop_process(
    id: String,
    state: State<'_, Arc<Mutex<crate::process_manager::ProcessManager>>>,
) -> Result<(), KutorError> {
    let mut manager = state
        .lock()
        .map_err(|_| KutorError::IoError("Failed to lock manager".to_string()))?;
    manager.stop_process(&id)
}

#[tauri::command]
pub fn restart_process(
    id: String,
    state: State<'_, Arc<Mutex<crate::process_manager::ProcessManager>>>,
) -> Result<(), KutorError> {
    let mut manager = state
        .lock()
        .map_err(|_| KutorError::IoError("Failed to lock manager".to_string()))?;
    manager.restart_process(&id)
}

#[tauri::command]
pub fn delete_process(
    id: String,
    state: State<'_, Arc<Mutex<crate::process_manager::ProcessManager>>>,
) -> Result<(), KutorError> {
    let mut manager = state
        .lock()
        .map_err(|_| KutorError::IoError("Failed to lock manager".to_string()))?;
    manager.delete_process(&id)
}

#[tauri::command]
pub fn get_all_processes(
    state: State<'_, Arc<Mutex<crate::process_manager::ProcessManager>>>,
) -> Result<Vec<ProcessView>, KutorError> {
    let mut manager = state
        .lock()
        .map_err(|_| KutorError::IoError("Failed to lock manager".to_string()))?;
    Ok(manager.get_all_processes())
}
