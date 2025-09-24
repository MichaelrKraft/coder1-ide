import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Component Capture API
 * Receives components from Chrome extension and saves them to storage
 */

// Component storage directory
const COMPONENTS_DIR = path.join(process.cwd(), 'data', 'captured-components');

// Initialize storage directory
async function initializeStorage() {
  try {
    await fs.mkdir(COMPONENTS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to initialize component storage:', error);
  }
}

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
    await initializeStorage();
    
    const { html, css, url, title, selector, screenshot, loadIntoEditor } = await request.json();
    
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

    // Generate unique ID
    const id = crypto.randomBytes(8).toString('hex');
    const timestamp = new Date().toISOString();
    
    // Create component object for storage
    const component = {
      id,
      title: title || 'Untitled Component',
      url: url || 'Unknown',
      selector: selector || 'body',
      html,
      css,
      screenshot: screenshot || null,
      timestamp,
      tags: [],
      category: 'uncategorized',
      framework: 'vanilla',
      generatedCode: null
    };
    
    // Save to disk
    const componentPath = path.join(COMPONENTS_DIR, `${id}.json`);
    await fs.writeFile(componentPath, JSON.stringify(component, null, 2));
    
    console.log(`✅ Saved component ${id}: ${component.title} via Chrome extension`);

    // Create minimal formatted component for WebSocket broadcast
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

    // Broadcast to existing WebSocket (kept for backward compatibility)
    if (global.io) {
      global.io.emit('component:captured', {
        id,
        title: title || 'Captured Component',
        code: componentCode,
        url,
        selector
      });
    }

    // Prepare response
    const response: any = {
      success: true,
      id,
      message: 'Component captured and saved successfully'
    };
    
    // If Chrome extension wants to load into editor, add redirect URL
    if (loadIntoEditor) {
      response.redirectUrl = `/ide?loadComponent=${id}`;
    }

    return NextResponse.json(
      response,
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