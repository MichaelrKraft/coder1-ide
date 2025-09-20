"use strict";
/**
 * Sandbox Preview Service
 * Manages parallel preview servers for each sandbox environment
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxPreviewService = void 0;
exports.getSandboxPreviewService = getSandboxPreviewService;
const child_process_1 = require("child_process");
const net = __importStar(require("net"));
const events_1 = require("events");
const logger_1 = require("@/lib/logger");
class SandboxPreviewService extends events_1.EventEmitter {
    constructor() {
        super();
        this.previewServers = new Map();
        this.basePort = 4001; // Start from port 4001
        this.maxPorts = 10; // Support up to 10 parallel previews
        this.usedPorts = new Set();
        this.initialize();
    }
    async initialize() {
        // Clean up any orphaned processes on startup
        await this.cleanupOrphanedServers();
    }
    /**
     * Start a preview server for a sandbox
     */
    async startPreviewServer(sandboxId, sandboxPath) {
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
        const server = {
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
                server.process = (0, child_process_1.spawn)('npm', ['run', 'dev'], {
                    cwd: sandboxPath,
                    env: {
                        ...process.env,
                        PORT: port.toString(),
                        NODE_ENV: 'development',
                        NEXT_TELEMETRY_DISABLED: '1'
                    },
                    stdio: ['ignore', 'pipe', 'pipe']
                });
            }
            else {
                // Start a simple HTTP server for static files
                server.process = (0, child_process_1.spawn)('npx', ['http-server', '-p', port.toString(), '-c-1'], {
                    cwd: sandboxPath,
                    env: process.env,
                    stdio: ['ignore', 'pipe', 'pipe']
                });
            }
            // Handle process events
            if (server.process) {
                server.process.stdout?.on('data', (data) => {
                    logger_1.logger.debug(`Preview ${sandboxId}: ${data}`);
                    // Check if server is ready
                    if (data.toString().includes('ready') ||
                        data.toString().includes('started') ||
                        data.toString().includes('listening')) {
                        server.status = 'running';
                        this.emit('preview:ready', { sandboxId, url: server.url });
                    }
                });
                server.process.stderr?.on('data', (data) => {
                    logger_1.logger.error(`Preview ${sandboxId} error: ${data}`);
                });
                server.process.on('exit', (code) => {
                    logger_1.logger.debug(`Preview ${sandboxId} exited with code ${code}`);
                    server.status = 'stopped';
                    this.usedPorts.delete(port);
                    this.previewServers.delete(sandboxId);
                    this.emit('preview:stopped', { sandboxId });
                });
                server.process.on('error', (error) => {
                    logger_1.logger.error(`Preview ${sandboxId} process error:`, error);
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
        }
        catch (error) {
            // Cleanup on error
            this.usedPorts.delete(port);
            this.previewServers.delete(sandboxId);
            throw error;
        }
    }
    /**
     * Stop a preview server
     */
    async stopPreviewServer(sandboxId) {
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
    getPreviewServer(sandboxId) {
        return this.previewServers.get(sandboxId);
    }
    /**
     * List all active preview servers
     */
    listPreviewServers() {
        return Array.from(this.previewServers.values());
    }
    /**
     * Find an available port
     */
    async findAvailablePort() {
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
    isPortAvailable(port) {
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
    async waitForServerReady(port, timeout) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            try {
                const response = await fetch(`http://localhost:${port}`);
                if (response.ok || response.status === 404) {
                    // Server is responding
                    return;
                }
            }
            catch (error) {
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
    async checkIfNextJs(path) {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const packageJson = await fs.readFile(`${path}/package.json`, 'utf-8');
            const pkg = JSON.parse(packageJson);
            return !!(pkg.dependencies?.next || pkg.devDependencies?.next);
        }
        catch {
            return false;
        }
    }
    /**
     * Clean up orphaned servers on startup
     */
    async cleanupOrphanedServers() {
        // Kill any processes using our port range
        for (let i = 0; i < this.maxPorts; i++) {
            const port = this.basePort + i;
            try {
                // Check if port is in use
                if (!await this.isPortAvailable(port)) {
                    // Try to kill the process using this port
                    const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
                    exec(`lsof -ti :${port} | xargs kill -9`, (error) => {
                        if (error) {
                            logger_1.logger.debug(`Could not kill process on port ${port}`);
                        }
                        else {
                            logger_1.logger.debug(`Killed orphaned process on port ${port}`);
                        }
                    });
                }
            }
            catch (error) {
                logger_1.logger.debug(`Error checking port ${port}:`, error);
            }
        }
    }
    /**
     * Stop all preview servers
     */
    async stopAllServers() {
        const promises = Array.from(this.previewServers.keys()).map(id => this.stopPreviewServer(id));
        await Promise.all(promises);
    }
    /**
     * Get metrics for all preview servers
     */
    getMetrics() {
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
exports.SandboxPreviewService = SandboxPreviewService;
// Singleton instance
let instance = null;
function getSandboxPreviewService() {
    if (!instance) {
        instance = new SandboxPreviewService();
    }
    return instance;
}
