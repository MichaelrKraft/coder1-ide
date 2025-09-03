#!/usr/bin/env node

/**
 * Startup Sequence Enforcement System
 * Ensures services start in correct order with proper ports to prevent terminal session loss
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

class StartupSequenceManager {
  constructor() {
    this.processes = [];
    this.config = {
      EXPRESS_PORT: 3000,
      NEXTJS_PORT: 3001,
      STARTUP_TIMEOUT: 30000,
      HEALTH_CHECK_TIMEOUT: 5000
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : '✅';
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async checkPort(port) {
    return new Promise((resolve) => {
      const server = http.createServer();
      server.listen(port, () => {
        server.close();
        resolve({ available: true, port });
      });
      server.on('error', () => {
        resolve({ available: false, port });
      });
    });
  }

  async killPortProcesses(port) {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, (error) => {
        // Ignore errors, just resolve
        setTimeout(resolve, 1000);
      });
    });
  }

  async waitForService(port, timeout = this.config.HEALTH_CHECK_TIMEOUT) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const portCheck = await this.checkPort(port);
      if (!portCheck.available) {
        this.log(`Service detected on port ${port}`);
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error(`Service on port ${port} failed to start within ${timeout}ms`);
  }

  async startExpressBackend() {
    this.log('Starting Express backend on port 3000...');
    
    // Ensure port is free
    await this.killPortProcesses(this.config.EXPRESS_PORT);
    
    const expressProcess = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: this.config.EXPRESS_PORT.toString() },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    expressProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('running on port 3000')) {
        this.log('Express backend started successfully');
      }
      // Log to file instead of console to avoid spam
      fs.appendFileSync('logs/express.log', output);
    });

    expressProcess.stderr.on('data', (data) => {
      fs.appendFileSync('logs/express-error.log', data.toString());
    });

    this.processes.push({ name: 'express', process: expressProcess });
    
    // Wait for Express to be ready
    await this.waitForService(this.config.EXPRESS_PORT);
    return expressProcess;
  }

  async startNextJS() {
    this.log('Starting Next.js frontend on port 3001...');
    
    // Ensure port is free
    await this.killPortProcesses(this.config.NEXTJS_PORT);
    
    const nextProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(process.cwd(), 'coder1-ide-next'),
      env: { ...process.env, PORT: this.config.NEXTJS_PORT.toString() },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    nextProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready in')) {
        this.log('Next.js frontend started successfully');
      }
      fs.appendFileSync('logs/nextjs.log', output);
    });

    nextProcess.stderr.on('data', (data) => {
      fs.appendFileSync('logs/nextjs-error.log', data.toString());
    });

    this.processes.push({ name: 'nextjs', process: nextProcess });
    
    // Wait for Next.js to be ready
    await this.waitForService(this.config.NEXTJS_PORT);
    return nextProcess;
  }

  async validateConfiguration() {
    this.log('Validating port configuration...');
    
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const validator = spawn('node', ['scripts/validate-ports.js'], {
        stdio: 'pipe'
      });
      
      let output = '';
      validator.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      validator.on('close', (code) => {
        if (code === 0) {
          this.log('Port configuration validation passed');
          resolve();
        } else {
          this.log('Port configuration validation failed', 'error');
          console.log(output);
          reject(new Error('Configuration validation failed'));
        }
      });
    });
  }

  setupGracefulShutdown() {
    const shutdown = (signal) => {
      this.log(`Received ${signal}, shutting down gracefully...`);
      
      this.processes.forEach(({ name, process }) => {
        this.log(`Stopping ${name}...`);
        process.kill('SIGTERM');
      });
      
      setTimeout(() => {
        this.processes.forEach(({ name, process }) => {
          if (!process.killed) {
            this.log(`Force killing ${name}...`);
            process.kill('SIGKILL');
          }
        });
        process.exit(0);
      }, 5000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  async run() {
    try {
      // Create logs directory
      if (!fs.existsSync('logs')) {
        fs.mkdirSync('logs');
      }

      this.log('🚀 Starting Coder1 IDE with enforced startup sequence...');
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      // Validate configuration before starting
      await this.validateConfiguration();
      
      // Start services in sequence
      await this.startExpressBackend();
      this.log('✅ Express backend ready - terminal sessions will work');
      
      await this.startNextJS();
      this.log('✅ Next.js frontend ready - IDE accessible at http://localhost:3001');
      
      this.log('🎉 All services started successfully!');
      this.log('   Backend: http://localhost:3000 (APIs, terminals)');
      this.log('   Frontend: http://localhost:3001 (IDE interface)');
      
      // Run final validation
      setTimeout(async () => {
        try {
          await this.validateConfiguration();
          this.log('✅ Post-startup validation passed - system is stable');
        } catch (error) {
          this.log('⚠️ Post-startup validation failed - may have issues', 'warning');
        }
      }, 3000);
      
      // Keep the process alive
      await new Promise(() => {});
      
    } catch (error) {
      this.log(`Startup sequence failed: ${error.message}`, 'error');
      this.processes.forEach(({ process }) => {
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      });
      process.exit(1);
    }
  }
}

// CLI usage
if (require.main === module) {
  const manager = new StartupSequenceManager();
  manager.run().catch(error => {
    console.error(`❌ Startup failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = StartupSequenceManager;