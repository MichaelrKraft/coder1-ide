/**
 * MCP Servers API Route
 *
 * GET - List all MCP servers with status
 * POST - Toggle server enabled/disabled
 */

import { NextRequest, NextResponse } from 'next/server';
import { mcpConfigManager } from '@/services/mcp/MCPConfigManager';
import { mcpTokenAnalyzer } from '@/services/mcp/MCPTokenAnalyzer';
import type { MCPListResponse, MCPToggleRequest, MCPToggleResponse } from '@/shared/types/mcp.types';

/**
 * GET /api/mcp/servers
 * List all MCP servers with their status and token estimates
 */
export async function GET() {
  try {
    const servers = await mcpConfigManager.getServers();

    // Add token estimates to each server
    const serversWithTokens = servers.map(server => ({
      ...server,
      estimatedTokens: mcpTokenAnalyzer.estimateServerTokens(server).totalTokens,
    }));

    const response: MCPListResponse = {
      servers: serversWithTokens,
      totalCount: servers.length,
      enabledCount: servers.filter(s => s.enabled).length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[MCP Servers API] Error listing servers:', error);
    return NextResponse.json(
      { error: 'Failed to list MCP servers', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mcp/servers
 * Toggle a server's enabled state
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MCPToggleRequest;

    if (!body.serverName || typeof body.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request. Required: serverName (string), enabled (boolean)' },
        { status: 400 }
      );
    }

    const result = await mcpConfigManager.toggleServer(body.serverName, body.enabled);

    if (!result.success) {
      return NextResponse.json(
        { error: `Failed to ${body.enabled ? 'enable' : 'disable'} server "${body.serverName}"` },
        { status: 400 }
      );
    }

    // Get updated server info
    const servers = await mcpConfigManager.getServers();
    const server = servers.find(s => s.name === body.serverName);

    const response: MCPToggleResponse = {
      success: true,
      server: server || {
        name: body.serverName,
        enabled: body.enabled,
        category: 'custom',
        config: { command: '' },
        status: 'unknown',
      },
      backupId: result.backupId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[MCP Servers API] Error toggling server:', error);
    return NextResponse.json(
      { error: 'Failed to toggle MCP server', details: (error as Error).message },
      { status: 500 }
    );
  }
}
