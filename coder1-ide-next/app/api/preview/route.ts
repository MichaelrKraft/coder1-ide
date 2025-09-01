import { NextResponse } from 'next/server';

export async function GET() {
  // This would normally render the current file being edited
  // For now, returning a demo preview page
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
            console.log('Preview update received:', event.data);
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
      'Content-Type': 'text/html',
    },
  });
}