"use strict";
/**
 * Sandbox Metrics Service
 * Collects real-time performance metrics for each sandbox
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
exports.SandboxMetricsService = void 0;
exports.getSandboxMetricsService = getSandboxMetricsService;
const events_1 = require("events");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const logger_1 = require("@/lib/logger");
class SandboxMetricsService extends events_1.EventEmitter {
    constructor() {
        super();
        this.metrics = new Map();
        this.collectors = new Map();
        this.sandboxPaths = new Map();
    }
    /**
     * Start collecting metrics for a sandbox
     */
    startCollecting(sandboxId, sandboxPath) {
        logger_1.logger.debug(`Starting metrics collection for sandbox ${sandboxId}`);
        this.sandboxPaths.set(sandboxId, sandboxPath);
        // Initial metrics collection
        this.collectMetrics(sandboxId);
        // Set up periodic collection (every 5 seconds)
        const interval = setInterval(() => {
            this.collectMetrics(sandboxId);
        }, 5000);
        this.collectors.set(sandboxId, interval);
    }
    /**
     * Stop collecting metrics for a sandbox
     */
    stopCollecting(sandboxId) {
        logger_1.logger.debug(`Stopping metrics collection for sandbox ${sandboxId}`);
        const interval = this.collectors.get(sandboxId);
        if (interval) {
            clearInterval(interval);
            this.collectors.delete(sandboxId);
        }
        this.metrics.delete(sandboxId);
        this.sandboxPaths.delete(sandboxId);
    }
    /**
     * Get current metrics for a sandbox
     */
    getMetrics(sandboxId) {
        return this.metrics.get(sandboxId) || null;
    }
    /**
     * Get metrics for all sandboxes
     */
    getAllMetrics() {
        return Array.from(this.metrics.values());
    }
    /**
     * Collect all metrics for a sandbox
     */
    async collectMetrics(sandboxId) {
        const sandboxPath = this.sandboxPaths.get(sandboxId);
        if (!sandboxPath)
            return;
        try {
            const [systemMetrics, performanceMetrics, buildMetrics, gitMetrics] = await Promise.all([
                this.collectSystemMetrics(sandboxId, sandboxPath),
                this.collectPerformanceMetrics(sandboxId),
                this.collectBuildMetrics(sandboxPath),
                this.collectGitMetrics(sandboxPath)
            ]);
            const metrics = {
                sandboxId,
                timestamp: new Date(),
                system: systemMetrics,
                performance: performanceMetrics,
                build: buildMetrics,
                lighthouse: {
                    performance: 0,
                    accessibility: 0,
                    bestPractices: 0,
                    seo: 0,
                    pwa: 0
                },
                git: gitMetrics
            };
            // Collect Lighthouse metrics if there's a preview server running
            const previewUrl = this.getPreviewUrl(sandboxId);
            if (previewUrl) {
                metrics.lighthouse = await this.collectLighthouseMetrics(previewUrl);
            }
            this.metrics.set(sandboxId, metrics);
            this.emit('metrics:updated', { sandboxId, metrics });
        }
        catch (error) {
            logger_1.logger.error(`Error collecting metrics for sandbox ${sandboxId}:`, error);
        }
    }
    /**
     * Collect system metrics (CPU, memory, disk)
     */
    async collectSystemMetrics(sandboxId, sandboxPath) {
        const [cpuUsage, memoryUsage, diskUsage, processCount] = await Promise.all([
            this.getCpuUsage(sandboxId),
            this.getMemoryUsage(sandboxId),
            this.getDiskUsage(sandboxPath),
            this.getProcessCount(sandboxId)
        ]);
        return {
            cpuUsage,
            memoryUsage,
            diskUsage,
            processCount
        };
    }
    /**
     * Collect performance metrics (response time, throughput)
     */
    async collectPerformanceMetrics(sandboxId) {
        const previewUrl = this.getPreviewUrl(sandboxId);
        if (!previewUrl) {
            return {
                responseTime: 0,
                throughput: 0,
                errorRate: 0
            };
        }
        try {
            const startTime = Date.now();
            const response = await fetch(previewUrl, {
                method: 'HEAD',
                cache: 'no-cache',
                signal: AbortSignal.timeout(5000)
            });
            const responseTime = Date.now() - startTime;
            return {
                responseTime,
                throughput: response.ok ? 1 : 0,
                errorRate: response.ok ? 0 : 1
            };
        }
        catch (error) {
            return {
                responseTime: 5000, // Timeout
                throughput: 0,
                errorRate: 1
            };
        }
    }
    /**
     * Collect build metrics (bundle size, build time)
     */
    async collectBuildMetrics(sandboxPath) {
        try {
            // Check for Next.js build info
            const buildManifestPath = path.join(sandboxPath, '.next/build-manifest.json');
            const distPath = path.join(sandboxPath, 'dist');
            const buildPath = path.join(sandboxPath, 'build');
            let bundleSize = 0;
            let buildTime = 0;
            let warnings = 0;
            let errors = 0;
            // Try different build directories
            for (const dir of ['.next', 'dist', 'build', 'out']) {
                const fullPath = path.join(sandboxPath, dir);
                try {
                    const stats = await fs.stat(fullPath);
                    if (stats.isDirectory()) {
                        bundleSize = await this.getDirectorySize(fullPath);
                        buildTime = Date.now() - stats.mtimeMs;
                        break;
                    }
                }
                catch {
                    // Directory doesn't exist, continue
                }
            }
            // Check for package.json to determine project type
            try {
                const packageJson = await fs.readFile(path.join(sandboxPath, 'package.json'), 'utf-8');
                const pkg = JSON.parse(packageJson);
                // Estimate bundle size based on dependencies
                if (!bundleSize && pkg.dependencies) {
                    bundleSize = Object.keys(pkg.dependencies).length * 50; // Rough estimate
                }
            }
            catch {
                // No package.json
            }
            return {
                bundleSize: Math.round(bundleSize / 1024), // Convert to KB
                buildTime: buildTime > 0 ? buildTime : 0,
                warnings,
                errors
            };
        }
        catch (error) {
            return {
                bundleSize: 0,
                buildTime: 0,
                warnings: 0,
                errors: 0
            };
        }
    }
    /**
     * Collect Lighthouse metrics
     */
    async collectLighthouseMetrics(url) {
        // This would use puppeteer + lighthouse in production
        // For now, return mock data based on response time
        try {
            const startTime = Date.now();
            const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
            const responseTime = Date.now() - startTime;
            // Generate scores based on performance
            const performanceScore = Math.max(0, 100 - Math.round(responseTime / 10));
            const accessibilityScore = Math.floor(Math.random() * 20) + 80; // 80-100
            const bestPracticesScore = Math.floor(Math.random() * 30) + 70; // 70-100
            const seoScore = Math.floor(Math.random() * 20) + 80; // 80-100
            const pwaScore = Math.floor(Math.random() * 50) + 50; // 50-100
            return {
                performance: performanceScore,
                accessibility: accessibilityScore,
                bestPractices: bestPracticesScore,
                seo: seoScore,
                pwa: pwaScore
            };
        }
        catch (error) {
            return {
                performance: 0,
                accessibility: 0,
                bestPractices: 0,
                seo: 0,
                pwa: 0
            };
        }
    }
    /**
     * Collect Git metrics
     */
    async collectGitMetrics(sandboxPath) {
        try {
            const [commitHash, branch, uncommittedChanges] = await Promise.all([
                this.execInPath('git rev-parse --short HEAD', sandboxPath),
                this.execInPath('git branch --show-current', sandboxPath),
                this.execInPath('git status --porcelain | wc -l', sandboxPath)
            ]);
            return {
                commitHash: commitHash.trim() || 'none',
                branch: branch.trim() || 'main',
                uncommittedChanges: parseInt(uncommittedChanges.trim()) || 0
            };
        }
        catch (error) {
            return {
                commitHash: 'none',
                branch: 'main',
                uncommittedChanges: 0
            };
        }
    }
    /**
     * Get CPU usage for sandbox processes
     */
    async getCpuUsage(sandboxId) {
        try {
            const { stdout } = await this.execAsync(`ps aux | grep "${sandboxId}" | grep -v grep | awk '{sum += $3} END {print sum}'`);
            return parseFloat(stdout.trim()) || 0;
        }
        catch {
            return 0;
        }
    }
    /**
     * Get memory usage for sandbox processes
     */
    async getMemoryUsage(sandboxId) {
        try {
            const { stdout } = await this.execAsync(`ps aux | grep "${sandboxId}" | grep -v grep | awk '{sum += $4} END {print sum}'`);
            const memoryPercent = parseFloat(stdout.trim()) || 0;
            // Convert percentage to MB (assuming 16GB system)
            return Math.round((memoryPercent / 100) * 16384);
        }
        catch {
            return 0;
        }
    }
    /**
     * Get disk usage for a directory
     */
    async getDiskUsage(dirPath) {
        try {
            const { stdout } = await this.execAsync(`du -sm "${dirPath}" | cut -f1`);
            return parseInt(stdout.trim()) || 0;
        }
        catch {
            return 0;
        }
    }
    /**
     * Get process count for sandbox
     */
    async getProcessCount(sandboxId) {
        try {
            const { stdout } = await this.execAsync(`ps aux | grep "${sandboxId}" | grep -v grep | wc -l`);
            return parseInt(stdout.trim()) || 0;
        }
        catch {
            return 0;
        }
    }
    /**
     * Get directory size recursively
     */
    async getDirectorySize(dirPath) {
        try {
            const { stdout } = await this.execAsync(`du -sb "${dirPath}" | cut -f1`);
            return parseInt(stdout.trim()) || 0;
        }
        catch {
            return 0;
        }
    }
    /**
     * Get preview URL for sandbox
     */
    getPreviewUrl(sandboxId) {
        // This should integrate with the preview service
        // For now, assume ports start at 4001
        const sandboxIds = Array.from(this.sandboxPaths.keys());
        const index = sandboxIds.indexOf(sandboxId);
        return index >= 0 ? `http://localhost:${4001 + index}` : null;
    }
    /**
     * Execute command in specific directory
     */
    async execInPath(command, cwd) {
        return new Promise((resolve, reject) => {
            (0, child_process_1.exec)(command, { cwd }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(stdout);
                }
            });
        });
    }
    /**
     * Execute command as promise
     */
    execAsync(command) {
        return new Promise((resolve, reject) => {
            (0, child_process_1.exec)(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }
    /**
     * Stop all collectors
     */
    shutdown() {
        for (const [sandboxId] of this.collectors) {
            this.stopCollecting(sandboxId);
        }
    }
}
exports.SandboxMetricsService = SandboxMetricsService;
// Singleton instance
let instance = null;
function getSandboxMetricsService() {
    if (!instance) {
        instance = new SandboxMetricsService();
    }
    return instance;
}
