mod commands;
mod error;
mod process_manager;

use process_manager::ProcessManager;
use std::sync::{Arc, Mutex};
use tauri::{Manager, RunEvent};

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_handle = app.handle();
            let config_path = app_handle
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory")
                .join("processes.json");

            let mut manager = ProcessManager::new(config_path);
            if let Err(e) = manager.load_from_disk() {
                eprintln!("Warning: Failed to load processes from disk: {}", e);
            }
            if let Err(e) = manager.reconcile_processes() {
                eprintln!("Warning: Failed to reconcile processes: {}", e);
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
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(move |app_handle, event| {
        if let RunEvent::ExitRequested { .. } = event {
            if let Some(manager) = app_handle.try_state::<Arc<Mutex<ProcessManager>>>() {
                if let Ok(mut mgr) = manager.lock() {
                    let _ = mgr.stop_all_processes();
                }
            }
        }
    });
}
