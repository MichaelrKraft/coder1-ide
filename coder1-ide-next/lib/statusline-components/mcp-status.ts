/**
 * MCP Status Component
 * 
 * MCP (Model Context Protocol) server health and connection monitoring
 * Based on claude-code-statusline mcp_status.sh
 */

'use client';

// Mock logger for client-side usage
const logger = {
  debug: (...args: any[]) => console.debug('[MCPStatus]', ...args),
  info: (...args: any[]) => console.info('[MCPStatus]', ...args),
  warn: (...args: any[]) => console.warn('[MCPStatus]', ...args),
  error: (...args: any[]) => console.error('[MCPStatus]', ...args),
};

export interface MCPServerInfo {
  name: string;
  url?: string;
  status: 'connected' | 'disconnected' | 'error' | 'unknown';
  lastCheck: number;
  responseTime?: number;
  version?: string;
  capabilities?: string[];
  errorMessage?: string;
}

export interface MCPStatusData {
  servers: MCPServerInfo[];
  totalServers: number;
  connectedCount: number;
  overallStatus: 'healthy' | 'partial' | 'down' | 'unknown';
  lastUpdate: number;
  averageResponseTime: number;
}

// Known MCP servers that might be available
const KNOWN_MCP_SERVERS = [
  { name: 'filesystem', endpoint: '/mcp/filesystem' },
  { name: 'git', endpoint: '/mcp/git' },
  { name: 'browser-use', endpoint: '/mcp/browser' },
  { name: 'firecrawl', endpoint: '/mcp/firecrawl' },
  { name: 'coder1-intelligence', endpoint: '/mcp/intelligence' }
];

export class MCPStatusComponent {
  private cachedData: MCPStatusData | null = null;
  private cacheExpiry = 0;
  private cacheTimeout = 15000; // 15 seconds
  private subscribers: Set<(data: MCPStatusData) => void> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;
  private healthCheckTimeout = 5000; // 5 seconds per server

  constructor() {
    logger.debug('[MCPStatus] Component initialized');
  }

  /**
   * Start automatic MCP monitoring
   */
  public start(): void {
    this.update();
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Update every 30 seconds
    this.updateInterval = setInterval(() => {
      this.update();
    }, 30000);

    logger.debug('[MCPStatus] Started monitoring');
  }

  /**
   * Stop automatic updates
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    logger.debug('[MCPStatus] Stopped monitoring');
  }

  /**
   * Get MCP status data
   */
  public async getMCPStatus(forceRefresh = false): Promise<MCPStatusData> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (!forceRefresh && this.cachedData && now < this.cacheExpiry) {
      return this.cachedData;
    }

    try {
      const mcpData = await this.gatherMCPStatus();
      
      this.cachedData = mcpData;
      this.cacheExpiry = now + this.cacheTimeout;
      
      return mcpData;
    } catch (error) {
      logger.error('[MCPStatus] Failed to get MCP status:', error);
      
      // Return cached data or fallback
      return this.cachedData || this.createFallbackData();
    }
  }

  /**
   * Format MCP status for display
   */
  public formatDisplay(template: string = '🔗 {status}', data?: MCPStatusData): string {
    const mcpData = data || this.cachedData || this.createFallbackData();
    
    const statusIcon = this.getStatusIcon(mcpData.overallStatus);
    const connectedRatio = `${mcpData.connectedCount}/${mcpData.totalServers}`;
    const avgResponseTime = mcpData.averageResponseTime > 0 
      ? `${Math.round(mcpData.averageResponseTime)}ms`
      : 'n/a';

    return template
      .replace('{status}', mcpData.overallStatus)
      .replace('{icon}', statusIcon)
      .replace('{connected}', mcpData.connectedCount.toString())
      .replace('{total}', mcpData.totalServers.toString())
      .replace('{ratio}', connectedRatio)
      .replace('{response}', avgResponseTime)
      .replace('{servers}', mcpData.servers.map(s => s.name).join(','));
  }

  /**
   * Subscribe to MCP status updates
   */
  public subscribe(callback: (data: MCPStatusData) => void): () => void {
    this.subscribers.add(callback);
    
    // Send current data immediately if available
    if (this.cachedData) {
      try {
        callback(this.cachedData);
      } catch (error) {
        logger.error('[MCPStatus] Immediate callback error:', error);
      }
    } else {
      // Trigger initial update
      this.update();
    }
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Check specific MCP server
   */
  public async checkServer(serverName: string): Promise<MCPServerInfo | null> {
    const server = KNOWN_MCP_SERVERS.find(s => s.name === serverName);
    if (!server) return null;

    return await this.performHealthCheck(server);
  }

  /**
   * Get detailed server information
   */
  public async getServerDetails(serverName: string): Promise<MCPServerInfo | null> {
    const currentData = await this.getMCPStatus();
    return currentData.servers.find(s => s.name === serverName) || null;
  }

  /**
   * Get MCP server list from API
   */
  public async getAvailableServers(): Promise<string[]> {
    try {
      const response = await fetch('/api/mcp/list', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        return data.servers || [];
      }
    } catch (error) {
      logger.error('[MCPStatus] Failed to get server list:', error);
    }

    // Fallback to known servers
    return KNOWN_MCP_SERVERS.map(s => s.name);
  }

  // Private methods

  private async update(): Promise<void> {
    try {
      const mcpData = await this.getMCPStatus(true);
      this.notifySubscribers(mcpData);
    } catch (error) {
      logger.error('[MCPStatus] Update error:', error);
    }
  }

  private async gatherMCPStatus(): Promise<MCPStatusData> {
    const startTime = performance.now();
    
    // Get available servers
    const availableServers = await this.getAvailableServers();
    
    // Check each server in parallel
    const serverChecks = availableServers.map(async (serverName) => {
      const server = KNOWN_MCP_SERVERS.find(s => s.name === serverName) || { name: serverName, endpoint: `/mcp/${serverName}` };
      return await this.performHealthCheck(server);
    });

    const serverResults = await Promise.allSettled(serverChecks);
    const servers: MCPServerInfo[] = [];

    serverResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        servers.push(result.value);
      } else {
        // Add failed server with error status
        servers.push({
          name: availableServers[index],
          status: 'error',
          lastCheck: Date.now(),
          errorMessage: result.status === 'rejected' ? result.reason?.message : 'Health check failed'
        });
      }
    });

    const connectedCount = servers.filter(s => s.status === 'connected').length;
    const totalServers = servers.length;
    
    const overallStatus = this.determineOverallStatus(connectedCount, totalServers);
    
    // Calculate average response time
    const connectedServers = servers.filter(s => s.responseTime && s.responseTime > 0);
    const averageResponseTime = connectedServers.length > 0
      ? connectedServers.reduce((sum, s) => sum + (s.responseTime || 0), 0) / connectedServers.length
      : 0;

    const endTime = performance.now();
    logger.debug(`[MCPStatus] Status check completed in ${(endTime - startTime).toFixed(2)}ms`);

    return {
      servers,
      totalServers,
      connectedCount,
      overallStatus,
      lastUpdate: Date.now(),
      averageResponseTime: Math.round(averageResponseTime)
    };
  }

  private async performHealthCheck(server: { name: string; endpoint: string }): Promise<MCPServerInfo> {
    const startTime = performance.now();
    
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), this.healthCheckTimeout);
      });

      // Perform health check with timeout
      const healthCheckPromise = fetch(`/api${server.endpoint}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await Promise.race([healthCheckPromise, timeoutPromise]);
      const responseTime = performance.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        
        return {
          name: server.name,
          url: server.endpoint,
          status: 'connected',
          lastCheck: Date.now(),
          responseTime: Math.round(responseTime),
          version: data.version,
          capabilities: data.capabilities || []
        };
      } else {
        return {
          name: server.name,
          url: server.endpoint,
          status: 'error',
          lastCheck: Date.now(),
          responseTime: Math.round(responseTime),
          errorMessage: `HTTP ${response.status}: ${response.statusText}`
        };
      }

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      return {
        name: server.name,
        url: server.endpoint,
        status: error instanceof Error && error.message === 'Timeout' ? 'disconnected' : 'error',
        lastCheck: Date.now(),
        responseTime: Math.round(responseTime),
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private determineOverallStatus(connected: number, total: number): MCPStatusData['overallStatus'] {
    if (total === 0) return 'unknown';
    if (connected === total) return 'healthy';
    if (connected > 0) return 'partial';
    return 'down';
  }

  private getStatusIcon(status: MCPStatusData['overallStatus']): string {
    switch (status) {
      case 'healthy': return '🟢';
      case 'partial': return '🟡';
      case 'down': return '🔴';
      default: return '⚪';
    }
  }

  private createFallbackData(): MCPStatusData {
    return {
      servers: [],
      totalServers: 0,
      connectedCount: 0,
      overallStatus: 'unknown',
      lastUpdate: Date.now(),
      averageResponseTime: 0
    };
  }

  private notifySubscribers(data: MCPStatusData): void {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('[MCPStatus] Subscriber callback error:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stop();
    this.subscribers.clear();
    this.cachedData = null;
  }
}

// Export singleton instance
export const mcpStatusComponent = new MCPStatusComponent();