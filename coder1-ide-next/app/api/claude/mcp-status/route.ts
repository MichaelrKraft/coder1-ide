/**
 * API endpoint for checking MCP server health status
 * Executes the claude mcp list command to get server status
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '@/lib/logger';

const execAsync = promisify(exec);

interface MCPServer {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  version?: string;
  description?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Execute claude mcp list command to get MCP server status
    const { stdout, stderr } = await execAsync('claude mcp list 2>/dev/null || echo "[]"');
    
    if (stderr && !stderr.includes('command not found')) {
      logger.error('MCP list error:', stderr);
    }
    
    const servers: MCPServer[] = [];
    
    // Parse the output - claude mcp list typically returns formatted text
    const lines = stdout.split('\n').filter(line => line.trim());
    
    // Look for common MCP servers
    const commonServers = [
      'filesystem',
      'git', 
      'browser-use',
      'firecrawl',
      'coder1-intelligence',
      'playwright'
    ];
    
    // Try to parse the output
    for (const line of lines) {
      // Check if line contains server info
      for (const serverName of commonServers) {
        if (line.toLowerCase().includes(serverName)) {
          const isHealthy = line.includes('✓') || line.includes('healthy') || line.includes('running');
          const isUnhealthy = line.includes('✗') || line.includes('unhealthy') || line.includes('stopped');
          
          servers.push({
            name: serverName,
            status: isHealthy ? 'healthy' : isUnhealthy ? 'unhealthy' : 'unknown',
            description: line.trim()
          });
          break;
        }
      }
    }
    
    // If no servers found, try alternative detection
    if (servers.length === 0) {
      // Check if MCP config file exists
      try {
        const { stdout: configCheck } = await execAsync('ls ~/.mcp.json 2>/dev/null || echo "not found"');
        if (!configCheck.includes('not found')) {
          // Config exists, assume basic servers are available
          servers.push(
            { name: 'filesystem', status: 'unknown' },
            { name: 'git', status: 'unknown' }
          );
        }
      } catch (e) {
        // Config check failed
      }
    }
    
    // Calculate health summary
    const healthyCount = servers.filter(s => s.status === 'healthy').length;
    const unhealthyCount = servers.filter(s => s.status === 'unhealthy').length;
    const unknownCount = servers.filter(s => s.status === 'unknown').length;
    
    return NextResponse.json({
      success: true,
      servers,
      summary: {
        total: servers.length,
        healthy: healthyCount,
        unhealthy: unhealthyCount,
        unknown: unknownCount
      },
      healthStatus: unhealthyCount > 0 ? 'degraded' : healthyCount > 0 ? 'healthy' : 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get MCP status:', error);
    return NextResponse.json({
      success: false,
      servers: [],
      summary: {
        total: 0,
        healthy: 0,
        unhealthy: 0,
        unknown: 0
      },
      healthStatus: 'unknown',
      error: 'Failed to retrieve MCP server status',
      timestamp: new Date().toISOString()
    });
  }
}