import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

export const dynamic = 'force-dynamic';

interface McpServerEntry {
  name: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = getAuthenticatedUserId(request);

    // Try bridge cache first (works in production — bridge sends MCP names on connect)
    const bridgeCache = (global as Record<string, unknown>)._bridgeMcpServers as Map<string, string[]> | undefined;
    if (bridgeCache && userId) {
      const cached = bridgeCache.get(userId);
      if (cached) {
        return NextResponse.json({ servers: cached.map(name => ({ name })), source: 'bridge' });
      }
    }

    // Fall back to local ~/.mcp.json (works in dev where server = local machine)
    const mcpConfigPath = path.join(os.homedir(), '.mcp.json');

    if (!fs.existsSync(mcpConfigPath)) {
      return NextResponse.json({ servers: [] });
    }

    const raw = fs.readFileSync(mcpConfigPath, 'utf-8');
    const config = JSON.parse(raw) as { mcpServers?: Record<string, unknown> };

    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      return NextResponse.json({ servers: [] });
    }

    const servers: McpServerEntry[] = Object.keys(config.mcpServers).map(name => ({ name }));

    return NextResponse.json({ servers, source: 'local' });
  } catch (error) {
    console.error('[agent-hub] GET /mcp-servers error:', error);
    return NextResponse.json({ servers: [] });
  }
}
