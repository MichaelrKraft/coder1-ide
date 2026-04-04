import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

interface McpServerEntry {
  name: string;
}

export async function GET(): Promise<NextResponse> {
  try {
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

    return NextResponse.json({ servers });
  } catch (error) {
    console.error('[agent-hub] GET /mcp-servers error:', error);
    return NextResponse.json({ servers: [] });
  }
}
