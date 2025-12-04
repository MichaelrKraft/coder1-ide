/**
 * Sandbox Coordinator MCP Server
 * 
 * Coordinates multiple parallel exploration agents to prevent duplication
 * and ensure meaningful diversity across variations.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Types
interface AgentRegistration {
  id: string;
  sessionId: string;
  strategy: string;
  approachSummary: string;
  focusDimensions: string[];
  status: 'researching' | 'implementing' | 'evaluating' | 'completed' | 'failed';
  registeredAt: Date;
  lastUpdate: Date;
  progress?: number; // 0-100
  uniqueElements?: string[];
}

interface Session {
  id: string;
  task: string;
  agentCount: number;
  agents: Map<string, AgentRegistration>;
  createdAt: Date;
  completedAt?: Date;
}

interface SimilarityCheck {
  agentId: string;
  similarity: number;
  sharedDimensions: string[];
  warning?: string;
}

class SandboxCoordinatorServer {
  private server: Server;
  private sessions: Map<string, Session> = new Map();
  private similarityThreshold = 0.6; // 60% similarity triggers warning

  constructor() {
    this.server = new Server(
      {
        name: "sandbox-coordinator",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Calculate Jaccard similarity between two text strings
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Calculate similarity between two agents based on multiple factors
   */
  private calculateAgentSimilarity(agent1: AgentRegistration, agent2: AgentRegistration): SimilarityCheck {
    let totalSimilarity = 0;
    let factorCount = 0;
    const sharedDimensions: string[] = [];

    // 1. Approach summary similarity (weight: 40%)
    const approachSim = this.calculateTextSimilarity(agent1.approachSummary, agent2.approachSummary);
    totalSimilarity += approachSim * 0.4;
    factorCount++;

    // 2. Focus dimensions overlap (weight: 40%)
    const dims1 = new Set(agent1.focusDimensions);
    const dims2 = new Set(agent2.focusDimensions);
    const sharedDims = [...dims1].filter(d => dims2.has(d));
    const dimSimilarity = sharedDims.length / Math.max(dims1.size, dims2.size);
    totalSimilarity += dimSimilarity * 0.4;
    sharedDimensions.push(...sharedDims);

    // 3. Strategy name similarity (weight: 20%)
    const strategySim = this.calculateTextSimilarity(agent1.strategy, agent2.strategy);
    totalSimilarity += strategySim * 0.2;
    factorCount++;

    const finalSimilarity = totalSimilarity;

    // Generate warning if too similar
    let warning: string | undefined;
    if (finalSimilarity > this.similarityThreshold) {
      warning = `⚠️ High similarity (${Math.round(finalSimilarity * 100)}%) detected. Consider adjusting approach to be more distinctive.`;
    }

    return {
      agentId: agent2.id,
      similarity: finalSimilarity,
      sharedDimensions,
      warning
    };
  }

  /**
   * Create or get session
   */
  private getOrCreateSession(sessionId: string, task: string, agentCount: number): Session {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        task,
        agentCount,
        agents: new Map(),
        createdAt: new Date()
      });
    }
    return this.sessions.get(sessionId)!;
  }

  /**
   * Register a new agent
   */
  private registerAgent(params: {
    sessionId: string;
    task: string;
    agentCount: number;
    agentId: string;
    strategy: string;
    approachSummary: string;
    focusDimensions: string[];
    uniqueElements?: string[];
  }): AgentRegistration {
    const session = this.getOrCreateSession(params.sessionId, params.task, params.agentCount);

    const registration: AgentRegistration = {
      id: params.agentId,
      sessionId: params.sessionId,
      strategy: params.strategy,
      approachSummary: params.approachSummary,
      focusDimensions: params.focusDimensions,
      status: 'researching',
      registeredAt: new Date(),
      lastUpdate: new Date(),
      progress: 0,
      uniqueElements: params.uniqueElements || []
    };

    session.agents.set(params.agentId, registration);

    console.error(`[Coordinator] Agent ${params.agentId} registered for session ${params.sessionId}`);
    console.error(`[Coordinator] Strategy: ${params.strategy}`);
    console.error(`[Coordinator] Approach: ${params.approachSummary}`);

    return registration;
  }

  /**
   * Check agent against other agents for similarity
   */
  private checkOtherAgents(sessionId: string, agentId: string): {
    agents: Array<{
      id: string;
      strategy: string;
      approachSummary: string;
      focusDimensions: string[];
      status: string;
      progress?: number;
    }>;
    similarities: SimilarityCheck[];
    maxSimilarity: number;
    hasConflict: boolean;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        agents: [],
        similarities: [],
        maxSimilarity: 0,
        hasConflict: false
      };
    }

    const currentAgent = session.agents.get(agentId);
    if (!currentAgent) {
      return {
        agents: [],
        similarities: [],
        maxSimilarity: 0,
        hasConflict: false
      };
    }

    // Get all other agents
    const otherAgents = Array.from(session.agents.values())
      .filter(a => a.id !== agentId)
      .map(a => ({
        id: a.id,
        strategy: a.strategy,
        approachSummary: a.approachSummary,
        focusDimensions: a.focusDimensions,
        status: a.status,
        progress: a.progress
      }));

    // Calculate similarities
    const similarities = Array.from(session.agents.values())
      .filter(a => a.id !== agentId)
      .map(a => this.calculateAgentSimilarity(currentAgent, a));

    const maxSimilarity = similarities.length > 0 
      ? Math.max(...similarities.map(s => s.similarity))
      : 0;

    const hasConflict = maxSimilarity > this.similarityThreshold;

    return {
      agents: otherAgents,
      similarities,
      maxSimilarity,
      hasConflict
    };
  }

  /**
   * Update agent progress
   */
  private updateProgress(sessionId: string, agentId: string, params: {
    status?: AgentRegistration['status'];
    progress?: number;
    approachSummary?: string;
    focusDimensions?: string[];
  }): AgentRegistration | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const agent = session.agents.get(agentId);
    if (!agent) return null;

    // Update fields
    if (params.status) agent.status = params.status;
    if (params.progress !== undefined) agent.progress = params.progress;
    if (params.approachSummary) agent.approachSummary = params.approachSummary;
    if (params.focusDimensions) agent.focusDimensions = params.focusDimensions;
    agent.lastUpdate = new Date();

    console.error(`[Coordinator] Agent ${agentId} updated: ${agent.status} (${agent.progress}%)`);

    return agent;
  }

  /**
   * Get session status
   */
  private getSessionStatus(sessionId: string): {
    session: {
      id: string;
      task: string;
      agentCount: number;
      createdAt: Date;
      completedAt?: Date;
    };
    agents: Array<{
      id: string;
      strategy: string;
      status: string;
      progress: number;
    }>;
    diversity: {
      averageSimilarity: number;
      minSimilarity: number;
      maxSimilarity: number;
      diversityScore: number; // 0-100, higher is better
    };
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const agents = Array.from(session.agents.values()).map(a => ({
      id: a.id,
      strategy: a.strategy,
      status: a.status,
      progress: a.progress || 0
    }));

    // Calculate diversity metrics
    const agentList = Array.from(session.agents.values());
    const similarities: number[] = [];

    for (let i = 0; i < agentList.length; i++) {
      for (let j = i + 1; j < agentList.length; j++) {
        const sim = this.calculateAgentSimilarity(agentList[i], agentList[j]);
        similarities.push(sim.similarity);
      }
    }

    const averageSimilarity = similarities.length > 0
      ? similarities.reduce((a, b) => a + b, 0) / similarities.length
      : 0;

    const minSimilarity = similarities.length > 0 ? Math.min(...similarities) : 0;
    const maxSimilarity = similarities.length > 0 ? Math.max(...similarities) : 0;
    const diversityScore = Math.round((1 - averageSimilarity) * 100);

    return {
      session: {
        id: session.id,
        task: session.task,
        agentCount: session.agentCount,
        createdAt: session.createdAt,
        completedAt: session.completedAt
      },
      agents,
      diversity: {
        averageSimilarity,
        minSimilarity,
        maxSimilarity,
        diversityScore
      }
    };
  }

  /**
   * Report conflict between agents
   */
  private reportConflict(params: {
    sessionId: string;
    agentId: string;
    conflictingAgentId: string;
    reason: string;
  }): {
    acknowledged: boolean;
    recommendation: string;
  } {
    console.error(`[Coordinator] Conflict reported in session ${params.sessionId}:`);
    console.error(`  Agent ${params.agentId} conflicts with ${params.conflictingAgentId}`);
    console.error(`  Reason: ${params.reason}`);

    // Simple recommendation: adjust the reporting agent's approach
    return {
      acknowledged: true,
      recommendation: `Agent ${params.agentId} should adjust their approach to be more distinctive from ${params.conflictingAgentId}. Consider emphasizing different dimensions or unique elements.`
    };
  }

  /**
   * Complete session
   */
  private completeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.completedAt = new Date();
      console.error(`[Coordinator] Session ${sessionId} completed`);
      
      // Optional: Clean up old sessions after some time
      // For now, keep them for debugging
    }
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: "register_agent",
          description: "Register a new agent in a parallel exploration session",
          inputSchema: {
            type: "object",
            properties: {
              sessionId: { type: "string", description: "Exploration session ID" },
              task: { type: "string", description: "The task being explored" },
              agentCount: { type: "number", description: "Total number of agents in session" },
              agentId: { type: "string", description: "Unique agent identifier" },
              strategy: { type: "string", description: "Strategy name (e.g., 'Minimalist Hero Focus')" },
              approachSummary: { type: "string", description: "Brief summary of agent's approach" },
              focusDimensions: { type: "array", items: { type: "string" }, description: "Key dimensions this agent varies on" },
              uniqueElements: { type: "array", items: { type: "string" }, description: "Unique elements of this approach" }
            },
            required: ["sessionId", "task", "agentCount", "agentId", "strategy", "approachSummary", "focusDimensions"]
          }
        },
        {
          name: "check_other_agents",
          description: "Check what other agents are doing to avoid duplication",
          inputSchema: {
            type: "object",
            properties: {
              sessionId: { type: "string", description: "Session ID" },
              agentId: { type: "string", description: "Your agent ID" }
            },
            required: ["sessionId", "agentId"]
          }
        },
        {
          name: "update_progress",
          description: "Update agent's current status and progress",
          inputSchema: {
            type: "object",
            properties: {
              sessionId: { type: "string" },
              agentId: { type: "string" },
              status: { 
                type: "string", 
                enum: ["researching", "implementing", "evaluating", "completed", "failed"]
              },
              progress: { type: "number", description: "0-100" },
              approachSummary: { type: "string", description: "Updated approach summary" },
              focusDimensions: { type: "array", items: { type: "string" } }
            },
            required: ["sessionId", "agentId"]
          }
        },
        {
          name: "get_session_status",
          description: "Get overall session status and diversity metrics",
          inputSchema: {
            type: "object",
            properties: {
              sessionId: { type: "string" }
            },
            required: ["sessionId"]
          }
        },
        {
          name: "report_conflict",
          description: "Report that another agent's approach is too similar",
          inputSchema: {
            type: "object",
            properties: {
              sessionId: { type: "string" },
              agentId: { type: "string", description: "Your agent ID" },
              conflictingAgentId: { type: "string", description: "ID of conflicting agent" },
              reason: { type: "string", description: "Why approaches are too similar" }
            },
            required: ["sessionId", "agentId", "conflictingAgentId", "reason"]
          }
        },
        {
          name: "complete_session",
          description: "Mark session as complete",
          inputSchema: {
            type: "object",
            properties: {
              sessionId: { type: "string" }
            },
            required: ["sessionId"]
          }
        }
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "register_agent": {
            const result = this.registerAgent(args as any);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          }

          case "check_other_agents": {
            const { sessionId, agentId } = args as any;
            const result = this.checkOtherAgents(sessionId, agentId);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          }

          case "update_progress": {
            const { sessionId, agentId, ...updates } = args as any;
            const result = this.updateProgress(sessionId, agentId, updates);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result || { error: "Agent not found" }, null, 2)
              }]
            };
          }

          case "get_session_status": {
            const { sessionId } = args as any;
            const result = this.getSessionStatus(sessionId);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result || { error: "Session not found" }, null, 2)
              }]
            };
          }

          case "report_conflict": {
            const result = this.reportConflict(args as any);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            };
          }

          case "complete_session": {
            const { sessionId } = args as any;
            this.completeSession(sessionId);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ success: true, sessionId }, null, 2)
              }]
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: errorMessage })
          }],
          isError: true
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[Coordinator] Sandbox Coordinator MCP server started');
  }
}

// Start server
const server = new SandboxCoordinatorServer();
server.run().catch(console.error);
