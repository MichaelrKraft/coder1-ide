import { NextResponse } from 'next/server';

export async function GET() {
  const wikiHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Codebase Wiki</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #1a1a1a, #0a0a0a);
          color: #e0e0e0;
          padding: 20px;
          line-height: 1.6;
          min-height: 100vh;
          overflow-y: auto;
        }
        html {
          height: 100%;
          overflow-y: auto;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        h1 {
          color: #00D9FF;
          margin-bottom: 20px;
          text-shadow: 0 0 10px rgba(0, 217, 255, 0.5);
        }
        h2 {
          color: #8b5cf6;
          margin: 20px 0 10px;
        }
        .section {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .code-block {
          background: #0a0a0a;
          border: 1px solid #333;
          border-radius: 4px;
          padding: 10px;
          margin: 10px 0;
          font-family: 'Courier New', monospace;
          overflow-x: auto;
        }
        .tag {
          display: inline-block;
          background: rgba(139, 92, 246, 0.2);
          border: 1px solid #8b5cf6;
          border-radius: 4px;
          padding: 2px 8px;
          margin: 2px;
          font-size: 12px;
        }
        ul {
          margin-left: 20px;
        }
        li {
          margin: 5px 0;
        }
        a {
          color: #00D9FF;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📚 Codebase Wiki</h1>
        
        <div class="section">
          <h2>🏗️ Architecture Overview</h2>
          <p>This is a Next.js 14 application with TypeScript, featuring an integrated development environment with AI capabilities.</p>
          
          <h3>Tech Stack:</h3>
          <ul>
            <li><span class="tag">Next.js 14</span> - React framework with App Router</li>
            <li><span class="tag">TypeScript</span> - Type-safe JavaScript</li>
            <li><span class="tag">Tailwind CSS</span> - Utility-first CSS framework</li>
            <li><span class="tag">Monaco Editor</span> - VSCode editor in browser</li>
            <li><span class="tag">Xterm.js</span> - Terminal emulation</li>
            <li><span class="tag">Claude API</span> - AI integration</li>
          </ul>
        </div>
        
        <div class="section">
          <h2>📁 Project Structure</h2>
          <div class="code-block">
            <pre>
/app
  /api           # API routes
  /ide           # IDE page
  /components    # React components
    /editor      # Monaco editor
    /terminal    # Terminal component
    /preview     # Preview panel
/lib
  design-tokens  # UI tokens
/public          # Static assets
            </pre>
          </div>
        </div>
        
        <div class="section">
          <h2>🔑 Key Components</h2>
          <ul>
            <li><strong>MenuBar</strong> - Top navigation with File, Edit, View, Run, Help menus</li>
            <li><strong>LeftPanel</strong> - Explorer, Sessions tabs with Discover section</li>
            <li><strong>MonacoEditor</strong> - Code editing with syntax highlighting</li>
            <li><strong>Terminal</strong> - Integrated terminal with Claude conversation mode</li>
            <li><strong>StatusBar</strong> - Bottom bar with CheckPoint, TimeLine, Export buttons</li>
            <li><strong>PreviewPanel</strong> - Agent Dashboard, Wiki, and Preview modes</li>
          </ul>
        </div>
        
        <div class="section">
          <h2>🤖 AI Features</h2>
          <ul>
            <li>Claude conversation mode in terminal</li>
            <li>Session summaries with AI analysis</li>
            <li>Error Doctor for automatic error diagnosis</li>
            <li>AI-powered code suggestions (coming soon)</li>
          </ul>
        </div>
        
        <div class="section">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <div class="code-block">
            <pre>
Ctrl+N    - New file
Ctrl+O    - Open file
Ctrl+S    - Save file
Ctrl+\`    - Toggle terminal
Ctrl+=    - Zoom in
Ctrl+-    - Zoom out
Ctrl+0    - Reset zoom
F5        - Run code
F9        - Debug
            </pre>
          </div>
        </div>
        
        <div class="section">
          <h2>🚀 Getting Started</h2>
          <ol>
            <li>Start a new session from the Sessions tab</li>
            <li>Open or create files in the Explorer</li>
            <li>Type <code>claude</code> in terminal for AI assistance</li>
            <li>Use CheckPoint to save your progress</li>
            <li>Generate Session Summary when done</li>
          </ol>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return new NextResponse(wikiHTML, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}