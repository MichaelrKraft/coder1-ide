module.exports = {
  apps: [{
    name: 'coderone-backend',
    script: './src/app.js',
    
    // 🚨 CRITICAL PORT VALIDATION - Prevents terminal session loss
    // This configuration MUST use port 3000 for Express backend
    // Running on port 3001 will cause conflicts with Next.js frontend
    
    // Memory management
    max_memory_restart: '1G',
    
    // Restart behavior
    autorestart: true,
    watch: false,  // Disabled to prevent restart loops
    max_restarts: 10,
    min_uptime: '10s',
    
    // Restart delay to prevent rapid restarts
    restart_delay: 5000,
    
    // Environment - PORT VALIDATION ENFORCED
    env: {
      NODE_ENV: 'development',
      PORT: 3000,  // 🚨 CRITICAL: Must be 3000 (Express backend port)
      TERMINAL_SESSION_PROTECTION: 'true',
      TERMINAL_PERSIST_ON_RESTART: 'true',
      PM2_PORT_VALIDATION: 'true'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,  // 🚨 CRITICAL: Must be 3000 (Express backend port)
      TERMINAL_SESSION_PROTECTION: 'true',
      TERMINAL_PERSIST_ON_RESTART: 'true',
      PM2_PORT_VALIDATION: 'true'
    },
    
    // Pre-startup validation script
    pre_exec: './scripts/pre-startup-validation.sh',
    
    // Post-startup health check
    health_check_url: 'http://localhost:3000/health',
    health_check_grace_period: 10000,
    
    // Graceful shutdown
    kill_timeout: 5000,  // Give 5 seconds for graceful shutdown
    wait_ready: true,
    listen_timeout: 15000,  // Increased for validation time
    
    // Enhanced logging
    error_file: './logs/pm2-backend-error.log',
    out_file: './logs/pm2-backend-out.log',
    log_file: './logs/pm2-backend-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Instance management
    instances: 1,  // Single instance for terminal sessions
    exec_mode: 'fork',  // Fork mode preserves terminal sessions better
    
    // Session protection settings
    shutdown_with_message: false,
    
    // Advanced options with port validation
    node_args: '--max-old-space-size=1024',
    
    // Monitoring and recovery
    pmx: true,
    automation: false,  // Disable keymetrics
    
    // Custom restart conditions
    max_memory_restart: '1G',
    
    // Port conflict prevention
    increment_var: 'PORT_SUFFIX',  // Don't auto-increment PORT
    
    // Additional metadata for debugging
    metadata: {
      service: 'express-backend',
      port: 3000,
      description: 'Coder1 Express Backend - APIs, WebSocket, Terminal',
      critical_notes: [
        'NEVER change PORT to 3001 - causes terminal session loss',
        'Must start before Next.js frontend on port 3001',
        'Port validation enforced in src/app.js'
      ]
    }
  }]
};