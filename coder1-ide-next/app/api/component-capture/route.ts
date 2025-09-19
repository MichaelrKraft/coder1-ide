import { NextRequest, NextResponse } from 'next/server';

/**
 * ULTRATHIN Component Capture API
 * Minimal implementation - just receive and broadcast to existing IDE
 */

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { html, css, url, title, selector } = await request.json();
    
    if (!html || !css) {
      return NextResponse.json(
        { success: false, error: 'Missing html or css' }, 
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    // Create minimal formatted component
    const componentCode = `<!DOCTYPE html>
<html>
<head>
    <title>${title || 'Captured Component'}</title>
    <style>
        body { font-family: system-ui; padding: 20px; }
        .component-container { max-width: 1200px; margin: 0 auto; }
${css}
    </style>
</head>
<body>
    <div class="component-container">
${html}
    </div>
</body>
</html>`;

    // Broadcast to existing WebSocket (will be handled by server.js)
    if (global.io) {
      global.io.emit('component:captured', {
        title: title || 'Captured Component',
        code: componentCode,
        url,
        selector
      });
    }

    return NextResponse.json(
      { success: true, message: 'Component captured' },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  } catch (error) {
    console.error('Component capture error:', error);
    return NextResponse.json(
      { success: false, error: 'Capture failed' }, 
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}