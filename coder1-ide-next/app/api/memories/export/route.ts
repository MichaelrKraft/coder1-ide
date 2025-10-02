/**
 * Memory Export API Route
 * POST /api/memories/export - Export memories in various formats
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryDb } from '@/lib/db/memory-database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, format = 'json' } = body;

    // Export memories
    const jsonData = memoryDb.exportMemories(ids);
    const data = JSON.parse(jsonData);

    if (format === 'markdown') {
      // Convert to Markdown format
      const markdown = convertToMarkdown(data);
      
      return new NextResponse(markdown, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="memories-export-${Date.now()}.md"`
        }
      });
    } else if (format === 'html') {
      // Convert to HTML format
      const html = convertToHTML(data);
      
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="memories-export-${Date.now()}.html"`
        }
      });
    } else {
      // Default to JSON
      return NextResponse.json({
        success: true,
        format: 'json',
        data: data
      });
    }
  } catch (error) {
    console.error('Error exporting memories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export memories' },
      { status: 500 }
    );
  }
}

function convertToMarkdown(data: any): string {
  let markdown = '# Memory Export\n\n';
  markdown += `_Exported: ${data.exported_at}_\n\n`;
  markdown += `_Version: ${data.version}_\n\n`;
  markdown += '---\n\n';

  for (const memory of data.memories) {
    markdown += `## ${memory.title}\n\n`;
    markdown += `**Type:** ${memory.type}  \n`;
    markdown += `**Confidence:** ${Math.round(memory.confidence * 100)}%  \n`;
    markdown += `**Created:** ${memory.createdAt}  \n`;
    
    if (memory.starred) {
      markdown += `⭐ **Starred**  \n`;
    }
    
    markdown += '\n### Description\n\n';
    markdown += `${memory.description || 'No description provided.'}\n\n`;
    
    if (memory.tags && memory.tags.length > 0) {
      markdown += '### Tags\n\n';
      markdown += memory.tags.map((tag: string) => `\`${tag}\``).join(', ') + '\n\n';
    }
    
    if (memory.context) {
      markdown += '### Context\n\n';
      
      if (memory.context.files && memory.context.files.length > 0) {
        markdown += '**Files:**\n';
        memory.context.files.forEach((file: string) => {
          markdown += `- ${file}\n`;
        });
        markdown += '\n';
      }
      
      if (memory.context.commands && memory.context.commands.length > 0) {
        markdown += '**Commands:**\n';
        memory.context.commands.forEach((cmd: string) => {
          markdown += `- \`${cmd}\`\n`;
        });
        markdown += '\n';
      }
      
      if (memory.context.errors && memory.context.errors.length > 0) {
        markdown += '**Errors:**\n';
        memory.context.errors.forEach((error: string) => {
          markdown += `- ${error}\n`;
        });
        markdown += '\n';
      }
    }
    
    if (memory.events && memory.events.length > 0) {
      markdown += '### Events\n\n';
      memory.events.forEach((event: any) => {
        markdown += `- **${event.eventType}** (${Math.round(event.confidence * 100)}%)\n`;
      });
      markdown += '\n';
    }
    
    markdown += '---\n\n';
  }

  return markdown;
}

function convertToHTML(data: any): string {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Memory Export - ${new Date().toLocaleDateString()}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .memory {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .memory-header {
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .memory-title {
            font-size: 1.5em;
            font-weight: bold;
            color: #2c3e50;
            margin: 0;
        }
        .memory-meta {
            display: flex;
            gap: 20px;
            margin-top: 10px;
            font-size: 0.9em;
            color: #666;
        }
        .tag {
            display: inline-block;
            background: #e8f4f8;
            color: #2980b9;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 0.85em;
            margin-right: 5px;
        }
        .context {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
        }
        .starred {
            color: #f39c12;
        }
        .confidence {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.85em;
        }
        .high-confidence { background: #d4edda; color: #155724; }
        .medium-confidence { background: #fff3cd; color: #856404; }
        .low-confidence { background: #f8d7da; color: #721c24; }
        code {
            background: #f4f4f4;
            padding: 1px 4px;
            border-radius: 2px;
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <h1>Memory Export</h1>
    <p><em>Exported: ${data.exported_at}</em></p>
    <hr>
    ${data.memories.map((memory: any) => `
        <div class="memory">
            <div class="memory-header">
                <h2 class="memory-title">
                    ${memory.starred ? '<span class="starred">⭐</span> ' : ''}
                    ${memory.title}
                </h2>
                <div class="memory-meta">
                    <span><strong>Type:</strong> ${memory.type}</span>
                    <span class="confidence ${getConfidenceClass(memory.confidence)}">
                        <strong>Confidence:</strong> ${Math.round(memory.confidence * 100)}%
                    </span>
                    <span><strong>Created:</strong> ${new Date(memory.createdAt).toLocaleString()}</span>
                </div>
            </div>
            
            <div class="memory-content">
                ${memory.description ? `<p>${memory.description}</p>` : '<p><em>No description provided.</em></p>'}
                
                ${memory.tags && memory.tags.length > 0 ? `
                    <div class="tags">
                        ${memory.tags.map((tag: string) => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                
                ${memory.context && (memory.context.files?.length > 0 || memory.context.commands?.length > 0) ? `
                    <div class="context">
                        <h4>Context</h4>
                        ${memory.context.files?.length > 0 ? `
                            <p><strong>Files:</strong></p>
                            <ul>${memory.context.files.map((f: string) => `<li>${f}</li>`).join('')}</ul>
                        ` : ''}
                        ${memory.context.commands?.length > 0 ? `
                            <p><strong>Commands:</strong></p>
                            <ul>${memory.context.commands.map((c: string) => `<li><code>${c}</code></li>`).join('')}</ul>
                        ` : ''}
                        ${memory.context.errors?.length > 0 ? `
                            <p><strong>Errors:</strong></p>
                            <ul>${memory.context.errors.map((e: string) => `<li>${e}</li>`).join('')}</ul>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('\n')}
</body>
</html>
  `;

  return html;
}

function getConfidenceClass(confidence: number): string {
  if (confidence >= 0.7) return 'high-confidence';
  if (confidence >= 0.4) return 'medium-confidence';
  return 'low-confidence';
}