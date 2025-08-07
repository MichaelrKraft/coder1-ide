use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub struct PtySession {
    pub id: String,
    writer: Box<dyn Write + Send>,
    _reader_thread: std::thread::JoinHandle<()>,
    created_at: Instant,
    last_activity: Arc<Mutex<Instant>>,
}

#[derive(Clone, serde::Serialize)]
struct TerminalOutput {
    id: String,
    data: String,
}

#[derive(Clone, serde::Serialize)]
struct TerminalError {
    id: String,
    error: String,
    suggestion: String,
}

pub struct PtyManager {
    sessions: Arc<Mutex<std::collections::HashMap<String, PtySession>>>,
    max_sessions: usize,
    retry_attempts: u32,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(std::collections::HashMap::new())),
            max_sessions: 10,
            retry_attempts: 3,
        }
    }

    // Enhanced PTY creation with retry logic
    fn create_pty_with_retry(&self, size: PtySize) -> Result<portable_pty::PtyPair, String> {
        let mut last_error = String::new();
        
        for attempt in 0..self.retry_attempts {
            if attempt > 0 {
                // Exponential backoff
                let wait_time = Duration::from_millis(100 * 2_u64.pow(attempt));
                std::thread::sleep(wait_time);
                eprintln!("Retrying PTY creation, attempt {}", attempt + 1);
            }
            
            match native_pty_system().openpty(size) {
                Ok(pty_pair) => {
                    eprintln!("PTY created successfully on attempt {}", attempt + 1);
                    return Ok(pty_pair);
                }
                Err(e) => {
                    last_error = e.to_string();
                    eprintln!("PTY creation attempt {} failed: {}", attempt + 1, last_error);
                    
                    // Check for specific macOS errors
                    if last_error.contains("forkpty") || last_error.contains("Resource temporarily unavailable") {
                        eprintln!("💡 This appears to be a PTY exhaustion issue.");
                        eprintln!("   On macOS, try: sudo sysctl -w kern.tty.ptmx_max=768");
                    }
                }
            }
        }
        
        Err(format!("Failed to create PTY after {} attempts: {}", self.retry_attempts, last_error))
    }

    pub fn create_session(&self, app: AppHandle) -> Result<String, String> {
        // Check session limit
        {
            let sessions = self.sessions.lock().unwrap();
            if sessions.len() >= self.max_sessions {
                // Try to clean up old sessions first
                drop(sessions);
                self.cleanup_idle_sessions(Duration::from_secs(1800)); // 30 minutes
                
                let sessions = self.sessions.lock().unwrap();
                if sessions.len() >= self.max_sessions {
                    return Err(format!("Maximum number of sessions ({}) reached", self.max_sessions));
                }
            }
        }
        
        // Create PTY with retry logic
        let pty_pair = self.create_pty_with_retry(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })?;

        // Get the shell
        let shell = if cfg!(target_os = "windows") {
            "cmd.exe".to_string()
        } else {
            std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
        };

        // Build the command
        let cmd = CommandBuilder::new(&shell);
        
        // Spawn the shell
        let _child = pty_pair.slave.spawn_command(cmd).map_err(|e| {
            let error_msg = e.to_string();
            let suggestion = if error_msg.contains("forkpty") {
                "PTY limit reached. Try: sudo sysctl -w kern.tty.ptmx_max=768"
            } else if error_msg.contains("Resource temporarily unavailable") {
                "Close some terminal sessions or restart the application"
            } else {
                "Check system resources and permissions"
            };
            
            // Emit error to frontend
            app.emit("terminal-error", TerminalError {
                id: String::new(),
                error: error_msg.clone(),
                suggestion: suggestion.to_string(),
            }).ok();
            
            error_msg
        })?;
        
        // Get reader and writer
        let reader = pty_pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = pty_pair.master.take_writer().map_err(|e| e.to_string())?;
        
        // Generate session ID
        let session_id = uuid::Uuid::new_v4().to_string();
        let session_id_clone = session_id.clone();
        let last_activity = Arc::new(Mutex::new(Instant::now()));
        let last_activity_clone = Arc::clone(&last_activity);
        
        // Start reader thread
        let reader_thread = std::thread::spawn(move || {
            let mut reader = reader;
            let mut buffer = [0u8; 4096]; // Larger buffer for better performance
            
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => break, // EOF
                    Ok(n) => {
                        // Update last activity
                        *last_activity_clone.lock().unwrap() = Instant::now();
                        
                        let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                        
                        // Emit the data to the frontend
                        app.emit("terminal-output", TerminalOutput {
                            id: session_id_clone.clone(),
                            data,
                        }).ok();
                    }
                    Err(e) => {
                        eprintln!("Error reading from PTY: {}", e);
                        break;
                    }
                }
            }
        });
        
        // Create session
        let session = PtySession {
            id: session_id.clone(),
            writer: Box::new(writer),
            _reader_thread: reader_thread,
            created_at: Instant::now(),
            last_activity,
        };
        
        // Store session
        self.sessions.lock().unwrap().insert(session_id.clone(), session);
        
        // Send success message
        eprintln!("✅ PTY session created: {}", session_id);
        eprintln!("   Active sessions: {}", self.sessions.lock().unwrap().len());
        
        Ok(session_id)
    }

    pub fn write_to_session(&self, session_id: &str, data: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        
        if let Some(session) = sessions.get_mut(session_id) {
            // Update last activity
            *session.last_activity.lock().unwrap() = Instant::now();
            
            session.writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
            session.writer.flush().map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }

    pub fn resize_session(&self, session_id: &str, rows: u16, cols: u16) -> Result<(), String> {
        // Update last activity
        if let Some(session) = self.sessions.lock().unwrap().get(session_id) {
            *session.last_activity.lock().unwrap() = Instant::now();
        }
        
        // TODO: Implement PTY resizing
        // This requires keeping a reference to the PTY master
        eprintln!("PTY resize requested: {} rows, {} cols (not yet implemented)", rows, cols);
        Ok(())
    }

    pub fn close_session(&self, session_id: &str) -> Result<(), String> {
        if let Some(_session) = self.sessions.lock().unwrap().remove(session_id) {
            eprintln!("✅ PTY session closed: {}", session_id);
            eprintln!("   Active sessions: {}", self.sessions.lock().unwrap().len());
            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }

    // Clean up idle sessions
    pub fn cleanup_idle_sessions(&self, idle_duration: Duration) {
        let mut sessions = self.sessions.lock().unwrap();
        let now = Instant::now();
        
        let idle_sessions: Vec<String> = sessions
            .iter()
            .filter_map(|(id, session)| {
                let last_activity = *session.last_activity.lock().unwrap();
                if now.duration_since(last_activity) > idle_duration {
                    Some(id.clone())
                } else {
                    None
                }
            })
            .collect();
        
        for session_id in idle_sessions {
            sessions.remove(&session_id);
            eprintln!("🧹 Cleaned up idle session: {}", session_id);
        }
        
        if !sessions.is_empty() {
            eprintln!("   Active sessions after cleanup: {}", sessions.len());
        }
    }

    // Get session statistics
    pub fn get_stats(&self) -> serde_json::Value {
        let sessions = self.sessions.lock().unwrap();
        let now = Instant::now();
        
        let session_info: Vec<serde_json::Value> = sessions
            .iter()
            .map(|(id, session)| {
                let last_activity = *session.last_activity.lock().unwrap();
                serde_json::json!({
                    "id": id,
                    "age_seconds": now.duration_since(session.created_at).as_secs(),
                    "idle_seconds": now.duration_since(last_activity).as_secs(),
                })
            })
            .collect();
        
        serde_json::json!({
            "active_sessions": sessions.len(),
            "max_sessions": self.max_sessions,
            "sessions": session_info,
            "platform": std::env::consts::OS,
            "shell": std::env::var("SHELL").unwrap_or_else(|_| "unknown".to_string()),
        })
    }
}

// Cleanup task that runs periodically
pub fn start_cleanup_task(pty_manager: Arc<PtyManager>) {
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_secs(300)); // Every 5 minutes
            pty_manager.cleanup_idle_sessions(Duration::from_secs(1800)); // 30 minute idle timeout
        }
    });
}