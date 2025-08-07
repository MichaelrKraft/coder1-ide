mod pty;

use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::State;
use pty::PtyManager;

// Store for shell command output
struct ShellState {
    output: Mutex<String>,
    pty_manager: Arc<PtyManager>,
}

// Simple test command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Terminal is ready.", name)
}

// Execute shell command (simple version)
#[tauri::command]
fn execute_command(command: String, state: State<ShellState>) -> Result<String, String> {
    println!("Executing command: {}", command);
    
    // For now, just execute simple commands
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &command])
            .output()
    } else {
        Command::new("sh")
            .args(["-c", &command])
            .output()
    };

    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            
            let result = if output.status.success() {
                stdout.to_string()
            } else {
                format!("{}{}", stdout, stderr)
            };
            
            // Store output
            let mut stored = state.output.lock().unwrap();
            *stored = result.clone();
            
            Ok(result)
        }
        Err(e) => Err(format!("Failed to execute command: {}", e)),
    }
}

// PTY commands
#[tauri::command]
fn create_pty_session(state: State<ShellState>, app: tauri::AppHandle) -> Result<String, String> {
    state.pty_manager.create_session(app)
}

#[tauri::command]
fn write_to_pty(session_id: String, data: String, state: State<ShellState>) -> Result<(), String> {
    state.pty_manager.write_to_session(&session_id, &data)
}

#[tauri::command]
fn resize_pty(session_id: String, rows: u16, cols: u16, state: State<ShellState>) -> Result<(), String> {
    state.pty_manager.resize_session(&session_id, rows, cols)
}

#[tauri::command]
fn close_pty_session(session_id: String, state: State<ShellState>) -> Result<(), String> {
    state.pty_manager.close_session(&session_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      println!("Tauri app starting...");
      
      Ok(())
    })
    .manage(ShellState {
        output: Mutex::new(String::new()),
        pty_manager: Arc::new(PtyManager::new()),
    })
    .invoke_handler(tauri::generate_handler![
        greet, 
        execute_command,
        create_pty_session,
        write_to_pty,
        resize_pty,
        close_pty_session
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}