/**
 * Sandbox Preview Service
 * Manages parallel preview servers for each sandbox environment
 */

import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';

interface PreviewServer {
  sandboxId: string;
  port: number;
  process: ChildProcess | null;
  status: 'starting' | 'running' | 'stopped' | 'error';
  url: string;
  startedAt: Date;
  lastActivity: Date;
}

export class SandboxPreviewService extends EventEmitter {
  private previewServers: Map<string, PreviewServer> = new Map();
  private basePort = 4001; // Start from port 4001
  private maxPorts = 10;   // Support up to 10 parallel previews
  private usedPorts: Set<number> = new Set();

  constructor() {
    super();
    this.initialize();
  }

  private async initialize() {
    // Clean up any orphaned processes on startup
    await this.cleanupOrphanedServers();
  }

  /**
   * Start a preview server for a sandbox
   */
  async startPreviewServer(sandboxId: string, sandboxPath: string): Promise<PreviewServer> {
    // Check if preview already exists
    const existing = this.previewServers.get(sandboxId);
    if (existing && existing.status === 'running') {
      return existing;
    }

    // Find an available port
    const port = await this.findAvailablePort();
    if (!port) {
      throw new Error('No available ports for preview server');
    }

    // Create preview server record
    const server: PreviewServer = {
      sandboxId,
      port,
      process: null,
      status: 'starting',
      url: `http://localhost:${port}`,
      startedAt: new Date(),
      lastActivity: new Date()
    };

    this.previewServers.set(sandboxId, server);
    this.usedPorts.add(port);

    try {
      // Check if it's a Next.js project
      const isNextJs = await this.checkIfNextJs(sandboxPath);
      
      if (isNextJs) {
        // Start Next.js dev server
        server.process = spawn('npm', ['run', 'dev'], {
          cwd: sandboxPath,
          env: {
            ...process.env,
            PORT: port.toString(),
            NODE_ENV: 'development',
            NEXT_TELEMETRY_DISABLED: '1'
          },
          stdio: ['ignore', 'pipe', 'pipe']
        });
      } else {
        // Start a simple HTTP server for static files
        server.process = spawn('npx', ['http-server', '-p', port.toString(), '-c-1'], {
          cwd: sandboxPath,
          env: process.env,
          stdio: ['ignore', 'pipe', 'pipe']
        });
      }

      // Handle process events
      if (server.process) {
        server.process.stdout?.on('data', (data) => {
          logger.debug(`Preview ${sandboxId}: ${data}`);
          
          // Check if server is ready
          if (data.toString().includes('ready') || 
              data.toString().includes('started') ||
              data.toString().includes('listening')) {
            server.status = 'running';
            this.emit('preview:ready', { sandboxId, url: server.url });
          }
        });

        server.process.stderr?.on('data', (data) => {
          logger.error(`Preview ${sandboxId} error: ${data}`);
        });

        server.process.on('exit', (code) => {
          logger.debug(`Preview ${sandboxId} exited with code ${code}`);
          server.status = 'stopped';
          this.usedPorts.delete(port);
          this.previewServers.delete(sandboxId);
          this.emit('preview:stopped', { sandboxId });
        });

        server.process.on('error', (error) => {
          logger.error(`Preview ${sandboxId} process error:`, error);
          server.status = 'error';
          this.usedPorts.delete(port);
          this.previewServers.delete(sandboxId);
          this.emit('preview:error', { sandboxId, error });
        });
      }

      // Wait for server to be ready (with timeout)
      await this.waitForServerReady(port, 30000); // 30 second timeout
      server.status = 'running';
      
      this.emit('preview:started', { sandboxId, url: server.url });
      return server;

    } catch (error) {
      // Cleanup on error
      this.usedPorts.delete(port);
      this.previewServers.delete(sandboxId);
      throw error;
    }
  }

  /**
   * Stop a preview server
   */
  async stopPreviewServer(sandboxId: string): Promise<void> {
    const server = this.previewServers.get(sandboxId);
    if (!server) {
      return; // Already stopped
    }

    if (server.process) {
      // Try graceful shutdown first
      server.process.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (server.process && !server.process.killed) {
          server.process.kill('SIGKILL');
        }
      }, 5000);
    }

    this.usedPorts.delete(server.port);
    this.previewServers.delete(sandboxId);
    
    this.emit('preview:stopped', { sandboxId });
  }

  /**
   * Get preview server info
   */
  getPreviewServer(sandboxId: string): PreviewServer | undefined {
    return this.previewServers.get(sandboxId);
  }

  /**
   * List all active preview servers
   */
  listPreviewServers(): PreviewServer[] {
    return Array.from(this.previewServers.values());
  }

  /**
   * Find an available port
   */
  private async findAvailablePort(): Promise<number | null> {
    for (let i = 0; i < this.maxPorts; i++) {
      const port = this.basePort + i;
      if (!this.usedPorts.has(port) && await this.isPortAvailable(port)) {
        return port;
      }
    }
    return null;
  }

  /**
   * Check if a port is available
   */
  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.once('error', () => {
        resolve(false);
      });
      
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      
      server.listen(port);
    });
  }

  /**
   * Wait for server to be ready
   */
  private async waitForServerReady(port: number, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`http://localhost:${port}`);
        if (response.ok || response.status === 404) {
          // Server is responding
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      // Wait 500ms before trying again
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error(`Preview server on port ${port} did not start within ${timeout}ms`);
  }

  /**
   * Check if a directory is a Next.js project
   */
  private async checkIfNextJs(path: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      const packageJson = await fs.readFile(`${path}/package.json`, 'utf-8');
      const pkg = JSON.parse(packageJson);
      return !!(pkg.dependencies?.next || pkg.devDependencies?.next);
    } catch {
      return false;
    }
  }

  /**
   * Clean up orphaned servers on startup
   */
  private async cleanupOrphanedServers(): Promise<void> {
    // Kill any processes using our port range
    for (let i = 0; i < this.maxPorts; i++) {
      const port = this.basePort + i;
      try {
        // Check if port is in use
        if (!await this.isPortAvailable(port)) {
          // Try to kill the process using this port
          const { exec } = await import('child_process');
          exec(`lsof -ti :${port} | xargs kill -9`, (error) => {
            if (error) {
              logger.debug(`Could not kill process on port ${port}`);
            } else {
              logger.debug(`Killed orphaned process on port ${port}`);
            }
          });
        }
      } catch (error) {
        logger.debug(`Error checking port ${port}:`, error);
      }
    }
  }

  /**
   * Stop all preview servers
   */
  async stopAllServers(): Promise<void> {
    const promises = Array.from(this.previewServers.keys()).map(id => 
      this.stopPreviewServer(id)
    );
    await Promise.all(promises);
  }

  /**
   * Get metrics for all preview servers
   */
  getMetrics(): {
    total: number;
    running: number;
    ports: number[];
    servers: Array<{
      sandboxId: string;
      port: number;
      status: string;
      uptime: number;
    }>;
  } {
    const servers = Array.from(this.previewServers.values());
    const running = servers.filter(s => s.status === 'running').length;
    
    return {
      total: servers.length,
      running,
      ports: Array.from(this.usedPorts),
      servers: servers.map(s => ({
        sandboxId: s.sandboxId,
        port: s.port,
        status: s.status,
        uptime: Date.now() - s.startedAt.getTime()
      }))
    };
  }
}

// Singleton instance
let instance: SandboxPreviewService | null = null;

export function getSandboxPreviewService(): SandboxPreviewService {
  if (!instance) {
    instance = new SandboxPreviewService();
  }
  return instance;
}