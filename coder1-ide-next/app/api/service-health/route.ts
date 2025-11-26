import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

interface ServiceStatus {
  name: string;
  status: 'active' | 'degraded' | 'offline';
  latency?: number;
  error?: string;
  lastChecked: string;
}

async function checkClaudeCLI(): Promise<ServiceStatus> {
  // Claude CLI is a client-side tool, not applicable in production
  if (process.env.NODE_ENV === 'production') {
    return {
      name: 'Claude CLI',
      status: 'offline',
      error: 'Not applicable in production (client-side tool)',
      lastChecked: new Date().toISOString()
    };
  }
  
  const startTime = Date.now();
  try {
    // Check if Claude CLI is available (development only)
    const { stdout } = await execAsync('which claude');
    
    if (stdout.trim()) {
      const latency = Date.now() - startTime;
      return {
        name: 'Claude CLI',
        status: 'active',
        latency,
        lastChecked: new Date().toISOString()
      };
    } else {
      return {
        name: 'Claude CLI',
        status: 'offline',
        error: 'Claude CLI not found in PATH',
        lastChecked: new Date().toISOString()
      };
    }
  } catch (error) {
    return {
      name: 'Claude CLI',
      status: 'offline',
      error: 'Claude CLI not installed',
      lastChecked: new Date().toISOString()
    };
  }
}

async function checkNodeVersion(): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    const { stdout } = await execAsync('node --version');
    const version = stdout.trim();
    const latency = Date.now() - startTime;
    
    return {
      name: 'Node.js Runtime',
      status: 'active',
      error: version,
      latency,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      name: 'Node.js Runtime',
      status: 'offline',
      error: 'Unable to check Node.js version',
      lastChecked: new Date().toISOString()
    };
  }
}

async function checkWebSocketServer(): Promise<ServiceStatus> {
  try {
    // Determine the base URL based on environment
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_UNIFIED_SERVER_URL || 'https://coder1.ai')
      : `http://localhost:${process.env.PORT || 3001}`;
    
    // Check Socket.IO server health by hitting its polling endpoint
    // The WebSocket server runs as part of the unified Next.js server
    const response = await fetch(`${baseUrl}/socket.io/?EIO=4&transport=polling`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    const isActive = response.ok;
    
    return {
      name: 'WebSocket Server',
      status: isActive ? 'active' : 'offline',
      error: isActive ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      name: 'WebSocket Server',
      status: 'offline',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString()
    };
  }
}

async function checkFileSystemAccess(): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Try to access the data directory
    const dataDir = path.join(process.cwd(), 'data');
    await fs.access(dataDir);
    
    const latency = Date.now() - startTime;
    
    return {
      name: 'File System',
      status: 'active',
      latency,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      name: 'File System',
      status: 'offline',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString()
    };
  }
}

async function checkTerminalService(): Promise<ServiceStatus> {
  try {
    // Determine the base URL based on environment
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_UNIFIED_SERVER_URL || 'https://coder1.ai')
      : `http://localhost:${process.env.PORT || 3001}`;
    
    // Check if any terminal sessions exist
    const response = await fetch(`${baseUrl}/api/terminal-rest/sessions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);
    
    const isActive = response && response.ok;
    
    return {
      name: 'Terminal Service',
      status: isActive ? 'active' : 'degraded',
      error: isActive ? undefined : 'Terminal service not responding',
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      name: 'Terminal Service',
      status: 'offline',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString()
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Run all health checks in parallel
    const [claudeCLI, nodeRuntime, websocket, filesystem, terminal] = await Promise.all([
      checkClaudeCLI(),
      checkNodeVersion(),
      checkWebSocketServer(),
      checkFileSystemAccess(),
      checkTerminalService()
    ]);
    
    const services = [claudeCLI, nodeRuntime, websocket, filesystem, terminal];
    
    // Calculate overall health
    const totalServices = services.length;
    const activeServices = services.filter(s => s.status === 'active').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;
    
    let overallStatus: 'healthy' | 'degraded' | 'critical';
    if (activeServices === totalServices) {
      overallStatus = 'healthy';
    } else if (activeServices + degradedServices >= totalServices / 2) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'critical';
    }
    
    return NextResponse.json({
      success: true,
      overall: overallStatus,
      services,
      summary: {
        total: totalServices,
        active: activeServices,
        degraded: degradedServices,
        offline: totalServices - activeServices - degradedServices
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform health check',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}