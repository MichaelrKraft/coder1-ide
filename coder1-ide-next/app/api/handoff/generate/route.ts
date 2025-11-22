import { NextRequest, NextResponse } from 'next/server';
import { sessionSummaryService } from '@/services/SessionSummaryService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, contextUsage } = body;
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID required' },
        { status: 400 }
      );
    }
    
    // Collect session data (this would ideally come from session storage)
    // For now, we'll use the service's collection method
    const sessionData = sessionSummaryService.collectSessionData();
    
    // Generate comprehensive handoff document
    const handoffDocument = generateHandoffDocument(sessionData, contextUsage);
    
    // Store handoff in both CLI and IDE locations for dual compatibility
    await storeHandoff(sessionId, handoffDocument);
    
    return NextResponse.json({
      success: true,
      handoff: handoffDocument,
      metadata: {
        sessionId,
        timestamp: Date.now(),
        contextUsage: contextUsage || { total: 0, percentage: 0 }
      }
    });
  } catch (error) {
    console.error('Handoff generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

function generateHandoffDocument(sessionData: any, contextUsage?: any): string {
  const timestamp = new Date().toISOString();
  const contextInfo = contextUsage ? `
## 📊 Context Window Status
- **Current Usage**: ${contextUsage.total?.toLocaleString() || 0} tokens (${contextUsage.percentage || 0}%)
- **Limit**: 200,000 tokens
- **Status**: ${contextUsage.percentage >= 75 ? '🔴 Critical - Handoff Required' : contextUsage.percentage >= 50 ? '🟡 Warning - Handoff Recommended' : '🟢 Healthy'}
- **Reason for Handoff**: ${contextUsage.percentage >= 75 ? 'Context window nearing limit' : contextUsage.percentage >= 50 ? 'Proactive context management' : 'Best practice for session continuity'}
` : '';

  return `# Session Handoff Document
**Generated**: ${timestamp}
**Session Type**: ${sessionData.sessionType || 'General Development'}
**Duration**: ${sessionData.sessionDuration} minutes
${contextInfo}

---

## 🎯 Executive Summary

This handoff document captures the complete state of the current development session to enable seamless continuation by the next agent or developer. All context, decisions, blockers, and next steps are preserved below.

---

## 📖 Session Overview

### What Was Accomplished
${sessionData.breakthroughs.length > 0 ? sessionData.breakthroughs.map((b: string) => `- ${b}`).join('\n') : '- Session in progress (see detailed history below)'}

### Current State
- **Active Files**: ${sessionData.openFiles.length} files
- **Modified Files**: ${sessionData.openFiles.filter((f: any) => f.isDirty).length} files  
- **Commands Executed**: ${sessionData.terminalCommands.length} total
- **Errors Encountered**: ${sessionData.errors.length}

---

## 📁 File Inventory

${sessionData.openFiles.length > 0 ? sessionData.openFiles.map((file: any) => `
### ${file.name} ${file.isDirty ? '🔴 UNSAVED' : '✅'}
- **Path**: \`${file.path}\`
- **Language**: ${file.language || 'unknown'}
- **Size**: ${file.content.length} characters
- **Status**: ${file.isDirty ? '⚠️ Has unsaved changes - SAVE REQUIRED' : '✓ Saved'}
`).join('\n') : '*No files currently open*'}

---

## 💻 Command History

### Recent Commands (Last 20)
\`\`\`bash
${sessionData.terminalCommands.slice(-20).join('\n')}
\`\`\`

---

## 🚧 Blockers & Issues

${sessionData.blockers.length > 0 ? sessionData.blockers.map((b: string) => `- ${b}`).join('\n') : '*No blockers recorded*'}

${sessionData.errors.length > 0 ? `
### Errors Encountered
${sessionData.errors.slice(-10).map((e: any) => `
**${new Date(e.timestamp).toLocaleTimeString()}** - ${e.source}
\`\`\`
${e.message}
\`\`\`
`).join('\n')}
` : ''}

---

## ✅ Key Decisions Made

${sessionData.keyDecisions.length > 0 ? sessionData.keyDecisions.map((d: string) => `- ${d}`).join('\n') : '*No explicit decisions recorded*'}

---

## 📋 Next Steps

### Immediate Actions
1. **First Priority**: ${sessionData.openFiles.filter((f: any) => f.isDirty).length > 0 ? 'Save all unsaved files' : 'Review current state and continue development'}
2. **Second Priority**: ${sessionData.errors.length > 0 ? 'Address the errors listed above' : 'Run tests to verify current functionality'}
3. **Third Priority**: ${sessionData.blockers.length > 0 ? 'Resolve blockers before proceeding' : 'Continue with planned features'}

### Continue Development
Based on session type (${sessionData.sessionType}), the next agent should:
${sessionData.sessionType === 'bug-fix' ? `
- Continue debugging the identified issues
- Add regression tests
- Verify fixes work in all scenarios
` : sessionData.sessionType === 'feature-dev' ? `
- Complete feature implementation
- Add comprehensive tests
- Update documentation
` : sessionData.sessionType === 'refactoring' ? `
- Continue code improvements
- Ensure no functionality broken
- Update affected tests
` : `
- Review session context above
- Determine next development priority
- Continue based on project requirements
`}

---

## 🧪 Testing Status

${sessionData.testResults ? `
### Last Test Run
- **Passed**: ${sessionData.testResults.passed}
- **Failed**: ${sessionData.testResults.failed}
- **Last Run**: ${new Date(sessionData.testResults.lastRun).toLocaleString()}
` : '*No test results available*'}

### What Needs Testing
- All modified files should be tested
- Edge cases should be validated
- Integration tests recommended

---

## 🔧 Environment & Configuration

${sessionData.gitStatus ? `
### Git Status
- **Branch**: ${sessionData.gitStatus.branch}
- **Modified Files**: ${sessionData.gitStatus.modifiedFiles.length}
- **Staged Files**: ${sessionData.gitStatus.stagedFiles.length}
- **Untracked Files**: ${sessionData.gitStatus.untrackedFiles.length}
` : ''}

### Project Structure
${sessionData.projectStructure.length > 0 ? sessionData.projectStructure.map((p: string) => `- ${p}`).join('\n') : '*Project structure not available*'}

---

## 📊 Session Metrics

- **Duration**: ${sessionData.sessionDuration} minutes
- **Files Opened**: ${sessionData.openFiles.length}
- **Commands Run**: ${sessionData.terminalCommands.length}
- **Command Velocity**: ${(sessionData.terminalCommands.length / Math.max(sessionData.sessionDuration, 1)).toFixed(2)} commands/minute
- **Error Rate**: ${(sessionData.errors.length / Math.max(sessionData.sessionDuration, 1)).toFixed(2)} errors/minute

---

## 🎯 Handoff Instructions

### For the Next Agent

1. **Review this entire document** to understand session context
2. **Check file status** - save any unsaved files immediately
3. **Address blockers** - resolve issues before new development
4. **Continue development** - follow the next steps outlined above
5. **Create checkpoints** - regular checkpoints for session continuity

### Success Criteria

The next session should:
- [ ] All files saved and committed (if appropriate)
- [ ] All errors addressed or documented
- [ ] Tests passing (or test failures explained)
- [ ] Next development steps clear
- [ ] No blockers preventing progress

---

## 💡 Additional Context

### Terminal Output (Last 1000 chars)
\`\`\`
${sessionData.terminalHistory.slice(-1000)}
\`\`\`

---

## 📝 Notes

${contextUsage?.percentage >= 50 ? `
**Context Management**: This handoff was created to manage context window usage. Starting a fresh session with this document will provide optimal AI performance while preserving all necessary context.
` : ''}

**Handoff Type**: ${contextUsage?.percentage >= 75 ? 'Emergency (Critical Context Usage)' : contextUsage?.percentage >= 50 ? 'Proactive (Best Practice)' : 'Standard Session Handoff'}

---

*🤖 Generated by Coder1 IDE Session Handoff System*  
*📅 ${timestamp}*  
*🆔 Session: ${sessionData.sessionDuration}min-${Date.now()}*
`;
}

async function storeHandoff(sessionId: string, handoffDocument: string): Promise<void> {
  // Store in CLI location (~/.claude/handoffs/)
  const fs = require('fs').promises;
  const path = require('path');
  const os = require('os');
  
  const cliHandoffsDir = path.join(os.homedir(), '.claude', 'handoffs');
  const ideHandoffsDir = path.join(process.cwd(), 'handoffs');
  
  // Ensure directories exist
  await fs.mkdir(cliHandoffsDir, { recursive: true });
  await fs.mkdir(ideHandoffsDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `handoff-${sessionId}-${timestamp}.md`;
  
  // Store in both locations for dual compatibility
  await Promise.all([
    fs.writeFile(path.join(cliHandoffsDir, filename), handoffDocument, 'utf-8'),
    fs.writeFile(path.join(ideHandoffsDir, filename), handoffDocument, 'utf-8')
  ]);
}
