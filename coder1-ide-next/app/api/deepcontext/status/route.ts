import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if DeepContext MCP server is running
    // In production, this would check if the MCP server process is active
    const isInstalled = process.env.DEEPCONTEXT_INSTALLED === 'true';
    const isIndexed = process.env.DEEPCONTEXT_INDEXED === 'true';
    
    return NextResponse.json({
      installed: isInstalled,
      indexed: isIndexed,
      version: '1.0.0',
      status: isInstalled ? 'ready' : 'not_installed'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check DeepContext status' },
      { status: 500 }
    );
  }
}