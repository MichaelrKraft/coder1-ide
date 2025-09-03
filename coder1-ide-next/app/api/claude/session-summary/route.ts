import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getApiUrl } from '@/lib/api-config';
import { logger } from '@/lib/logger';

const EXPRESS_BACKEND_URL = getApiUrl();

// Request deduplication and cooldown management
const lastRequestTime = new Map<string, number>();
const activeRequests = new Map<string, boolean>();
const COOLDOWN_MS = 5000; // 5 seconds between requests
const MAX_SUMMARY_FILES = 10; // Keep only last 10 summaries

export async function POST(request: NextRequest) {
  let requestKey: string = 'default';
  
  try {
    const requestData = await request.json();
    let { sessionId, sessionData, prompt, includeTerminalHistory, includeFileChanges, includeCommits } = requestData;
    
    // Create a unique request key for deduplication
    requestKey = sessionId || 'default';
    
    // Check if there's an active request for this session
    if (activeRequests.get(requestKey)) {
      logger.debug(`[Session Summary] Duplicate request blocked for session: ${requestKey}`);
      return NextResponse.json({ 
        success: false,
        error: 'Request already in progress',
        message: 'A summary is already being generated for this session'
      }, { status: 429 });
    }
    
    // Check cooldown period
    const lastRequest = lastRequestTime.get(requestKey) || 0;
    const timeSinceLastRequest = Date.now() - lastRequest;
    
    if (timeSinceLastRequest < COOLDOWN_MS) {
      const remainingTime = Math.ceil((COOLDOWN_MS - timeSinceLastRequest) / 1000);
      logger.debug(`[Session Summary] Cooldown active for session: ${requestKey}, ${remainingTime}s remaining`);
      return NextResponse.json({ 
        success: false,
        error: 'Too many requests',
        message: `Please wait ${remainingTime} seconds before requesting another summary`,
        retryAfter: remainingTime
      }, { status: 429 });
    }
    
    // Mark request as active
    activeRequests.set(requestKey, true);
    lastRequestTime.set(requestKey, Date.now());
    
    // If we received the enhanced sessionData and prompt from SessionSummaryService, use those
    if (sessionData && prompt) {
      // This is the enhanced call from SessionSummaryService
      // Pass it through to the backend with the comprehensive prompt
    } else {
      // Legacy simple call - gather basic session data
      sessionData = {
        sessionId: sessionId || 'default',
        timestamp: new Date().toISOString(),
        terminalHistory: includeTerminalHistory ? await getTerminalHistory() : null,
        fileChanges: includeFileChanges ? await getFileChanges() : null,
        commits: includeCommits ? await getCommits() : null
      };
      
      // For legacy calls, create the comprehensive prompt
      prompt = `CRITICAL INSTRUCTION: Please go back through EVERY DETAIL of this session, read EVERYTHING carefully, and provide an IN-DEPTH summary.

BE AS DETAILED AS POSSIBLE. Include:
- What happened (chronologically, step by step)
- What hurdles were encountered (every single one)
- What the problems were (root causes, not just symptoms)
- Where we're at now (exact current state)
- Where we want to go (clear direction)
- A detailed plan for moving forward

Session ID: ${sessionData.sessionId}
Timestamp: ${sessionData.timestamp}

${sessionData.terminalHistory ? `Terminal History:
${sessionData.terminalHistory}` : ''}

${sessionData.fileChanges ? `File Changes:
${sessionData.fileChanges}` : ''}

${sessionData.commits ? `Git Commits:
${sessionData.commits}` : ''}

Provide an EXHAUSTIVELY DETAILED analysis including:
1. Complete session chronicle (blow-by-blow account)
2. Deep analysis of ALL problems and hurdles
3. Technical decisions and rationale
4. Exact current state (what works, what doesn't)
5. Complete list of unresolved issues
6. Successes and what worked
7. Detailed code change review
8. Testing and validation status
9. Environment and configuration changes
10. Step-by-step handoff instructions for next agent
11. Strategic recommendations (short/medium/long term)

Remember: BE EXHAUSTIVELY DETAILED. The next agent should know EVERYTHING about this session.`;
    }
    
    // Try to call the Express backend endpoint for session summary
    let result: any = null;
    let backendSuccess = false;
    
    try {
      const response = await fetch(`${EXPRESS_BACKEND_URL}/api/claude/session-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionData,
          prompt
        })
      });
      
      if (response.ok) {
        result = await response.json();
        backendSuccess = true;
      }
    } catch (error) {
      logger.debug('Backend session summary failed, using fallback');
    }
    
    // If backend fails, generate a basic summary locally
    if (!backendSuccess) {
      const now = new Date();
      result = {
        success: true,
        summary: `# Session Summary

**Session ID:** ${sessionData.sessionId}
**Date:** ${now.toLocaleDateString()}
**Time:** ${now.toLocaleTimeString()}

## Session Activity

${sessionData.terminalHistory ? `### Terminal Commands
\`\`\`bash
${sessionData.terminalHistory}
\`\`\`
` : ''}

${sessionData.fileChanges ? `### File Changes
${sessionData.fileChanges}
` : ''}

${sessionData.commits ? `### Git Commits
\`\`\`
${sessionData.commits}
\`\`\`
` : ''}

## Summary
This session involved development work on the CoderOne IDE project. The session data has been captured for future reference.

## Next Steps
- Review the changes made during this session
- Test any new functionality
- Consider committing changes if not already done

---
*Generated on ${now.toISOString()}*
*Session duration: Active session*`,
        metadata: {
          source: 'local-fallback',
          timestamp: now.toISOString(),
          note: 'Generated without AI assistance'
        }
      };
    }
    
    // Save summary to file locally as well
    const summariesDir = path.join(process.cwd(), 'summaries');
    try {
      await fs.mkdir(summariesDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    const summaryFile = path.join(summariesDir, `summary-${Date.now()}.md`);
    await fs.writeFile(summaryFile, result.summary || 'No summary generated');
    
    // Clean up old summary files to prevent accumulation
    try {
      const files = await fs.readdir(summariesDir);
      const summaryFiles = files
        .filter(f => f.startsWith('summary-') && f.endsWith('.md'))
        .map(f => ({ 
          name: f, 
          path: path.join(summariesDir, f),
          time: parseInt(f.replace('summary-', '').replace('.md', '')) || 0
        }))
        .sort((a, b) => b.time - a.time);
      
      // Delete files beyond MAX_SUMMARY_FILES
      if (summaryFiles.length > MAX_SUMMARY_FILES) {
        const filesToDelete = summaryFiles.slice(MAX_SUMMARY_FILES);
        for (const file of filesToDelete) {
          try {
            await fs.unlink(file.path);
            logger.debug(`[Session Summary] Cleaned up old summary: ${file.name}`);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }
    } catch (cleanupError) {
      logger.debug('[Session Summary] Cleanup error:', cleanupError);
    }
    
    // Mark request as completed
    activeRequests.delete(requestKey);
    
    return NextResponse.json({ 
      success: true,
      summary: result.summary,
      file: summaryFile,
      metadata: result.metadata
    });
  } catch (error) {
    logger.error('Failed to generate session summary:', error);
    
    // Clean up active request on error
    activeRequests.delete(requestKey);
    
    return NextResponse.json(
      { error: 'Failed to generate session summary' },
      { status: 500 }
    );
  }
}

async function getTerminalHistory(): Promise<string> {
  // In a real implementation, this would fetch from the terminal session
  // For now, return mock data or empty
  return 'cd project\nnpm install\nnpm run dev\ngit status';
}

async function getFileChanges(): Promise<string> {
  // In a real implementation, this would track file changes
  // For now, return mock data or empty
  return 'Modified: src/App.tsx\nCreated: src/components/NewComponent.tsx';
}

async function getCommits(): Promise<string> {
  // In a real implementation, this would fetch git commits
  // For now, return mock data or empty
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync('git log --oneline -10');
    return stdout;
  } catch (error) {
    return 'No git commits available';
  }
}