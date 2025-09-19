#!/usr/bin/env node

/**
 * Coder1 Companion Service
 * 
 * Bridges web-based Coder1 IDE with local Claude Code installation
 * Provides real-time file sync, command routing, and session management
 */

const { CompanionServer } = require('./core/CompanionServer');
const { SecurityManager } = require('./core/SecurityManager');
const { Logger } = require('./utils/Logger');
const { Config } = require('./core/Config');
const { PreflightChecker } = require('./utils/PreflightChecker');
const path = require('path');
const fs = require('fs');

class Coder1Companion {
  constructor() {
    this.logger = new Logger('Coder1Companion');
    this.config = new Config();
    this.server = null;
    this.security = null;
    this.isShuttingDown = false;
  }

  async start() {
    try {
      this.logger.info('🚀 Starting Coder1 Companion Service...');
      
      // Step 1: Run preflight checks
      await this.runPreflightChecks();
      
      // Step 2: Initialize security manager
      this.security = new SecurityManager({
        allowedOrigins: this.config.get('security.allowedOrigins'),
        jwtSecret: this.config.get('security.jwtSecret'),
        rateLimiting: this.config.get('security.rateLimiting')
      });
      
      // Step 3: Find available port
      const port = await this.findAvailablePort([57132, 57133, 57134, 57135]);
      
      // Step 4: Start companion server
      this.server = new CompanionServer({
        port,
        security: this.security,
        logger: this.logger.createChild('Server'),
        config: this.config
      });
      
      await this.server.start();
      
      // Step 5: Setup graceful shutdown
      this.setupGracefulShutdown();
      
      this.logger.success(`✅ Coder1 Companion Service running on port ${port}`);
      this.logger.info(`🌐 Web IDEs can connect via: ws://localhost:${port}`);
      this.logger.info(`🔒 Security: ${this.config.get('security.allowedOrigins').join(', ')}`);
      
      // Step 6: Create connection file for IDE detection
      await this.createConnectionFile(port);
      
      return { port, status: 'running' };
      
    } catch (error) {
      this.logger.error('❌ Failed to start Coder1 Companion Service:', error);
      process.exit(1);
    }
  }

  async runPreflightChecks() {
    const checker = new PreflightChecker(this.logger);
    
    this.logger.info('🔍 Running preflight checks...');
    
    const checks = [
      { name: 'Claude Code Installation', check: () => checker.checkClaudeCode() },
      { name: 'Node.js Version', check: () => checker.checkNodeVersion() },
      { name: 'File Permissions', check: () => checker.checkFilePermissions() },
      { name: 'Port Availability', check: () => checker.checkPorts([57132, 57133, 57134]) },
      { name: 'Git Installation', check: () => checker.checkGit() }
    ];
    
    for (const { name, check } of checks) {
      try {
        const result = await check();
        if (result.success) {
          this.logger.success(`✅ ${name}: ${result.message || 'OK'}`);
        } else {
          this.logger.warn(`⚠️  ${name}: ${result.message}`);
          if (result.critical) {
            throw new Error(`Critical preflight check failed: ${name}`);
          }
        }
      } catch (error) {
        this.logger.error(`❌ ${name}: ${error.message}`);
        throw error;
      }
    }
  }

  async findAvailablePort(candidates) {
    const net = require('net');
    
    for (const port of candidates) {
      try {
        await new Promise((resolve, reject) => {
          const server = net.createServer();
          server.listen(port, '127.0.0.1', () => {
            server.close(() => resolve());
          });
          server.on('error', reject);
        });
        return port;
      } catch (error) {
        this.logger.debug(`Port ${port} not available, trying next...`);
      }
    }
    
    throw new Error(`No available ports found in range: ${candidates.join(', ')}`);
  }

  async createConnectionFile(port) {
    const connectionInfo = {
      version: require('../package.json').version,
      port: port,
      pid: process.pid,
      startTime: new Date().toISOString(),
      security: {
        allowedOrigins: this.config.get('security.allowedOrigins')
      }
    };
    
    const connectionPath = path.join(require('os').homedir(), '.coder1-companion');
    await fs.promises.mkdir(path.dirname(connectionPath), { recursive: true });
    await fs.promises.writeFile(connectionPath, JSON.stringify(connectionInfo, null, 2));
    
    this.logger.debug(`📄 Connection file created at: ${connectionPath}`);
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      
      this.logger.info(`🛑 Received ${signal}, shutting down gracefully...`);
      
      try {
        if (this.server) {
          await this.server.stop();
        }
        
        // Clean up connection file
        const connectionPath = path.join(require('os').homedir(), '.coder1-companion');
        try {
          await fs.promises.unlink(connectionPath);
        } catch (error) {
          // File might not exist, ignore
        }
        
        this.logger.info('✅ Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        this.logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon
  }
}

// CLI Entry Point
if (require.main === module) {
  const companion = new Coder1Companion();
  companion.start().catch(error => {
    console.error('Failed to start Coder1 Companion:', error);
    process.exit(1);
  });
}

module.exports = { Coder1Companion };