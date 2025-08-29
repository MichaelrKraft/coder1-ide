module.exports = {
  apps: [{
    name: 'coderone',
    script: './src/app.js',
    
    // Memory management
    max_memory_restart: '1G',
    
    // Restart behavior
    autorestart: true,
    watch: false,  // Disabled to prevent restart loops
    max_restarts: 10,
    min_uptime: '10s',
    
    // Environment
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      TERMINAL_SESSION_PROTECTION: 'true',
      TERMINAL_PERSIST_ON_RESTART: 'true'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      TERMINAL_SESSION_PROTECTION: 'true',
      TERMINAL_PERSIST_ON_RESTART: 'true'
    },
    
    // Graceful shutdown
    kill_timeout: 5000,  // Give 5 seconds for graceful shutdown
    wait_ready: true,
    listen_timeout: 10000,
    
    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    
    // Instance management
    instances: 1,  // Single instance for terminal sessions
    exec_mode: 'fork',  // Fork mode preserves terminal sessions better
    
    // Session protection settings
    shutdown_with_message: false,
    
    // Advanced options
    node_args: '--max-old-space-size=1024'
  }]
};