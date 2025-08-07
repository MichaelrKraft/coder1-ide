use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

pub struct PtySession {
    pub id: String,
    writer: Box<dyn Write + Send>,
    _reader_thread: std::thread::JoinHandle<()>,
}

#[derive(Clone, serde::Serialize)]
struct TerminalOutput {
    id: String,
    data: String,
}

pub struct PtyManager {
    sessions: Arc<Mutex<std::collections::HashMap<String, PtySession>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(std::collections::HashMap::new())),
        }
    }

    pub fn create_session(&self, app: AppHandle) -> Result<String, String> {
        let pty_system = native_pty_system();
        
        // Create a new PTY with size
        let pty_pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        // Get the shell
        let shell = if cfg!(target_os = "windows") {
            "cmd.exe".to_string()
        } else {
            std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
        };

        // Build the command
        let mut cmd = CommandBuilder::new(shell);
        
        // Spawn the shell
        let _child = pty_pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
        
        // Get reader and writer
        let reader = pty_pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = pty_pair.master.take_writer().map_err(|e| e.to_string())?;
        
        // Generate session ID
        let session_id = uuid::Uuid::new_v4().to_string();
        let session_id_clone = session_id.clone();
        
        // Start reader thread
        let reader_thread = std::thread::spawn(move || {
            let mut reader = reader;
            let mut buffer = [0u8; 1024];
            
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => break, // EOF
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                        
                        // Emit the data to the frontend
                        app.emit("terminal-output", TerminalOutput {
                            id: session_id_clone.clone(),
                            data,
                        }).ok();
                    }
                    Err(_) => break,
                }
            }
        });
        
        // Create session
        let session = PtySession {
            id: session_id.clone(),
            writer: Box::new(writer),
            _reader_thread: reader_thread,
        };
        
        // Store session
        self.sessions.lock().unwrap().insert(session_id.clone(), session);
        
        Ok(session_id)
    }

    pub fn write_to_session(&self, session_id: &str, data: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        
        if let Some(session) = sessions.get_mut(session_id) {
            session.writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
            session.writer.flush().map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }

    pub fn resize_session(&self, _session_id: &str, _rows: u16, _cols: u16) -> Result<(), String> {
        // For now, just return OK
        // TODO: Implement PTY resizing
        Ok(())
    }

    pub fn close_session(&self, session_id: &str) -> Result<(), String> {
        self.sessions.lock().unwrap().remove(session_id);
        Ok(())
    }
}