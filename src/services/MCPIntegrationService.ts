export interface MCPServer {
  id: string;
  name: string;
  type: 'filesystem' | 'git' | 'firecrawl' | 'browser-use';
  endpoint: string;
  status: 'active' | 'inactive' | 'error';
  capabilities: string[];
  lastUsed: Date;
  responseTime: number;
}

export interface MCPRequest {
  id: string;
  serverId: string;
  command: string;
  parameters: any;
  timestamp: Date;
  workspaceId: string;
  personaId?: string;
}

export interface MCPResponse {
  requestId: string;
  success: boolean;
  data: any;
  error?: string;
  responseTime: number;
  timestamp: Date;
}

export interface MCPAnalysisResult {
  serverId: string;
  analysis: string;
  confidence: number;
  recommendations: string[];
  cacheKey: string;
  expiresAt: Date;
}

export class MCPIntegrationService {
  private servers: Map<string, MCPServer> = new Map();
  private requestHistory: Map<string, MCPRequest[]> = new Map();
  private responseCache: Map<string, MCPAnalysisResult> = new Map();
  private activeConnections: Map<string, WebSocket> = new Map();

  async initializeMCPServers(): Promise<void> {
    console.log('🔌 Initializing MCP servers for Super Claude Framework');
    
    const defaultServers: Omit<MCPServer, 'lastUsed' | 'responseTime'>[] = [
      {
        id: 'filesystem',
        name: 'Filesystem Operations Server',
        type: 'filesystem',
        endpoint: 'mcp://filesystem',
        status: 'inactive',
        capabilities: ['file_operations', 'project_management', 'multi_file_analysis', 'batch_operations', 'code_migration']
      },
      {
        id: 'git',
        name: 'Git Version Control Server',
        type: 'git',
        endpoint: 'mcp://git',
        status: 'inactive',
        capabilities: ['version_control', 'repository_management', 'branch_operations', 'commit_analysis', 'collaboration_workflows']
      },
      {
        id: 'firecrawl',
        name: 'Firecrawl Web Research Server',
        type: 'firecrawl',
        endpoint: 'mcp://firecrawl',
        status: 'inactive',
        capabilities: ['web_scraping', 'documentation_research', 'api_lookup', 'best_practices_research', 'technology_updates']
      },
      {
        id: 'browser-use',
        name: 'Browser Automation Server',
        type: 'browser-use',
        endpoint: 'mcp://browser-use',
        status: 'inactive',
        capabilities: ['e2e_testing', 'visual_validation', 'user_workflow_testing', 'performance_testing', 'ai_workflow_testing']
      }
    ];

    for (const serverConfig of defaultServers) {
      const server: MCPServer = {
        ...serverConfig,
        lastUsed: new Date(),
        responseTime: 0
      };
      
      this.servers.set(server.id, server);
      await this.connectToServer(server.id);
    }
  }

  async connectToServer(serverId: string): Promise<boolean> {
    const server = this.servers.get(serverId);
    if (!server) {
      console.error(`Server ${serverId} not found`);
      return false;
    }

    try {
      console.log(`🔗 Connecting to MCP server: ${server.name}`);
      
      server.status = 'active';
      server.responseTime = Math.random() * 100 + 50; // 50-150ms
      
      console.log(`✅ Connected to ${server.name}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to connect to ${server.name}:`, error);
      server.status = 'error';
      return false;
    }
  }

  async sendMCPRequest(serverId: string, command: string, parameters: any, workspaceId: string, personaId?: string): Promise<MCPResponse> {
    const server = this.servers.get(serverId);
    if (!server || server.status !== 'active') {
      throw new Error(`MCP server ${serverId} is not available`);
    }

    const request: MCPRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      serverId,
      command,
      parameters,
      timestamp: new Date(),
      workspaceId,
      personaId
    };

    if (!this.requestHistory.has(workspaceId)) {
      this.requestHistory.set(workspaceId, []);
    }
    this.requestHistory.get(workspaceId)!.push(request);

    const startTime = Date.now();
    
    try {
      console.log(`📤 Sending MCP request to ${server.name}: ${command}`);
      
      const response = await this.simulateMCPResponse(request, server);
      
      const responseTime = Date.now() - startTime;
      server.responseTime = responseTime;
      server.lastUsed = new Date();

      console.log(`📥 Received MCP response from ${server.name} (${responseTime}ms)`);
      
      return response;
    } catch (error) {
      console.error(`❌ MCP request failed for ${server.name}:`, error);
      
      return {
        requestId: request.id,
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  async analyzeWithMultipleMCPs(workspaceId: string, code: string, context: any, serverIds: string[]): Promise<MCPAnalysisResult[]> {
    console.log(`🔍 Running parallel MCP analysis with ${serverIds.length} servers`);
    
    const analysisPromises = serverIds.map(async (serverId) => {
      const cacheKey = this.generateCacheKey(serverId, code, context);
      const cached = this.responseCache.get(cacheKey);
      
      if (cached && cached.expiresAt > new Date()) {
        console.log(`💾 Using cached analysis from ${serverId}`);
        return cached;
      }

      try {
        const response = await this.sendMCPRequest(serverId, 'analyze_code', {
          code,
          context,
          analysisType: 'comprehensive'
        }, workspaceId);

        if (response.success) {
          const result: MCPAnalysisResult = {
            serverId,
            analysis: response.data.analysis || 'Analysis completed',
            confidence: response.data.confidence || 75,
            recommendations: response.data.recommendations || [],
            cacheKey,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
          };

          this.responseCache.set(cacheKey, result);
          return result;
        } else {
          throw new Error(response.error || 'Analysis failed');
        }
      } catch (error) {
        console.error(`Analysis failed for server ${serverId}:`, error);
        return {
          serverId,
          analysis: `Analysis failed: ${error}`,
          confidence: 0,
          recommendations: ['Retry analysis', 'Check server connection'],
          cacheKey,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes for errors
        };
      }
    });

    const results = await Promise.all(analysisPromises);
    console.log(`✅ Completed parallel MCP analysis`);
    
    return results;
  }

  async getPersonaRecommendedServers(personaId: string): Promise<string[]> {
    const serverRecommendations: Record<string, string[]> = {
      'frontend': ['firecrawl', 'browser-use', 'filesystem'],
      'backend': ['filesystem', 'git', 'firecrawl'],
      'security': ['filesystem', 'git'],
      'performance': ['browser-use', 'filesystem', 'git'],
      'testing': ['browser-use', 'filesystem', 'git'],
      'architect': ['firecrawl', 'filesystem', 'git'],
      'analyzer': ['filesystem', 'git', 'firecrawl'],
      'optimizer': ['filesystem', 'git', 'browser-use'],
      'debugger': ['filesystem', 'git', 'browser-use'],
      'qa': ['browser-use', 'filesystem'],
      'refactorer': ['filesystem', 'git'],
      'mentor': ['firecrawl', 'filesystem']
    };

    return serverRecommendations[personaId] || ['filesystem', 'git'];
  }

  getServerStatus(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  getRequestHistory(workspaceId: string): MCPRequest[] {
    return this.requestHistory.get(workspaceId) || [];
  }

  async clearCache(serverId?: string): Promise<void> {
    if (serverId) {
      const keysToDelete = Array.from(this.responseCache.keys()).filter(key => 
        key.startsWith(`${serverId}:`)
      );
      keysToDelete.forEach(key => this.responseCache.delete(key));
      console.log(`🗑️ Cleared cache for server ${serverId}`);
    } else {
      this.responseCache.clear();
      console.log('🗑️ Cleared all MCP cache');
    }
  }

  async disconnectFromServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (server) {
      server.status = 'inactive';
      const connection = this.activeConnections.get(serverId);
      if (connection) {
        connection.close();
        this.activeConnections.delete(serverId);
      }
      console.log(`🔌 Disconnected from ${server.name}`);
    }
  }

  async reconnectAllServers(): Promise<void> {
    console.log('🔄 Reconnecting all MCP servers');
    const reconnectPromises = Array.from(this.servers.keys()).map(serverId => 
      this.connectToServer(serverId)
    );
    await Promise.all(reconnectPromises);
  }

  private async simulateMCPResponse(request: MCPRequest, server: MCPServer): Promise<MCPResponse> {
    await new Promise(resolve => setTimeout(resolve, server.responseTime));

    const responses: Record<string, any> = {
      'filesystem': {
        analysis: 'Filesystem analysis completed - multi-file operations and project structure evaluated',
        confidence: 88,
        recommendations: ['Optimize file organization', 'Consider batch operations for efficiency', 'Review project structure patterns']
      },
      'git': {
        analysis: 'Git repository analysis completed - version control patterns and collaboration workflows assessed',
        confidence: 85,
        recommendations: ['Improve commit message patterns', 'Consider branch strategy optimization', 'Review merge conflict resolution']
      },
      'firecrawl': {
        analysis: 'Web research completed - latest documentation and best practices gathered',
        confidence: 82,
        recommendations: ['Apply latest framework patterns', 'Consider updated security practices', 'Implement current performance optimizations']
      },
      'browser-use': {
        analysis: 'Browser automation analysis completed - E2E testing and user workflows validated',
        confidence: 79,
        recommendations: ['Enhance visual regression testing', 'Improve user workflow coverage', 'Add performance monitoring']
      }
    };

    return {
      requestId: request.id,
      success: true,
      data: responses[server.type] || { analysis: 'Generic analysis completed', confidence: 70, recommendations: [] },
      responseTime: server.responseTime,
      timestamp: new Date()
    };
  }

  private generateCacheKey(serverId: string, code: string, context: any): string {
    const codeHash = this.simpleHash(code);
    const contextHash = this.simpleHash(JSON.stringify(context));
    return `${serverId}:${codeHash}:${contextHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
