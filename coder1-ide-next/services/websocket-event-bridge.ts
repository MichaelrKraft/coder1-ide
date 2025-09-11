/**
 * WebSocket Event Bridge
 * 
 * Forwards Claude Code Bridge Service events to the global WebSocket server
 * so the dashboard receives real-time updates for automated teams.
 */

import { Server as SocketIOServer } from 'socket.io';
import { getClaudeCodeBridgeService } from './claude-code-bridge';
import { logger } from '../lib/logger';

export class WebSocketEventBridge {
  private bridgeService = getClaudeCodeBridgeService();
  private socketServer: SocketIOServer | null = null;
  private isConnected = false;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Connect to the global Socket.IO server
   */
  connectToSocketServer(io: SocketIOServer): void {
    this.socketServer = io;
    this.isConnected = true;
    logger.info('🔗 WebSocket Event Bridge connected to global Socket.IO server');
  }

  /**
   * Setup event listeners for bridge service events
   */
  private setupEventListeners(): void {
    // Team spawned and ready for execution
    this.bridgeService.on('team:ready', (data) => {
      this.forwardEvent('ai-team:spawned', {
        teamId: data.teamId,
        sessionId: data.team.sessionId,
        agents: data.team.agents.map((agent: any, index: number) => ({
          id: `agent_${index + 1}`,
          name: agent.name,
          role: agent.role,
          status: agent.status,
          progress: agent.progress,
          currentTask: agent.currentTask,
          completedTasks: agent.completedTasks,
          expertise: []
        })),
        status: data.team.status,
        requirement: data.requirement,
        workflow: data.team.workflow,
        costSavings: true,
        executionType: 'automated-claude-code',
        automatedExecution: true
      });
    });

    // Automated execution started
    this.bridgeService.on('team:execution-started', (data) => {
      this.forwardEvent('ai-team:started', {
        teamId: data.teamId,
        sessionId: data.team.sessionId,
        agents: data.team.agents.map((agent: any, index: number) => ({
          id: `agent_${index + 1}`,
          name: agent.name,
          role: agent.role,
          status: agent.status,
          progress: agent.progress,
          currentTask: agent.currentTask,
          completedTasks: agent.completedTasks,
          expertise: []
        })),
        status: data.team.status,
        workflow: data.team.workflow,
        requirement: data.team.projectRequirement,
        automatedProcesses: data.automatedProcesses,
        costSavings: true,
        executionType: 'automated-claude-code'
      });
    });

    // Individual agent progress updates
    this.bridgeService.on('agent:progress', (data) => {
      // Find the team to get complete context
      const team = this.bridgeService.getTeamStatus(data.teamId);
      if (team) {
        this.forwardEvent('ai-team:progress', {
          teamId: data.teamId,
          sessionId: team.sessionId,
          agents: team.agents.map((agent, index) => ({
            id: `agent_${index + 1}`,
            name: agent.name,
            role: agent.role,
            status: agent.status,
            progress: agent.progress,
            currentTask: agent.currentTask,
            completedTasks: agent.completedTasks,
            expertise: [],
            files: agent.files
          })),
          progress: team.progress,
          status: team.status,
          workflow: team.workflow,
          generatedFiles: team.files || team.agents.reduce((sum: any, a: any) => sum + a.files, 0),
          activeAgents: team.agents.filter(a => a.status === 'working').length,
          lastUpdate: new Date().toISOString(),
          costSavings: true,
          executionType: 'automated-claude-code'
        });
      }
    });

    // Team overall progress updates
    this.bridgeService.on('team:progress', (data) => {
      this.forwardEvent('ai-team:progress', {
        teamId: data.teamId,
        sessionId: data.team.sessionId,
        agents: data.team.agents.map((agent: any, index: number) => ({
          id: `agent_${index + 1}`,
          name: agent.name,
          role: agent.role,
          status: agent.status,
          progress: agent.progress,
          currentTask: agent.currentTask,
          completedTasks: agent.completedTasks,
          expertise: [],
          files: agent.files
        })),
        progress: data.progress,
        status: data.team.status,
        workflow: data.team.workflow,
        generatedFiles: data.team.files || data.team.agents.reduce((sum: any, a: any) => sum + a.files, 0),
        activeAgents: data.activeAgents,
        completedAgents: data.completedAgents,
        lastUpdate: new Date().toISOString(),
        costSavings: true,
        executionType: 'automated-claude-code'
      });
    });

    // Team completed
    this.bridgeService.on('team:completed', (data) => {
      this.forwardEvent('ai-team:completed', {
        teamId: data.teamId,
        sessionId: data.team.sessionId,
        agents: data.team.agents.map((agent: any, index: number) => ({
          id: `agent_${index + 1}`,
          name: agent.name,
          role: agent.role,
          status: agent.status,
          progress: agent.progress,
          currentTask: agent.currentTask,
          completedTasks: agent.completedTasks,
          expertise: []
        })),
        duration: data.duration,
        generatedFiles: data.totalFiles,
        workflow: data.team.workflow,
        files: data.team.files || [],
        costSavings: true,
        executionType: 'automated-claude-code',
        totalCommits: data.totalCommits
      });
    });

    // Team work merged
    this.bridgeService.on('team:merged', (data) => {
      this.forwardEvent('ai-team:merged', {
        teamId: data.teamId,
        mergedBranches: data.mergedBranches,
        totalBranches: data.totalBranches,
        success: data.success,
        costSavings: true,
        executionType: 'automated-claude-code'
      });
    });

    // Team stopped
    this.bridgeService.on('team:stopped', (data) => {
      this.forwardEvent('ai-team:stopped', {
        teamId: data.teamId,
        sessionId: data.team.sessionId,
        agents: data.team.agents.map((agent: any, index: number) => ({
          id: `agent_${index + 1}`,
          name: agent.name,
          role: agent.role,
          status: 'stopped',
          progress: agent.progress,
          currentTask: 'Stopped by user',
          completedTasks: agent.completedTasks,
          expertise: []
        })),
        status: 'stopped',
        duration: data.team.completedAt && data.team.startedAt ? 
          data.team.completedAt.getTime() - data.team.startedAt.getTime() : null,
        generatedFiles: data.team.files || data.team.agents.reduce((sum: any, a: any) => sum + a.files, 0),
        workflow: data.team.workflow,
        costSavings: true,
        executionType: 'automated-claude-code'
      });
    });

    logger.info('🔗 WebSocket Event Bridge listeners setup complete');
  }

  /**
   * Forward an event to the global Socket.IO server
   */
  private forwardEvent(eventName: string, data: any): void {
    if (!this.isConnected || !this.socketServer) {
      logger.warn(`⚠️ WebSocket Event Bridge not connected, dropping event: ${eventName}`);
      return;
    }

    try {
      this.socketServer.emit(eventName, data);
      logger.debug(`🔗 Forwarded event: ${eventName} for team ${data.teamId}`);
    } catch (error) {
      logger.error(`❌ Failed to forward event ${eventName}:`, error);
    }
  }

  /**
   * Disconnect from socket server
   */
  disconnect(): void {
    this.socketServer = null;
    this.isConnected = false;
    logger.info('🔗 WebSocket Event Bridge disconnected');
  }
}

// Singleton instance
let instance: WebSocketEventBridge | null = null;

export function getWebSocketEventBridge(): WebSocketEventBridge {
  if (!instance) {
    instance = new WebSocketEventBridge();
  }
  return instance;
}