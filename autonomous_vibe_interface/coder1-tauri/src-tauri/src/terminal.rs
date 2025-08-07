use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::io::{Read, Write};
use tauri::{AppHandle, Manager};

pub struct Terminal {
    pub id: String,
    pty: Box<dyn portable_pty::MasterPty + Send>,
    writer: Box<dyn Write + Send>,
}

pub struct TerminalManager {
    terminals: Arc<Mutex<HashMap<String, Terminal>>>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            terminals: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn create_terminal(&self, id: String, app_handle: AppHandle) -> Result<String, String> {
        let pty_system = native_pty_system();
        
        let pty_pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        let mut cmd = CommandBuilder::new("bash");
        cmd.env("TERM", "xterm-256color");
        cmd.env("PATH", "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin");
        cmd.env("FORCE_COLOR", "1");

        let child = pty_pair.slave.spawn_command(cmd)
            .map_err(|e| e.to_string())?;

        let writer = pty_pair.master.take_writer()
            .map_err(|e| e.to_string())?;

        let terminal = Terminal {
            id: id.clone(),
            pty: pty_pair.master,
            writer,
        };

        // Start reading from PTY in background
        let reader = terminal.pty.try_clone_reader()
            .map_err(|e| e.to_string())?;
        
        let terminal_id = id.clone();
        let app_handle_clone = app_handle.clone();
        
        std::thread::spawn(move || {
            let mut reader = reader;
            let mut buffer = [0u8; 4096];
            
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => break, // EOF
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                        app_handle_clone.emit("terminal-output", (terminal_id.clone(), data)).ok();
                    }
                    Err(e) => {
                        eprintln!("Error reading from PTY: {}", e);
                        break;
                    }
                }
            }
        });

        self.terminals.lock().unwrap().insert(id.clone(), terminal);
        Ok(id)
    }

    pub fn write_to_terminal(&self, id: &str, data: &str) -> Result<(), String> {
        let mut terminals = self.terminals.lock().unwrap();
        
        if let Some(terminal) = terminals.get_mut(id) {
            terminal.writer.write_all(data.as_bytes())
                .map_err(|e| e.to_string())?;
            terminal.writer.flush()
                .map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Terminal not found".to_string())
        }
    }

    pub fn resize_terminal(&self, id: &str, rows: u16, cols: u16) -> Result<(), String> {
        let terminals = self.terminals.lock().unwrap();
        
        if let Some(terminal) = terminals.get(id) {
            terminal.pty.resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            }).map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Terminal not found".to_string())
        }
    }

    pub fn close_terminal(&self, id: &str) -> Result<(), String> {
        self.terminals.lock().unwrap().remove(id);
        Ok(())
    }
}