/**
 * MCP Optimize API Route
 *
 * POST - Get optimization suggestions based on task context
 */

import { NextRequest, NextResponse } from 'next/server';
import { mcpConfigManager } from '@/services/mcp/MCPConfigManager';
import { mcpTokenAnalyzer } from '@/services/mcp/MCPTokenAnalyzer';
import type { MCPOptimizeRequest, MCPOptimizeResponse } from '@/shared/types/mcp.types';

/**
 * POST /api/mcp/optimize
 * Get optimization suggestions based on task context
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MCPOptimizeRequest;

    const servers = await mcpConfigManager.getServers();
    const currentUsage = mcpTokenAnalyzer.analyzeUsage(servers);

    const suggestions = mcpTokenAnalyzer.generateOptimizations(servers, currentUsage, {
      taskContext: body.taskContext,
      maxTokens: body.maxTokens,
      preserveServers: body.preserveServers,
    });

    const projectedUsage = mcpTokenAnalyzer.calculateProjectedUsage(currentUsage, suggestions);

    const response: MCPOptimizeResponse = {
      suggestions,
      currentUsage,
      projectedUsage,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[MCP Optimize API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate optimizations', details: (error as Error).message },
      { status: 500 }
    );
  }
}
