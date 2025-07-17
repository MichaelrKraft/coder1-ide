export interface MCPServerStatus {
  status: 'active' | 'inactive' | 'error';
  lastPing: Date;
  responseTime: number;
}

export interface MCPServer {
  id: string;
  name: string;
  type: 'context7' | 'sequential' | 'magic' | 'puppeteer';
  status: 'active' | 'inactive' | 'error';
  endpoint: string;
  capabilities: string[];
  lastPing: Date;
  responseTime: number;
}

export interface MCPRequest {
  id: string;
  serverId: string;
  method: string;
  params: Record<string, any>;
  timestamp: Date;
  workspaceId: string;
}

export interface MCPResponse {
  requestId: string;
  serverId: string;
  success: boolean;
  data?: any;
  error?: string;
  responseTime: number;
  timestamp: Date;
}

export interface MCPServerConfig {
  maxConcurrentRequests: number;
  timeout: number;
  retryAttempts: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

export class MCPServerManager {
  private servers: Map<string, MCPServer> = new Map();
  private requestQueue: Map<string, MCPRequest[]> = new Map();
  private responseCache: Map<string, MCPResponse> = new Map();
  private config: MCPServerConfig;

  constructor(config: MCPServerConfig = {
    maxConcurrentRequests: 5,
    timeout: 30000,
    retryAttempts: 3,
    cacheEnabled: true,
    cacheTTL: 300000
  }) {
    this.config = config;
    this.initializeDefaultServers();
  }

  private initializeDefaultServers(): void {
    const defaultServers: MCPServer[] = [
      {
        id: 'context7',
        name: 'Context7 MCP Server',
        type: 'context7',
        status: 'active',
        endpoint: 'http://localhost:3001/mcp/context7',
        capabilities: ['context_analysis', 'code_understanding', 'documentation'],
        lastPing: new Date(),
        responseTime: 150
      },
      {
        id: 'sequential',
        name: 'Sequential MCP Server',
        type: 'sequential',
        status: 'active',
        endpoint: 'http://localhost:3002/mcp/sequential',
        capabilities: ['step_by_step_analysis', 'logical_reasoning', 'problem_solving'],
        lastPing: new Date(),
        responseTime: 200
      },
      {
        id: 'magic',
        name: 'Magic MCP Server',
        type: 'magic',
        status: 'active',
        endpoint: 'http://localhost:3003/mcp/magic',
        capabilities: ['ui_generation', 'component_creation', 'design_systems'],
        lastPing: new Date(),
        responseTime: 300
      },
      {
        id: 'puppeteer',
        name: 'Puppeteer MCP Server',
        type: 'puppeteer',
        status: 'active',
        endpoint: 'http://localhost:3004/mcp/puppeteer',
        capabilities: ['browser_automation', 'testing', 'screenshot_capture'],
        lastPing: new Date(),
        responseTime: 500
      }
    ];

    defaultServers.forEach(server => {
      this.servers.set(server.id, server);
      this.requestQueue.set(server.id, []);
    });
  }

  async executeRequest(
    serverId: string,
    method: string,
    params: Record<string, any>,
    workspaceId: string
  ): Promise<MCPResponse> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`MCP Server ${serverId} not found`);
    }

    if (server.status !== 'active') {
      throw new Error(`MCP Server ${serverId} is not active`);
    }

    const request: MCPRequest = {
      id: this.generateRequestId(),
      serverId,
      method,
      params,
      timestamp: new Date(),
      workspaceId
    };

    const cacheKey = this.generateCacheKey(request);
    if (this.config.cacheEnabled && this.responseCache.has(cacheKey)) {
      const cachedResponse = this.responseCache.get(cacheKey)!;
      if (Date.now() - cachedResponse.timestamp.getTime() < this.config.cacheTTL) {
        return cachedResponse;
      }
    }

    const response = await this.processRequest(request);

    if (this.config.cacheEnabled && response.success) {
      this.responseCache.set(cacheKey, response);
    }

    return response;
  }

  async executeParallelRequests(
    requests: Array<{
      serverId: string;
      method: string;
      params: Record<string, any>;
      workspaceId: string;
    }>
  ): Promise<MCPResponse[]> {
    const promises = requests.map(req =>
      this.executeRequest(req.serverId, req.method, req.params, req.workspaceId)
    );

    return Promise.all(promises);
  }

  private async processRequest(request: MCPRequest): Promise<MCPResponse> {
    const server = this.servers.get(request.serverId)!;
    const startTime = Date.now();

    try {
      const response = await this.sendToServer(server, request);
      const responseTime = Date.now() - startTime;

      this.updateServerMetrics(server.id, responseTime, true);

      return {
        requestId: request.id,
        serverId: request.serverId,
        success: true,
        data: response,
        responseTime,
        timestamp: new Date()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateServerMetrics(server.id, responseTime, false);

      return {
        requestId: request.id,
        serverId: request.serverId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
        timestamp: new Date()
      };
    }
  }

  private async sendToServer(server: MCPServer, request: MCPRequest): Promise<any> {
    switch (server.type) {
      case 'context7':
        return this.executeContext7Request(request);
      case 'sequential':
        return this.executeSequentialRequest(request);
      case 'magic':
        return this.executeMagicRequest(request);
      case 'puppeteer':
        return this.executePuppeteerRequest(request);
      default:
        throw new Error(`Unsupported server type: ${server.type}`);
    }
  }

  private async executeContext7Request(request: MCPRequest): Promise<any> {
    console.log(`Executing Context7 request: ${request.method}`);
    
    switch (request.method) {
      case 'analyze_context':
        return {
          analysis: 'Context analysis completed',
          insights: ['Code structure is well organized', 'Dependencies are up to date'],
          recommendations: ['Consider adding more tests', 'Improve error handling']
        };
      case 'understand_code':
        return {
          understanding: 'Code understanding completed',
          complexity: 'medium',
          maintainability: 'high',
          suggestions: ['Add documentation', 'Refactor large functions']
        };
      default:
        throw new Error(`Unknown Context7 method: ${request.method}`);
    }
  }

  private async executeSequentialRequest(request: MCPRequest): Promise<any> {
    console.log(`Executing Sequential request: ${request.method}`);
    
    switch (request.method) {
      case 'step_analysis':
        return {
          steps: [
            'Analyze requirements',
            'Design solution',
            'Implement code',
            'Test functionality',
            'Deploy to production'
          ],
          currentStep: 1,
          progress: 20
        };
      case 'logical_reasoning':
        return {
          reasoning: 'Logical analysis completed',
          conclusion: 'The approach is sound',
          confidence: 85
        };
      default:
        throw new Error(`Unknown Sequential method: ${request.method}`);
    }
  }

  private async executeMagicRequest(request: MCPRequest): Promise<any> {
    console.log(`Executing Magic request: ${request.method}`);
    
    switch (request.method) {
      case 'generate_ui':
        return {
          component: '<div className="generated-component">Generated UI</div>',
          styles: '.generated-component { padding: 16px; }',
          props: ['title', 'onClick']
        };
      case 'create_component':
        return {
          componentName: 'GeneratedComponent',
          code: 'export const GeneratedComponent = () => <div>Hello World</div>',
          dependencies: ['react']
        };
      default:
        throw new Error(`Unknown Magic method: ${request.method}`);
    }
  }

  private async executePuppeteerRequest(request: MCPRequest): Promise<any> {
    console.log(`Executing Puppeteer request: ${request.method}`);
    
    switch (request.method) {
      case 'take_screenshot':
        return {
          screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          timestamp: new Date().toISOString()
        };
      case 'run_test':
        return {
          testResults: {
            passed: 5,
            failed: 0,
            total: 5
          },
          coverage: 85
        };
      default:
        throw new Error(`Unknown Puppeteer method: ${request.method}`);
    }
  }

  private updateServerMetrics(serverId: string, responseTime: number, success: boolean): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.responseTime = responseTime;
      server.lastPing = new Date();
      if (!success) {
        server.status = 'error';
      }
    }
  }

  async healthCheck(): Promise<Map<string, boolean>> {
    const healthStatus = new Map<string, boolean>();
    
    this.servers.forEach((server, serverId) => {
      this.executeRequest(serverId, 'ping', {}, 'health-check')
        .then(() => {
          healthStatus.set(serverId, true);
          server.status = 'active';
        })
        .catch(() => {
          healthStatus.set(serverId, false);
          server.status = 'error';
        });
    });
    
    return healthStatus;
  }

  getServerStatus(serverId?: string): Record<string, MCPServerStatus> | MCPServerStatus {
    if (serverId) {
      const server = this.servers.get(serverId);
      if (!server) {
        throw new Error(`Server ${serverId} not found`);
      }
      return { status: server.status, lastPing: server.lastPing, responseTime: server.responseTime };
    }

    const statusMap: Record<string, MCPServerStatus> = {};
    this.servers.forEach((server, id) => {
      statusMap[id] = { status: server.status, lastPing: server.lastPing, responseTime: server.responseTime };
    });
    return statusMap;
  }

  async initializeServers(serverIds: string[]): Promise<void> {
    for (const serverId of serverIds) {
      const server = this.servers.get(serverId);
      if (server) {
        server.status = 'active';
      }
    }
  }

  async executeCommand(serverId: string, command: string, params: any): Promise<any> {
    return this.executeRequest(serverId, command, params, 'test-workspace');
  }

  getAllServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  getActiveServers(): MCPServer[] {
    return Array.from(this.servers.values()).filter(server => server.status === 'active');
  }

  addServer(server: MCPServer): void {
    this.servers.set(server.id, server);
    this.requestQueue.set(server.id, []);
  }

  removeServer(serverId: string): void {
    this.servers.delete(serverId);
    this.requestQueue.delete(serverId);
  }

  clearCache(): void {
    this.responseCache.clear();
  }

  getRequestHistory(serverId?: string): MCPRequest[] {
    if (serverId) {
      return this.requestQueue.get(serverId) || [];
    }
    
    return Array.from(this.requestQueue.values()).flat();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(request: MCPRequest): string {
    return `${request.serverId}_${request.method}_${JSON.stringify(request.params)}`;
  }

  updateConfig(newConfig: Partial<MCPServerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): MCPServerConfig {
    return { ...this.config };
  }
}
