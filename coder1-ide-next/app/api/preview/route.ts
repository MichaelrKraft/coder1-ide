import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { previewCompiler } from '@/lib/preview-compiler';
import { previewRequestCache, previewLoopPrevention } from '@/lib/preview-loop-prevention';

export const dynamic = 'force-dynamic';

// Get project root directory
const getProjectRoot = () => {
  return process.cwd();
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('file');
    const version = searchParams.get('v') || '';
    
    // If no file specified, return demo content
    if (!filePath) {
      return getDemoPreview();
    }

    // Create cache key for request deduplication
    const cacheKey = `${filePath}:${version}`;
    
    // Check cache first to prevent duplicate processing
    const cachedResponse = previewRequestCache.get(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Check rate limiting to prevent loops
    if (!previewLoopPrevention.canUpdate('api-request')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded - preventing potential loops'
        },
        { status: 429 }
      );
    }

    // Validate and read file
    const projectRoot = getProjectRoot();
    const fullPath = path.resolve(projectRoot, filePath);
    
    // Security check - ensure file is within project
    if (!fullPath.startsWith(projectRoot)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied - file outside project directory'
        },
        { status: 403 }
      );
    }

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch (error) {
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: 'File not found'
        },
        { status: 404 }
      );
      previewRequestCache.set(cacheKey, errorResponse);
      return errorResponse;
    }

    // Read file content
    const content = await fs.readFile(fullPath, 'utf8');

    // Check for rapid updates that might indicate a loop
    if (previewLoopPrevention.isRapidSequence(filePath)) {
      console.warn(`Rapid preview updates detected for ${filePath}`);
    }

    // Compile the file content
    const compilationResult = await previewCompiler.compile(content, filePath);

    // Create response
    const response = new NextResponse(compilationResult.html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Preview-File': filePath,
        'X-Preview-Success': compilationResult.success.toString(),
        'X-Preview-Warnings': compilationResult.warnings?.join('; ') || ''
      },
    });

    // Cache the response
    previewRequestCache.set(cacheKey, response);
    
    return response;

  } catch (error) {
    console.error('Preview API error:', error);
    
    const errorResponse = new NextResponse(getErrorHTML(error instanceof Error ? error.message : 'Unknown error'), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      status: 500
    });

    return errorResponse;
  }
}

/**
 * Return demo preview when no file is specified
 */
function getDemoPreview() {
  const previewHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Live Preview</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0a0a0a;
          color: #9ca3af;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .preview-container {
          text-align: center;
          max-width: 600px;
        }
        h1 {
          color: #e5e7eb;
          margin-bottom: 10px;
          font-size: 24px;
          font-weight: 600;
        }
        p {
          color: #6b7280;
          line-height: 1.6;
          margin-bottom: 20px;
          font-size: 14px;
        }
        .demo-content {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 20px;
          margin-top: 30px;
          backdrop-filter: blur(10px);
        }
        .demo-content h2 {
          color: #d1d5db;
          font-size: 18px;
          margin-bottom: 12px;
          font-weight: 500;
        }
        .demo-content p {
          color: #9ca3af;
          font-size: 13px;
        }
        .demo-button {
          background: linear-gradient(135deg, #00D9FF, #8b5cf6);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 15px;
          font-size: 14px;
        }
        .demo-button:hover {
          transform: scale(1.05);
          box-shadow: 0 0 20px rgba(0, 217, 255, 0.4);
        }
        .status {
          display: inline-block;
          padding: 4px 12px;
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: 12px;
          font-size: 12px;
          margin-top: 10px;
        }
        .footer-hint {
          margin-top: 30px;
          font-size: 12px;
          color: #4b5563;
        }
      </style>
    </head>
    <body>
      <div class="preview-container">
        <h1>Live Preview Mode</h1>
        <p>This preview will display your HTML, React, or web content as you edit it in the editor.</p>
        
        <!-- Hint text positioned similarly to hero section -->
        <div style="margin-top: 40px; margin-bottom: 40px;">
          <p style="color: #6b7280; font-size: 14px; font-style: italic;">
            Type claude in the terminal below to begin
          </p>
        </div>
        
        <div class="demo-content">
          <h2>Demo Component</h2>
          <p>When you edit HTML or React files, they will render here automatically.</p>
          <button class="demo-button" onclick="alert('Preview is working!')">Test Button</button>
          <div class="status">Ready</div>
        </div>
        
        <p class="footer-hint">
          Supports: HTML, CSS, JavaScript, React, Vue, and more
        </p>
      </div>
      
      <script>
        // Listen for messages from parent window for live updates
        window.addEventListener('message', (event) => {
          if (event.data.type === 'preview-update') {
            // REMOVED: // REMOVED: console.log('Preview update received:', event.data);
          }
        });
        
        // Send ready signal
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'preview-ready' }, '*');
        }
      </script>
    </body>
    </html>
  `;
  
  return new NextResponse(previewHTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Preview-Mode': 'demo'
    },
  });
}

/**
 * Generate error HTML for preview display
 */
function getErrorHTML(error: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Error</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #9ca3af;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .error-container {
      text-align: center;
      max-width: 600px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      padding: 30px;
    }
    h1 {
      color: #ef4444;
      margin-bottom: 15px;
      font-size: 24px;
      font-weight: 600;
    }
    p {
      color: #d1d5db;
      line-height: 1.6;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .error-details {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 15px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #fca5a5;
      text-align: left;
      word-break: break-word;
    }
    .retry-hint {
      margin-top: 20px;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>Preview Error</h1>
    <p>There was an error generating the preview for this file.</p>
    <div class="error-details">${escapeHtml(error)}</div>
    <div class="retry-hint">
      Make sure the file exists and has valid syntax. The preview will update automatically when you make changes.
    </div>
  </div>
  
  <script>
    // Listen for messages from parent window for live updates
    window.addEventListener('message', (event) => {
      if (event.data.type === 'preview-update') {
        window.location.reload();
      }
    });
    
    // Send ready signal
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'preview-error', error: '${escapeHtml(error)}' }, '*');
    }
  </script>
</body>
</html>`;
}

/**
 * Escape HTML for safe display
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}