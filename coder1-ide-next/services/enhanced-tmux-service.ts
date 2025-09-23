/**
 * Enhanced tmux Service - Container-like features without Docker
 * 
 * Provides:
 * - Sandbox environments for safe testing
 * - Resource limits (CPU, memory)
 * - Workspace isolation
 * - Process management
 * - Session persistence
 */

import { EventEmitter } from 'events';
import { exec, spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { getSandboxMetricsService } from './sandbox-metrics-service';
import { getSandboxPreviewService } from './sandbox-preview-service';
// Simple logger fallback for production
const logger = {
  warn: console.warn,
  error: console.error, 
  debug: console.debug
};

// Types
export interface SandboxConfig {
  userId: string;
  projectId: string;
  baseFrom?: string;  // Copy from existing workspace
  maxCpu?: number;    // CPU percentage limit (0-100)
  maxMemory?: number; // Memory in MB
  maxDisk?: number;   // Disk space in MB
  timeLimit?: number; // Max runtime in seconds
}

export interface SandboxSession {
  id: string;
  userId: string;
  projectId: string;
  path: string;
  tmuxSession: string;
  status: 'creating' | 'ready' | 'running' | 'stopped' | 'error';
  createdAt: Date;
  lastActivity: Date;
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
  processes: Set<number>;
}

export interface AgentProcess {
  pid: number;
  command: string;
  cpu: number;
  memory: number;
  startTime: Date;
}

// Enhanced tmux Service
export class EnhancedTmuxService extends EventEmitter {
  private sandboxes: Map<string, SandboxSession> = new Map();
  private workspaceRoot: string;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private resourceLimits = {
    maxSandboxesPerUser: 5,
    defaultMaxCpu: 50,      // 50% of one core
    defaultMaxMemory: 2048, // 2GB
    defaultMaxDisk: 5120,   // 5GB
    defaultTimeLimit: 3600  // 1 hour
  };

  constructor() {
    super();
    // Use /tmp for now, will move to /var/coder1 in production
    this.workspaceRoot = path.join(os.tmpdir(), 'coder1-workspaces');
    this.initialize();
  }

  private async initialize() {
    // Create workspace root if it doesn't exist
    await fs.mkdir(this.workspaceRoot, { recursive: true });
    
    // Start resource monitoring
    this.startResourceMonitoring();
    
    // Clean up old sandboxes on startup
    await this.cleanupOrphanedSandboxes();
  }

  /**
   * Create a new sandbox environment
   */
  async createSandbox(config: SandboxConfig): Promise<SandboxSession> {
    const sandboxId = `sandbox_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const userDir = path.join(this.workspaceRoot, config.userId);
    const sandboxPath = path.join(userDir, 'sandboxes', sandboxId);
    
    // Check user sandbox limit
    const userSandboxes = Array.from(this.sandboxes.values()).filter(
      s => s.userId === config.userId && s.status !== 'stopped'
    );
    
    if (userSandboxes.length >= this.resourceLimits.maxSandboxesPerUser) {
      throw new Error(`Maximum sandboxes (${this.resourceLimits.maxSandboxesPerUser}) reached for user`);
    }
    
    // Create sandbox directory
    await fs.mkdir(sandboxPath, { recursive: true });
    
    // Copy base project if specified
    if (config.baseFrom) {
      const basePath = path.join(userDir, 'projects', config.baseFrom);
      try {
        await this.copyDirectory(basePath, sandboxPath);
      } catch (error) {
        logger.warn(`Could not copy base project: ${error}`);
        // Continue anyway - empty sandbox is fine
      }
    }
    
    // Create tmux session for this sandbox
    const tmuxSession = `sandbox_${sandboxId}`;
    await this.createTmuxSession(tmuxSession, sandboxPath);
    
    // Create sandbox session object
    const session: SandboxSession = {
      id: sandboxId,
      userId: config.userId,
      projectId: config.projectId,
      path: sandboxPath,
      tmuxSession,
      status: 'ready',
      createdAt: new Date(),
      lastActivity: new Date(),
      resources: {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0
      },
      processes: new Set()
    };
    
    // Store session
    this.sandboxes.set(sandboxId, session);
    
    // Apply resource limits
    await this.applyResourceLimits(session, {
      maxCpu: config.maxCpu || this.resourceLimits.defaultMaxCpu,
      maxMemory: config.maxMemory || this.resourceLimits.defaultMaxMemory,
      maxDisk: config.maxDisk || this.resourceLimits.defaultMaxDisk
    });
    
    // Set up auto-cleanup timer if time limit specified
    if (config.timeLimit || this.resourceLimits.defaultTimeLimit) {
      const timeLimit = (config.timeLimit || this.resourceLimits.defaultTimeLimit) * 1000;
      setTimeout(() => {
        this.destroySandbox(sandboxId).catch(console.error);
      }, timeLimit);
    }
    
    // Start metrics collection
    const metricsService = getSandboxMetricsService();
    metricsService.startCollecting(sandboxId, sandboxPath);
    
    // Start preview server if it's a web project
    const previewService = getSandboxPreviewService();
    try {
      await previewService.startPreviewServer(sandboxId, sandboxPath);
      logger.debug(`Preview server started for sandbox ${sandboxId}`);
    } catch (error) {
      logger.warn(`Could not start preview server for sandbox ${sandboxId}:`, error);
    }
    
    this.emit('sandbox:created', session);
    return session;
  }

  /**
   * Run a command in a sandbox
   */
  async runInSandbox(sandboxId: string, command: string): Promise<{ stdout: string; stderr: string }> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }
    
    sandbox.status = 'running';
    sandbox.lastActivity = new Date();
    
    return new Promise((resolve, reject) => {
      // Run command in tmux session with working directory set
      const tmuxCommand = `tmux send-keys -t ${sandbox.tmuxSession} "cd ${sandbox.path} && ${command}" Enter`;
      
      exec(tmuxCommand, { 
        cwd: sandbox.path,
        env: {
          ...process.env,
          SANDBOX_ID: sandboxId,
          SANDBOX_PATH: sandbox.path
        }
      }, (error, stdout, stderr) => {
        if (error) {
          sandbox.status = 'error';
          reject(error);
        } else {
          sandbox.status = 'ready';
          resolve({ stdout, stderr });
        }
      });
    });
  }

  /**
   * Execute a command and track its process
   */
  async executeInSandbox(sandboxId: string, command: string, args: string[] = []): Promise<ChildProcess> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }
    
    const child = spawn(command, args, {
      cwd: sandbox.path,
      env: {
        ...process.env,
        SANDBOX_ID: sandboxId,
        SANDBOX_PATH: sandbox.path,
        // Limit memory for Node.js processes
        NODE_OPTIONS: `--max-old-space-size=${sandbox.resources.memoryUsage || 2048}`
      }
    });
    
    // Track process
    if (child.pid) {
      sandbox.processes.add(child.pid);
      
      child.on('exit', () => {
        sandbox.processes.delete(child.pid!);
      });
    }
    
    return child;
  }

  /**
   * Test changes in sandbox
   */
  async testSandbox(sandboxId: string): Promise<{ passed: boolean; results: any }> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }
    
    try {
      // Check if package.json exists
      const packageJsonPath = path.join(sandbox.path, 'package.json');
      const hasPackageJson = await fs.access(packageJsonPath).then(() => true).catch(() => false);
      
      if (hasPackageJson) {
        // Run npm test if available
        const { stdout, stderr } = await this.runInSandbox(sandboxId, 'npm test');
        const passed = !stderr.includes('failed') && !stdout.includes('failed');
        
        return {
          passed,
          results: { stdout, stderr }
        };
      } else {
        // Basic check - ensure no syntax errors in JS/TS files
        const { stdout, stderr } = await this.runInSandbox(sandboxId, 'find . -name "*.js" -o -name "*.ts" | xargs -I {} node -c {}');
        const passed = stderr.length === 0;
        
        return {
          passed,
          results: { message: 'Basic syntax check', stdout, stderr }
        };
      }
    } catch (error) {
      return {
        passed: false,
        results: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Promote sandbox to main workspace
   */
  async promoteSandbox(sandboxId: string, targetPath?: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }
    
    const userDir = path.join(this.workspaceRoot, sandbox.userId);
    const mainPath = targetPath || path.join(userDir, 'projects', sandbox.projectId);
    
    // Backup existing main if it exists
    const backupPath = `${mainPath}.backup.${Date.now()}`;
    try {
      await fs.rename(mainPath, backupPath);
    } catch (error) {
      // Main doesn't exist, that's fine
    }
    
    // Move sandbox to main
    await fs.rename(sandbox.path, mainPath);
    
    // Update sandbox record
    sandbox.path = mainPath;
    sandbox.status = 'stopped';
    
    this.emit('sandbox:promoted', { sandboxId, newPath: mainPath });
  }

  /**
   * Destroy a sandbox and clean up resources
   */
  async destroySandbox(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      return; // Already destroyed
    }
    
    sandbox.status = 'stopped';
    
    // Stop metrics collection
    const metricsService = getSandboxMetricsService();
    metricsService.stopCollecting(sandboxId);
    
    // Stop preview server
    const previewService = getSandboxPreviewService();
    await previewService.stopPreviewServer(sandboxId);
    
    // Kill all processes in sandbox
    for (const pid of Array.from(sandbox.processes)) {
      try {
        process.kill(pid, 'SIGTERM');
        // Give process time to clean up
        setTimeout(() => {
          try {
            process.kill(pid, 'SIGKILL');
          } catch {}
        }, 5000);
      } catch (error) {
        logger.warn(`Could not kill process ${pid}:`, error);
      }
    }
    
    // Kill tmux session with better error suppression
    try {
      // Use 2>/dev/null to suppress stderr and || true to always succeed
      await this.execAsync(`tmux kill-session -t ${sandbox.tmuxSession} 2>/dev/null || true`);
      logger.debug(`Successfully cleaned up tmux session: ${sandbox.tmuxSession}`);
    } catch (error) {
      // This should rarely happen now with || true, but keep as fallback
      logger.debug(`Tmux session ${sandbox.tmuxSession} may have already been killed`);
    }
    
    // Remove sandbox directory
    try {
      await fs.rm(sandbox.path, { recursive: true, force: true });
    } catch (error) {
      logger.error(`Could not remove sandbox directory:`, error);
    }
    
    // Remove from tracking
    this.sandboxes.delete(sandboxId);
    
    this.emit('sandbox:destroyed', sandboxId);
  }

  /**
   * Get sandbox status
   */
  getSandbox(sandboxId: string): SandboxSession | undefined {
    return this.sandboxes.get(sandboxId);
  }

  /**
   * List all sandboxes for a user
   */
  listUserSandboxes(userId: string): SandboxSession[] {
    return Array.from(this.sandboxes.values()).filter(s => s.userId === userId);
  }

  /**
   * Apply resource limits to a sandbox
   */
  private async applyResourceLimits(
    sandbox: SandboxSession, 
    limits: { maxCpu: number; maxMemory: number; maxDisk: number }
  ): Promise<void> {
    // CPU limiting using cpulimit (if available)
    try {
      // Check if cpulimit is installed
      await this.execAsync('which cpulimit');
      
      // Apply CPU limit to tmux session
      const cpuLimitCmd = `cpulimit -l ${limits.maxCpu} -i tmux new-session -t ${sandbox.tmuxSession}`;
      exec(cpuLimitCmd, (error) => {
        if (error) logger.warn('Could not apply CPU limit:', error);
      });
    } catch {
      logger.warn('cpulimit not available - CPU limits not enforced');
    }
    
    // Memory and disk limits are tracked but not hard-enforced without cgroups
    // In production, we'd use cgroups v2 for proper enforcement
    sandbox.resources = {
      cpuUsage: 0,
      memoryUsage: limits.maxMemory,
      diskUsage: limits.maxDisk
    };
  }

  /**
   * Monitor resource usage for all sandboxes
   */
  private startResourceMonitoring() {
    this.monitoringInterval = setInterval(async () => {
      for (const [id, sandbox] of Array.from(this.sandboxes.entries())) {
        if (sandbox.status === 'running' || sandbox.status === 'ready') {
          await this.updateResourceUsage(sandbox);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Update resource usage for a sandbox
   */
  private async updateResourceUsage(sandbox: SandboxSession): Promise<void> {
    try {
      // Get disk usage
      const diskUsage = await this.getDiskUsage(sandbox.path);
      
      // Get process info for all processes in sandbox
      let totalCpu = 0;
      let totalMemory = 0;
      
      for (const pid of Array.from(sandbox.processes)) {
        const stats = await this.getProcessStats(pid);
        if (stats) {
          totalCpu += stats.cpu;
          totalMemory += stats.memory;
        }
      }
      
      sandbox.resources = {
        cpuUsage: totalCpu,
        memoryUsage: totalMemory,
        diskUsage
      };
      
      // Check if limits exceeded
      if (totalMemory > (sandbox.resources.memoryUsage || this.resourceLimits.defaultMaxMemory)) {
        logger.warn(`Sandbox ${sandbox.id} exceeding memory limit`);
        this.emit('sandbox:limit-exceeded', { sandboxId: sandbox.id, type: 'memory' });
      }
      
      if (diskUsage > (sandbox.resources.diskUsage || this.resourceLimits.defaultMaxDisk)) {
        logger.warn(`Sandbox ${sandbox.id} exceeding disk limit`);
        this.emit('sandbox:limit-exceeded', { sandboxId: sandbox.id, type: 'disk' });
      }
    } catch (error) {
      logger.error('Error updating resource usage:', error);
    }
  }

  /**
   * Helper: Get disk usage for a directory
   */
  private async getDiskUsage(dirPath: string): Promise<number> {
    return new Promise((resolve) => {
      exec(`du -sm "${dirPath}" | cut -f1`, (error, stdout) => {
        if (error) {
          resolve(0);
        } else {
          resolve(parseInt(stdout.trim()) || 0);
        }
      });
    });
  }

  /**
   * Helper: Get process statistics
   */
  private async getProcessStats(pid: number): Promise<{ cpu: number; memory: number } | null> {
    return new Promise((resolve) => {
      exec(`ps -p ${pid} -o %cpu,rss`, (error, stdout) => {
        if (error) {
          resolve(null);
        } else {
          const lines = stdout.trim().split('\n');
          if (lines.length > 1) {
            const [cpu, rss] = lines[1].trim().split(/\s+/);
            resolve({
              cpu: parseFloat(cpu) || 0,
              memory: (parseInt(rss) || 0) / 1024 // Convert KB to MB
            });
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  /**
   * Helper: Create tmux session
   */
  private async createTmuxSession(sessionName: string, workDir: string): Promise<void> {
    const cmd = `tmux new-session -d -s ${sessionName} -c "${workDir}"`;
    await this.execAsync(cmd);
  }

  /**
   * Helper: Copy directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and .git
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Helper: Execute command as promise
   */
  private execAsync(command: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve({ stdout, stderr });
      });
    });
  }

  /**
   * Clean up orphaned sandboxes on startup
   */
  private async cleanupOrphanedSandboxes(): Promise<void> {
    try {
      // List all tmux sessions starting with 'sandbox_'
      const { stdout } = await this.execAsync("tmux list-sessions -F '#{session_name}' 2>/dev/null || true");
      const sessions = stdout.split('\n').filter(s => s.startsWith('sandbox_'));
      
      // Kill orphaned sessions
      for (const session of sessions) {
        if (!Array.from(this.sandboxes.values()).some(s => s.tmuxSession === session)) {
          logger.debug(`Cleaning up orphaned tmux session: ${session}`);
          // Use 2>/dev/null to suppress errors and || true to always succeed
          await this.execAsync(`tmux kill-session -t ${session} 2>/dev/null || true`).catch(() => {});
        }
      }
      
      // Clean up old sandbox directories
      const users = await fs.readdir(this.workspaceRoot).catch(() => []);
      for (const user of users) {
        const sandboxDir = path.join(this.workspaceRoot, user, 'sandboxes');
        try {
          const sandboxes = await fs.readdir(sandboxDir);
          for (const sandbox of sandboxes) {
            // Remove sandboxes older than 24 hours
            const sandboxPath = path.join(sandboxDir, sandbox);
            const stats = await fs.stat(sandboxPath);
            const age = Date.now() - stats.mtimeMs;
            if (age > 24 * 60 * 60 * 1000) {
              logger.debug(`Removing old sandbox: ${sandboxPath}`);
              await fs.rm(sandboxPath, { recursive: true, force: true });
            }
          }
        } catch {
          // Directory doesn't exist, skip
        }
      }
    } catch (error) {
      logger.error('Error cleaning up orphaned sandboxes:', error);
    }
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Destroy all active sandboxes
    for (const id of Array.from(this.sandboxes.keys())) {
      await this.destroySandbox(id);
    }
  }
}

// Singleton instance
let instance: EnhancedTmuxService | null = null;

export function getEnhancedTmuxService(): EnhancedTmuxService {
  if (!instance) {
    instance = new EnhancedTmuxService();
  }
  return instance;
}