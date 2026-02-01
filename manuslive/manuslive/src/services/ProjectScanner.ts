import { EventEmitter } from 'events';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { homedir } from 'os';
import simpleGit, { SimpleGit, StatusResult } from 'simple-git';

// ============ TYPES ============

export interface ProjectConfig {
  name: string;
  path: string;
  repo?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ProjectRegistry {
  projects: ProjectConfig[];
  scanIntervalMinutes: number;
}

export interface GitStatus {
  branch: string;
  uncommittedChanges: number;
  lastCommitDate: Date | null;
  lastCommitMessage: string;
  isAhead: number;
  isBehind: number;
  remoteUrl: string | null;
}

export interface TaskStatus {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  taskFiles: string[];
}

export interface PackageInfo {
  name: string;
  version: string;
  scripts: Record<string, string>;
  dependencies: number;
  devDependencies: number;
}

export interface ProjectData {
  config: ProjectConfig;
  exists: boolean;
  lastScanned: number;
  lastModified: number | null;
  git: GitStatus | null;
  tasks: TaskStatus;
  package: PackageInfo | null;
  errors: string[];
}

export interface ProjectScannerConfig {
  registryPath?: string;
}

// ============ PROJECT SCANNER ============

export class ProjectScanner extends EventEmitter {
  private registryPath: string;
  private projects: Map<string, ProjectData> = new Map();
  private scanInterval: NodeJS.Timeout | null = null;
  private running = false;

  constructor(config: ProjectScannerConfig = {}) {
    super();
    this.registryPath = config.registryPath || join(homedir(), '.manuslive', 'projects.json');
  }

  async start(): Promise<void> {
    if (this.running) return;

    // Ensure registry exists
    await this.ensureRegistry();

    // Load registry and do initial scan
    const registry = await this.loadRegistry();

    this.running = true;

    // Initial scan
    await this.scanNow();

    // Set up interval scanning
    const intervalMs = (registry.scanIntervalMinutes || 15) * 60 * 1000;
    this.scanInterval = setInterval(() => {
      this.scanNow().catch(err => {
        console.error('Project scan error:', err);
      });
    }, intervalMs);

    console.log(`ProjectScanner started - scanning every ${registry.scanIntervalMinutes} minutes`);
  }

  stop(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.running = false;
    console.log('ProjectScanner stopped');
  }

  async scanNow(): Promise<void> {
    const registry = await this.loadRegistry();
    const startTime = Date.now();

    for (const projectConfig of registry.projects) {
      try {
        const projectData = await this.scanProject(projectConfig);
        this.projects.set(projectConfig.path, projectData);

        // Check for alerts
        this.checkAlerts(projectData);
      } catch (error) {
        const err = error as Error;
        console.error(`Error scanning project ${projectConfig.name}:`, err.message);

        // Store error state
        this.projects.set(projectConfig.path, {
          config: projectConfig,
          exists: false,
          lastScanned: Date.now(),
          lastModified: null,
          git: null,
          tasks: { totalTasks: 0, pendingTasks: 0, completedTasks: 0, taskFiles: [] },
          package: null,
          errors: [err.message],
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`Project scan complete: ${registry.projects.length} projects in ${duration}ms`);

    this.emit('scan-complete', {
      projectCount: registry.projects.length,
      duration,
      timestamp: Date.now(),
    });
  }

  getProjects(): ProjectData[] {
    return Array.from(this.projects.values());
  }

  getProject(path: string): ProjectData | undefined {
    return this.projects.get(path);
  }

  // ============ PRIVATE METHODS ============

  private async ensureRegistry(): Promise<void> {
    const dir = dirname(this.registryPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    if (!existsSync(this.registryPath)) {
      const defaultRegistry: ProjectRegistry = {
        projects: [
          {
            name: 'Coder1 IDE',
            path: '/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next',
            repo: 'MichaelrKraft/coder1-ide',
            priority: 'high',
          },
          {
            name: 'Johnny5',
            path: '/Users/michaelkraft/manuslive/manuslive',
            priority: 'high',
          },
        ],
        scanIntervalMinutes: 15,
      };
      await writeFile(this.registryPath, JSON.stringify(defaultRegistry, null, 2));
      console.log(`Created default project registry at ${this.registryPath}`);
    }
  }

  private async loadRegistry(): Promise<ProjectRegistry> {
    try {
      const content = await readFile(this.registryPath, 'utf-8');
      return JSON.parse(content) as ProjectRegistry;
    } catch {
      return { projects: [], scanIntervalMinutes: 15 };
    }
  }

  private async scanProject(config: ProjectConfig): Promise<ProjectData> {
    const errors: string[] = [];

    // Check if project exists
    if (!existsSync(config.path)) {
      return {
        config,
        exists: false,
        lastScanned: Date.now(),
        lastModified: null,
        git: null,
        tasks: { totalTasks: 0, pendingTasks: 0, completedTasks: 0, taskFiles: [] },
        package: null,
        errors: ['Project directory does not exist'],
      };
    }

    // Get last modified time of key files
    const lastModified = this.getLastModified(config.path);

    // Scan git status
    let git: GitStatus | null = null;
    try {
      git = await this.scanGit(config.path);
    } catch (error) {
      const err = error as Error;
      errors.push(`Git error: ${err.message}`);
    }

    // Scan task files
    const tasks = this.scanTasks(config.path);

    // Scan package.json
    let packageInfo: PackageInfo | null = null;
    try {
      packageInfo = this.scanPackage(config.path);
    } catch (error) {
      const err = error as Error;
      errors.push(`Package error: ${err.message}`);
    }

    return {
      config,
      exists: true,
      lastScanned: Date.now(),
      lastModified,
      git,
      tasks,
      package: packageInfo,
      errors,
    };
  }

  private async scanGit(projectPath: string): Promise<GitStatus | null> {
    const gitDir = join(projectPath, '.git');
    if (!existsSync(gitDir)) {
      return null;
    }

    const git: SimpleGit = simpleGit(projectPath);

    // Get status
    const status: StatusResult = await git.status();

    // Get last commit
    let lastCommitDate: Date | null = null;
    let lastCommitMessage = '';
    try {
      const log = await git.log({ maxCount: 1 });
      if (log.latest) {
        lastCommitDate = new Date(log.latest.date);
        lastCommitMessage = log.latest.message;
      }
    } catch {
      // No commits yet
    }

    // Get remote URL
    let remoteUrl: string | null = null;
    try {
      const remotes = await git.getRemotes(true);
      const origin = remotes.find(r => r.name === 'origin');
      if (origin) {
        remoteUrl = origin.refs.fetch || null;
      }
    } catch {
      // No remotes
    }

    return {
      branch: status.current || 'unknown',
      uncommittedChanges: status.files.length,
      lastCommitDate,
      lastCommitMessage,
      isAhead: status.ahead,
      isBehind: status.behind,
      remoteUrl,
    };
  }

  private scanTasks(projectPath: string): TaskStatus {
    const taskFiles: string[] = [];
    let totalTasks = 0;
    let pendingTasks = 0;
    let completedTasks = 0;

    // Check for tasks directory
    const tasksDir = join(projectPath, 'tasks');
    if (existsSync(tasksDir)) {
      try {
        const files = readdirSync(tasksDir).filter(f => f.endsWith('.md'));
        for (const file of files) {
          taskFiles.push(join('tasks', file));
          const counts = this.countTasksInFile(join(tasksDir, file));
          totalTasks += counts.total;
          pendingTasks += counts.pending;
          completedTasks += counts.completed;
        }
      } catch {
        // Directory read error
      }
    }

    // Check for TODO.md in root
    const todoPath = join(projectPath, 'TODO.md');
    if (existsSync(todoPath)) {
      taskFiles.push('TODO.md');
      const counts = this.countTasksInFile(todoPath);
      totalTasks += counts.total;
      pendingTasks += counts.pending;
      completedTasks += counts.completed;
    }

    // Check for todo.md (lowercase)
    const todoLowerPath = join(projectPath, 'todo.md');
    if (existsSync(todoLowerPath) && todoLowerPath !== todoPath) {
      taskFiles.push('todo.md');
      const counts = this.countTasksInFile(todoLowerPath);
      totalTasks += counts.total;
      pendingTasks += counts.pending;
      completedTasks += counts.completed;
    }

    return { totalTasks, pendingTasks, completedTasks, taskFiles };
  }

  private countTasksInFile(filePath: string): { total: number; pending: number; completed: number } {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      let pending = 0;
      let completed = 0;

      for (const line of lines) {
        // Match markdown checkboxes: - [ ] or - [x] or * [ ] or * [x]
        if (/^[\s]*[-*]\s*\[\s*\]/.test(line)) {
          pending++;
        } else if (/^[\s]*[-*]\s*\[[xX]\]/.test(line)) {
          completed++;
        }
      }

      return { total: pending + completed, pending, completed };
    } catch {
      return { total: 0, pending: 0, completed: 0 };
    }
  }

  private scanPackage(projectPath: string): PackageInfo | null {
    const packagePath = join(projectPath, 'package.json');
    if (!existsSync(packagePath)) {
      return null;
    }

    try {
      const content = readFileSync(packagePath, 'utf-8');
      const pkg = JSON.parse(content);

      return {
        name: pkg.name || 'unknown',
        version: pkg.version || '0.0.0',
        scripts: pkg.scripts || {},
        dependencies: Object.keys(pkg.dependencies || {}).length,
        devDependencies: Object.keys(pkg.devDependencies || {}).length,
      };
    } catch {
      return null;
    }
  }

  private getLastModified(projectPath: string): number | null {
    const keyFiles = [
      'package.json',
      'src',
      'app',
      'components',
      'lib',
    ];

    let latest: number | null = null;

    for (const file of keyFiles) {
      const fullPath = join(projectPath, file);
      if (existsSync(fullPath)) {
        try {
          const stat = statSync(fullPath);
          const mtime = stat.mtime.getTime();
          if (latest === null || mtime > latest) {
            latest = mtime;
          }
        } catch {
          // Stat error
        }
      }
    }

    return latest;
  }

  private checkAlerts(project: ProjectData): void {
    // Alert: Too many uncommitted changes
    if (project.git && project.git.uncommittedChanges > 20) {
      this.emit('project-alert', {
        project: project.config.name,
        type: 'uncommitted-changes',
        message: `${project.config.name} has ${project.git.uncommittedChanges} uncommitted changes`,
        severity: 'warning',
      });
    }

    // Alert: Behind remote
    if (project.git && project.git.isBehind > 10) {
      this.emit('project-alert', {
        project: project.config.name,
        type: 'behind-remote',
        message: `${project.config.name} is ${project.git.isBehind} commits behind remote`,
        severity: 'warning',
      });
    }

    // Alert: Many pending tasks
    if (project.tasks.pendingTasks > 50) {
      this.emit('project-alert', {
        project: project.config.name,
        type: 'many-pending-tasks',
        message: `${project.config.name} has ${project.tasks.pendingTasks} pending tasks`,
        severity: 'info',
      });
    }

    // Alert: No recent activity (more than 7 days)
    if (project.git && project.git.lastCommitDate) {
      const daysSinceCommit = (Date.now() - project.git.lastCommitDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCommit > 7 && project.config.priority === 'high') {
        this.emit('project-alert', {
          project: project.config.name,
          type: 'stale',
          message: `${project.config.name} has no commits in ${Math.floor(daysSinceCommit)} days`,
          severity: 'info',
        });
      }
    }
  }
}
