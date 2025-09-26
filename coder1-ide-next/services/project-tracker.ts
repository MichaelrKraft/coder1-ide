/**
 * Project Tracking Service
 * Monitors project activity and associates token usage with specific projects/folders
 */

import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';

interface ProjectActivity {
  projectPath: string;
  projectName: string;
  lastActivity: string;
  filesEdited: Set<string>;
  commandsRun: number;
  tokensUsed: number;
  sessionsCount: number;
  totalTime: number; // in minutes
}

interface ProjectSnapshot {
  timestamp: string;
  projects: {
    path: string;
    name: string;
    tokensUsed: number;
    commandsRun: number;
    filesEdited: number;
    timeSpent: number;
    lastActivity: string;
  }[];
}

interface ProjectData {
  date: string;
  projects: Map<string, ProjectActivity>;
  snapshots: ProjectSnapshot[];
}

export class ProjectTracker extends EventEmitter {
  private static instance: ProjectTracker;
  private dataDir: string;
  private currentDay: string;
  private projectData: ProjectData | null = null;
  private activeProject: string | null = null;
  private sessionProjects: Map<string, string> = new Map(); // sessionId -> projectPath
  private projectStartTime: Map<string, number> = new Map(); // projectPath -> startTime

  private constructor() {
    super();
    this.dataDir = path.join(process.cwd(), 'data', 'projects');
    this.currentDay = new Date().toISOString().split('T')[0];
    this.initialize();
  }

  static getInstance(): ProjectTracker {
    if (!ProjectTracker.instance) {
      ProjectTracker.instance = new ProjectTracker();
    }
    return ProjectTracker.instance;
  }

  private async initialize() {
    // Ensure data directory exists
    await fs.mkdir(this.dataDir, { recursive: true });
    
    // Load today's data
    await this.loadProjectData();
    
    // Take snapshots every 5 minutes
    setInterval(() => this.takeSnapshot(), 5 * 60 * 1000);
    
    // Set up daily rollover
    this.scheduleDailyRollover();
  }

  private async loadProjectData() {
    const filePath = path.join(this.dataDir, `${this.currentDay}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      // Convert projects array back to Map
      this.projectData = {
        date: data.date,
        projects: new Map(data.projects.map((p: any) => [
          p.path,
          {
            ...p,
            filesEdited: new Set(p.filesEdited || [])
          }
        ])),
        snapshots: data.snapshots || []
      };
    } catch (error) {
      // Initialize new project data
      this.projectData = {
        date: this.currentDay,
        projects: new Map(),
        snapshots: []
      };
    }
  }

  private async saveProjectData() {
    if (!this.projectData) return;
    
    // Convert Map and Sets to serializable format
    const serializable = {
      date: this.projectData.date,
      projects: Array.from(this.projectData.projects.entries()).map(([path, activity]) => ({
        path,
        projectPath: activity.projectPath,
        projectName: activity.projectName,
        lastActivity: activity.lastActivity,
        filesEdited: Array.from(activity.filesEdited),
        commandsRun: activity.commandsRun,
        tokensUsed: activity.tokensUsed,
        sessionsCount: activity.sessionsCount,
        totalTime: activity.totalTime
      })),
      snapshots: this.projectData.snapshots
    };
    
    const filePath = path.join(this.dataDir, `${this.currentDay}.json`);
    await fs.writeFile(filePath, JSON.stringify(serializable, null, 2));
  }

  private scheduleDailyRollover() {
    // Calculate time until midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();
    
    setTimeout(() => {
      this.rolloverDaily();
      // Schedule next rollover
      setInterval(() => this.rolloverDaily(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  private async rolloverDaily() {
    // Save current day's data
    await this.saveProjectData();
    
    // Reset for new day
    this.currentDay = new Date().toISOString().split('T')[0];
    this.projectData = {
      date: this.currentDay,
      projects: new Map(),
      snapshots: []
    };
    
    logger.info('Daily project data rolled over');
  }

  private async takeSnapshot() {
    if (!this.projectData || this.projectData.projects.size === 0) return;
    
    const snapshot: ProjectSnapshot = {
      timestamp: new Date().toISOString(),
      projects: Array.from(this.projectData.projects.values()).map(p => ({
        path: p.projectPath,
        name: p.projectName,
        tokensUsed: p.tokensUsed,
        commandsRun: p.commandsRun,
        filesEdited: p.filesEdited.size,
        timeSpent: p.totalTime,
        lastActivity: p.lastActivity
      }))
    };
    
    this.projectData.snapshots.push(snapshot);
    
    // Keep only last 100 snapshots (8+ hours of data)
    if (this.projectData.snapshots.length > 100) {
      this.projectData.snapshots = this.projectData.snapshots.slice(-100);
    }
    
    await this.saveProjectData();
  }

  /**
   * Detect project from file path
   */
  private detectProject(filePath: string): { path: string; name: string } {
    // Find the project root (look for package.json, .git, etc.)
    let currentPath = path.dirname(filePath);
    let projectRoot = currentPath;
    
    const projectIndicators = ['package.json', '.git', 'Cargo.toml', 'go.mod', 'requirements.txt'];
    
    while (currentPath !== path.dirname(currentPath)) {
      try {
        const files = require('fs').readdirSync(currentPath);
        if (projectIndicators.some(indicator => files.includes(indicator))) {
          projectRoot = currentPath;
          break;
        }
      } catch (error) {
        // Directory not accessible
      }
      currentPath = path.dirname(currentPath);
    }
    
    // Extract project name from path
    const projectName = path.basename(projectRoot);
    
    return { path: projectRoot, name: projectName };
  }

  /**
   * Track file operation (edit, read, etc.)
   */
  async trackFileOperation(filePath: string, operation: 'read' | 'write', sessionId?: string) {
    if (!this.projectData) await this.loadProjectData();
    
    const project = this.detectProject(filePath);
    this.activeProject = project.path;
    
    // Associate session with project
    if (sessionId) {
      this.sessionProjects.set(sessionId, project.path);
    }
    
    // Get or create project activity
    let activity = this.projectData!.projects.get(project.path);
    if (!activity) {
      activity = {
        projectPath: project.path,
        projectName: project.name,
        lastActivity: new Date().toISOString(),
        filesEdited: new Set(),
        commandsRun: 0,
        tokensUsed: 0,
        sessionsCount: 0,
        totalTime: 0
      };
      this.projectData!.projects.set(project.path, activity);
      
      // Track project start time
      this.projectStartTime.set(project.path, Date.now());
    }
    
    // Update activity
    activity.lastActivity = new Date().toISOString();
    if (operation === 'write') {
      activity.filesEdited.add(filePath);
    }
    
    await this.saveProjectData();
    
    // Emit event for real-time updates
    this.emit('project-activity', {
      projectPath: project.path,
      projectName: project.name,
      operation,
      filePath
    });
    
    logger.debug(`Tracked ${operation} operation in project: ${project.name}`);
  }

  /**
   * Track command execution in a project
   */
  async trackCommand(command: string, sessionId: string, tokens: number = 0) {
    if (!this.projectData) await this.loadProjectData();
    
    // Get project from session
    const projectPath = this.sessionProjects.get(sessionId) || this.activeProject;
    if (!projectPath) return;
    
    const activity = this.projectData!.projects.get(projectPath);
    if (activity) {
      activity.commandsRun++;
      activity.tokensUsed += tokens;
      activity.lastActivity = new Date().toISOString();
      
      // Update time spent
      const startTime = this.projectStartTime.get(projectPath);
      if (startTime) {
        const elapsed = Math.floor((Date.now() - startTime) / 60000); // in minutes
        activity.totalTime = elapsed;
      }
      
      await this.saveProjectData();
      
      logger.debug(`Tracked command in project ${activity.projectName}: ${tokens} tokens`);
    }
  }

  /**
   * Associate a session with a project
   */
  async associateSession(sessionId: string, projectPath?: string) {
    if (!projectPath && this.activeProject) {
      projectPath = this.activeProject;
    }
    
    if (projectPath) {
      this.sessionProjects.set(sessionId, projectPath);
      
      // Increment session count
      if (this.projectData) {
        const activity = this.projectData.projects.get(projectPath);
        if (activity) {
          activity.sessionsCount++;
          await this.saveProjectData();
        }
      }
    }
  }

  /**
   * Get current project data for API
   */
  async getProjectData() {
    if (!this.projectData) await this.loadProjectData();
    
    // Convert to API-friendly format
    const projects = Array.from(this.projectData!.projects.values())
      .map(p => ({
        id: p.projectPath,
        name: p.projectName,
        path: p.projectPath,
        tokensUsed: p.tokensUsed,
        commandsRun: p.commandsRun,
        filesEdited: p.filesEdited.size,
        sessionsCount: p.sessionsCount,
        timeSpent: p.totalTime,
        lastActivity: p.lastActivity,
        percentageOfTotal: 0 // Will be calculated
      }))
      .sort((a, b) => b.tokensUsed - a.tokensUsed); // Sort by token usage
    
    // Calculate percentages
    const totalTokens = projects.reduce((sum, p) => sum + p.tokensUsed, 0);
    projects.forEach(p => {
      p.percentageOfTotal = totalTokens > 0 ? Math.round((p.tokensUsed / totalTokens) * 100) : 0;
    });
    
    return {
      projects,
      totalProjects: projects.length,
      totalTokens,
      mostActive: projects[0] || null,
      snapshots: this.projectData!.snapshots
    };
  }

  /**
   * Get weekly project data
   */
  async getWeeklyProjectData() {
    const weekData = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const filePath = path.join(this.dataDir, `${dateStr}.json`);
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        weekData.push({
          date: dateStr,
          projects: data.projects || [],
          snapshots: data.snapshots || []
        });
      } catch (error) {
        // Day doesn't exist
        weekData.push({
          date: dateStr,
          projects: [],
          snapshots: []
        });
      }
    }
    
    return weekData.reverse();
  }

  /**
   * Get active project
   */
  getActiveProject(): string | null {
    return this.activeProject;
  }

  /**
   * Set active project manually
   */
  setActiveProject(projectPath: string) {
    this.activeProject = projectPath;
    logger.debug(`Active project set to: ${projectPath}`);
  }
}

// Export singleton instance
export const projectTracker = ProjectTracker.getInstance();