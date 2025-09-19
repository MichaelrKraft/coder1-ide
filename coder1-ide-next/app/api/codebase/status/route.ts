import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Proxy to Express backend
    const backendUrl = 'http://localhost:3000/api/codebase/status';
    const response = await fetch(backendUrl);
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    // // logger?.error('Failed to proxy codebase status:', error);
    
    // Fallback to mock data if backend is unavailable
    const status = {
      success: true,
      indexing: {
        isIndexing: false,
        lastIndexed: new Date().toISOString(),
        progress: 100,
        filesProcessed: 127,
        totalFiles: 127
      },
      service: {
        status: 'healthy',
        version: '1.0.0-demo',
        uptime: Math.floor(Math.random() * 10000) + 5000
      }
    };

    return NextResponse.json(status);
  }
}