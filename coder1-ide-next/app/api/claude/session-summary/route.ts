import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { withAPIMiddleware } from '@/lib/api-middleware';

async function sessionSummaryHandler({ req }: { req: NextRequest }): Promise<NextResponse> {
  const request = req;
  try {
    const requestData = await request.json();
    let { sessionId, sessionData, prompt, includeTerminalHistory, includeFileChanges, includeCommits } = requestData;
    
    // REMOVED: // REMOVED: console.log('📤 Session summary API called with:', { 
    //   hasSessionData: !!sessionData, 
    //   hasPrompt: !!prompt, 
    //   sessionId: sessionId?.substring(0, 20) + '...' 
    // });
    
    // If we received the enhanced sessionData and prompt from SessionSummaryService, use those
    if (sessionData && prompt) {
      // This is the enhanced call from SessionSummaryService
      // REMOVED: // REMOVED: console.log('📊 Using enhanced session data from SessionSummaryService');
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
    
    // Generate the summary directly (no external backend required)
    // REMOVED: // REMOVED: console.log('📝 Generating session summary locally...');
    
    const result = await generateSessionSummary(sessionData, prompt);
    // REMOVED: // REMOVED: console.log('✅ Session summary generated successfully');
    
    // Save summary to file locally as well
    const summariesDir = path.join(process.cwd(), 'summaries');
    try {
      await fs.mkdir(summariesDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    const summaryFile = path.join(summariesDir, `summary-${Date.now()}.md`);
    await fs.writeFile(summaryFile, result.summary || 'No summary generated');
    
    return NextResponse.json({ 
      success: true,
      summary: result.summary,
      file: summaryFile,
      metadata: result.metadata
    });
  } catch (error: any) {
    console.error('Failed to generate session summary:', error);
    console.error('Error stack:', error?.stack);
    return NextResponse.json(
      { 
        error: 'Failed to generate session summary',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export with AI middleware (rate limiting, logging) - disable body validation to avoid consuming body stream
export const POST = withAPIMiddleware(sessionSummaryHandler, {
  rateLimit: 'ai',
  logRequests: true,
  validateBody: false  // Disabled to prevent "Body has already been read" error
});

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

async function generateSessionSummary(sessionData: any, prompt: string): Promise<any> {
  // Generate a comprehensive session summary
  const now = new Date();
  
  // Extract key information from session data
  const sessionType = sessionData.sessionType || 'general';
  const openFiles = sessionData.openFiles || [];
  const terminalCommands = sessionData.terminalCommands || [];
  const errors = sessionData.errors || [];
  const breakthroughs = sessionData.breakthroughs || [];
  
  // Create a detailed markdown summary
  const summary = `# 📊 Coder1 Session Summary

**Session ID:** ${sessionData.sessionId || 'default'}  
**Date:** ${now.toLocaleDateString()}  
**Time:** ${now.toLocaleTimeString()}  
**Session Type:** ${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)}  
**Duration:** ${sessionData.sessionDuration || 0} minutes

## 🎯 Session Overview

This development session involved work on the Coder1 IDE project using the unified Next.js architecture. The session focused on ${sessionType} activities with ${openFiles.length} files open and ${terminalCommands.length} terminal commands executed.

## 📁 File Activity

${openFiles.length > 0 ? `**Files Worked On:**
${openFiles.map((file: any) => `- ${file.path || file.name} ${file.isDirty ? '(modified)' : '(unchanged)'}`).join('\n')}

**Active File:** ${sessionData.activeFile || 'None specified'}
` : 'No specific files were tracked in this session.'}

## 💻 Terminal Activity

${terminalCommands.length > 0 ? `**Commands Executed:**
\`\`\`bash
${terminalCommands.slice(-10).join('\n')}
\`\`\`

**Total Commands:** ${terminalCommands.length}
` : 'No terminal commands were recorded.'}

${sessionData.terminalHistory ? `**Terminal History:**
\`\`\`bash
${sessionData.terminalHistory.split('\n').slice(-20).join('\n')}
\`\`\`
` : ''}

## 🚨 Issues & Resolutions

${errors.length > 0 ? `**Errors Encountered:**
${errors.map((error: any) => `- **${error.source}**: ${error.message} (${new Date(error.timestamp).toLocaleTimeString()})`).join('\n')}
` : '✅ No errors were recorded during this session.'}

${breakthroughs.length > 0 ? `**Breakthroughs & Successes:**
${breakthroughs.map((breakthrough: string) => `- ${breakthrough}`).join('\n')}
` : ''}

## 🔧 Technical Context

**Project Structure:**
${sessionData.projectStructure ? sessionData.projectStructure.slice(0, 10).map((item: string) => `- ${item}`).join('\n') : '- Coder1 Next.js IDE project'}

**Git Status:**
${sessionData.gitStatus ? `- Branch: ${sessionData.gitStatus.branch}
- Modified Files: ${sessionData.gitStatus.modifiedFiles?.length || 0}
- Staged Files: ${sessionData.gitStatus.stagedFiles?.length || 0}
- Untracked Files: ${sessionData.gitStatus.untrackedFiles?.length || 0}` : '- Git status not available'}

## 📈 Session Metrics

- **File Engagement:** ${openFiles.filter((f: any) => f.isDirty).length}/${openFiles.length} files modified
- **Command Velocity:** ${Math.round((terminalCommands.length / Math.max(sessionData.sessionDuration || 1, 1)) * 60)} commands/hour
- **Error Rate:** ${errors.length} errors encountered
- **Session Efficiency:** ${breakthroughs.length > errors.length ? 'High' : errors.length === 0 ? 'Clean' : 'Troubleshooting'}

## 🎯 Key Decisions Made

${sessionData.keyDecisions?.length > 0 ? sessionData.keyDecisions.map((decision: string) => `- ${decision}`).join('\n') : '- Session focused on routine development tasks'}

## 🚧 Current Blockers

${sessionData.blockers?.length > 0 ? sessionData.blockers.map((blocker: string) => `- ${blocker}`).join('\n') : '- No active blockers identified'}

## 📋 Recommended Next Steps

### Immediate Actions (Next 15 minutes)
1. Save any unsaved changes (${openFiles.filter((f: any) => f.isDirty).length} files need attention)
2. Run tests to verify current functionality
3. Create a checkpoint if significant progress was made

### Short-term Goals (Next Session)
1. ${sessionType === 'bug-fix' ? 'Verify fixes and add regression tests' : 
     sessionType === 'feature-dev' ? 'Complete feature implementation and testing' :
     sessionType === 'refactoring' ? 'Finish refactoring and update documentation' :
     'Continue development based on session outcomes'}
2. Review and optimize any performance concerns
3. Update documentation if API changes were made

### Long-term Considerations
1. Consider architectural improvements based on session learnings
2. Plan integration testing for new functionality
3. Schedule code review if significant changes were made

## 🤝 Handoff Instructions

**For the next developer/AI agent:**
1. **Current State:** ${openFiles.filter((f: any) => f.isDirty).length > 0 ? 'There are unsaved changes that need attention' : 'All files are in a clean state'}
2. **Environment:** Coder1 unified Next.js server running on port 3001
3. **Context:** Review the terminal history and file changes above for complete context
4. **Priorities:** ${sessionType === 'bug-fix' ? 'Focus on testing and validation' :
                    sessionType === 'feature-dev' ? 'Complete implementation and testing' :
                    'Continue with planned development tasks'}

## 📊 Session Intelligence Insights

**Development Pattern:** ${sessionType} workflow detected  
**Productivity Score:** ${breakthroughs.length > errors.length ? '🟢 High' : errors.length === 0 ? '🟡 Steady' : '🟠 Debugging'}  
**Code Quality:** ${errors.length === 0 ? 'Clean session, no errors' : `${errors.length} issues to address`}  
**Session Discipline:** ${(sessionData.sessionDuration || 0) > 30 ? 'Focused development session' : 'Quick interaction or debugging'}

---

*🤖 Generated with Coder1 Session Intelligence*  
*📅 ${now.toISOString()}*  
*🏗️ Coder1 v2.0 Next.js IDE - Unified Architecture*
`;

  return {
    success: true,
    summary,
    metadata: {
      sessionId: sessionData.sessionId,
      timestamp: now.toISOString(),
      sessionType,
      fileCount: openFiles.length,
      modifiedFiles: openFiles.filter((f: any) => f.isDirty).length,
      commandCount: terminalCommands.length,
      errorCount: errors.length,
      breakthroughCount: breakthroughs.length,
      source: 'coder1-session-intelligence',
      format: 'markdown'
    }
  };
}