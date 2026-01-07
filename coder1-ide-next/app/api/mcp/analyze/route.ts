/**
 * MCP Analyze API Route
 *
 * GET - Analyze current token usage
 */

import { NextResponse } from 'next/server';
import { mcpConfigManager } from '@/services/mcp/MCPConfigManager';
import { mcpTokenAnalyzer } from '@/services/mcp/MCPTokenAnalyzer';
import type { MCPAnalyzeResponse } from '@/shared/types/mcp.types';

/**
 * GET /api/mcp/analyze
 * Analyze token usage of currently enabled servers
 */
export async function GET() {
  try {
    const servers = await mcpConfigManager.getServers();
    const usage = mcpTokenAnalyzer.analyzeUsage(servers);
    const suggestions = mcpTokenAnalyzer.generateOptimizations(servers, usage);

    const response: MCPAnalyzeResponse = {
      usage,
      suggestions,
      analysisTimestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[MCP Analyze API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze MCP usage', details: (error as Error).message },
      { status: 500 }
    );
  }
}
