/**
 * useSessionSummary Hook
 * 
 * React hook for managing session summary generation and state
 */

'use client';

import { useState, useCallback } from 'react';
import { sessionSummaryService } from '@/services/SessionSummaryService';

interface SessionSummaryState {
  isGenerating: boolean;
  summary: string | null;
  insights: string | null;
  nextSteps: string | null;
  error: string | null;
  hasGenerated: boolean;
  progress: number;
  currentStep: string;
}

interface GenerateSummaryParams {
  openFiles?: any[];
  activeFile?: string | null;
  terminalHistory?: string;
  terminalCommands?: string[];
}

export const useSessionSummary = () => {
  const [state, setState] = useState<SessionSummaryState>({
    isGenerating: false,
    summary: null,
    insights: null,
    nextSteps: null,
    error: null,
    hasGenerated: false,
    progress: 0,
    currentStep: ''
  });

  const generateSummary = useCallback(async (params: GenerateSummaryParams = {}) => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      progress: 0,
      currentStep: 'Initializing session analysis...'
    }));

    try {
      // Simulate progress updates
      const progressSteps = [
        { progress: 10, step: '📊 Analyzing session type and context' },
        { progress: 25, step: '📁 Collecting file changes and modifications' },
        { progress: 40, step: '🔍 Extracting errors and breakthroughs' },
        { progress: 55, step: '🖥️ Processing terminal history' },
        { progress: 70, step: '🧠 Integrating repository intelligence' },
        { progress: 85, step: '🤖 Generating comprehensive analysis' },
        { progress: 95, step: '📝 Formatting handoff document' }
      ];

      // Update progress in intervals
      let stepIndex = 0;
      const progressInterval = setInterval(() => {
        if (stepIndex < progressSteps.length) {
          const currentStepData = progressSteps[stepIndex];
          setState(prev => ({
            ...prev,
            progress: currentStepData.progress,
            currentStep: currentStepData.step
          }));
          stepIndex++;
        } else {
          clearInterval(progressInterval);
        }
      }, 800);

      // Collect session data
      const sessionData = sessionSummaryService.collectSessionData(
        params.openFiles || [],
        params.activeFile || null,
        params.terminalHistory || '',
        params.terminalCommands || []
      );

      // Generate the summary
      const result = await sessionSummaryService.generateSessionSummary(sessionData);

      // Generate insights and next steps
      const insights = generateInsights(result.summary || '', sessionData);
      const nextSteps = generateNextSteps(result.summary || '', sessionData);

      clearInterval(progressInterval);

      setState(prev => ({
        ...prev,
        isGenerating: false,
        summary: result.summary || null,
        insights,
        nextSteps,
        error: result.error || null,
        hasGenerated: true,
        progress: 100,
        currentStep: 'Complete'
      }));

      // Reset progress after a moment
      setTimeout(() => {
        setState(prev => ({ ...prev, progress: 0, currentStep: '' }));
      }, 1000);

    } catch (error) {
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        progress: 0,
        currentStep: ''
      }));
    }
  }, []);

  const clearSummary = useCallback(() => {
    setState({
      isGenerating: false,
      summary: null,
      insights: null,
      nextSteps: null,
      error: null,
      hasGenerated: false,
      progress: 0,
      currentStep: ''
    });
  }, []);

  const copySummaryToClipboard = useCallback(async (content?: string): Promise<boolean> => {
    try {
      const textToCopy = content || state.summary || '';
      await navigator.clipboard.writeText(textToCopy);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, [state.summary]);

  const exportSummary = useCallback(async (format: 'markdown' | 'json' | 'html' | 'all' = 'markdown') => {
    if (!state.summary) return;

    try {
      // Create minimal session data for export
      const sessionData = sessionSummaryService.collectSessionData();
      
      const result = await sessionSummaryService.exportSessionSummary(
        state.summary,
        sessionData,
        {
          format,
          saveToFile: true,
          includeMetadata: true
        }
      );

      return result.success;
    } catch (error) {
      console.error('Export failed:', error);
      return false;
    }
  }, [state.summary]);

  const storeInDocumentation = useCallback(async (): Promise<boolean> => {
    if (!state.summary) return false;

    try {
      const sessionDate = new Date();
      const sessionId = `session_${sessionDate.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
      const sessionName = `CoderOne v2.0 Session ${sessionDate.toLocaleDateString()} ${sessionDate.toLocaleTimeString()}`;
      
      const response = await fetch('/api/docs/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: `session://${sessionId}`,
          name: sessionName,
          description: `CoderOne v2.0 development session with comprehensive AI analysis`,
          content: state.summary
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Session stored in Documentation Intelligence:', data.doc?.name);
        return true;
      } else {
        console.error('Failed to store session:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Error storing session in docs:', error);
      return false;
    }
  }, [state.summary]);

  return {
    // State
    isGenerating: state.isGenerating,
    summary: state.summary,
    insights: state.insights,
    nextSteps: state.nextSteps,
    error: state.error,
    hasGenerated: state.hasGenerated,
    progress: state.progress,
    currentStep: state.currentStep,
    
    // Actions
    generateSummary,
    clearSummary,
    copySummaryToClipboard,
    exportSummary,
    storeInDocumentation
  };
};

/**
 * Generate insights from the session summary
 */
function generateInsights(summary: string, sessionData: any): string {
  const insightsContent = `# 📊 Session Insights

## Key Patterns Detected
${extractPattern(summary, 'patterns', sessionData)}

## Code Quality Observations  
${extractPattern(summary, 'quality', sessionData)}

## Performance Considerations
${extractPattern(summary, 'performance', sessionData)}

## Technical Debt Identified
${extractPattern(summary, 'debt', sessionData)}

## Learning Opportunities
${extractPattern(summary, 'learning', sessionData)}

## Session Type Analysis
- **Detected Type**: ${sessionData.sessionType || 'general'}
- **Session Duration**: ${sessionData.sessionDuration || 0} minutes
- **Activity Level**: ${sessionData.terminalCommands?.length || 0} terminal commands
- **File Engagement**: ${sessionData.openFiles?.length || 0} files active

## Development Velocity Metrics
- **Files Modified**: ${sessionData.openFiles?.filter((f: any) => f.isDirty)?.length || 0}
- **Error Rate**: ${sessionData.errors?.length || 0} errors encountered
- **Breakthrough Moments**: ${sessionData.breakthroughs?.length || 0} successes identified

## CoderOne v2.0 Feature Utilization
- **Checkpoint System**: ${sessionData.checkpoints?.length || 0} checkpoints created
- **Terminal Integration**: Active session monitoring
- **File Management**: Real-time change tracking
- **Session Intelligence**: AI-powered analysis enabled`;

  return insightsContent;
}

/**
 * Generate next steps from the session summary  
 */
function generateNextSteps(summary: string, sessionData: any): string {
  const nextStepsContent = `# 🎯 Recommended Next Steps

## Immediate Actions
${generateNextStepsList('immediate', summary, sessionData)}

## Short-term Goals (Next Session)
${generateNextStepsList('shortTerm', summary, sessionData)}

## Long-term Improvements
${generateNextStepsList('longTerm', summary, sessionData)}

## Testing Requirements
${generateNextStepsList('testing', summary, sessionData)}

## Documentation Needs
${generateNextStepsList('documentation', summary, sessionData)}

## CoderOne v2.0 Optimization
${generateNextStepsList('coderone', summary, sessionData)}

## Session Continuity
- **Handoff Status**: Ready for next agent
- **Context Preservation**: Session data captured
- **State Management**: ${sessionData.openFiles?.filter((f: any) => f.isDirty)?.length || 0} unsaved files
- **Environment**: CoderOne v2.0 Next.js IDE active

## Recommended Agent Workflow
1. **Load Session Context**: Review this summary and insights
2. **Verify Environment**: Ensure CoderOne v2.0 IDE is running
3. **Check File States**: Address any unsaved changes
4. **Continue Development**: Based on session type and priorities`;

  return nextStepsContent;
}

function extractPattern(summary: string, type: string, sessionData: any): string {
  const patterns: Record<string, string> = {
    patterns: `- ${sessionData.sessionType || 'General'} development pattern detected
- Component-based architecture observed
- ${sessionData.openFiles?.length || 0} file interaction pattern
- Terminal command frequency: ${sessionData.terminalCommands?.length || 0} commands`,

    quality: `- Code quality metrics: ${sessionData.errors?.length === 0 ? 'Clean session, no errors' : `${sessionData.errors?.length} errors to address`}
- File management: ${sessionData.openFiles?.filter((f: any) => f.isDirty)?.length || 0} files with unsaved changes
- Session discipline: ${sessionData.sessionDuration > 30 ? 'Focused session' : 'Brief interaction'}`,

    performance: `- Session efficiency: ${sessionData.sessionDuration}min duration
- Command velocity: ${Math.round((sessionData.terminalCommands?.length || 0) / Math.max(sessionData.sessionDuration || 1, 1) * 60)} commands/hour
- File switching rate: Active file management observed`,

    debt: `- Unsaved changes: ${sessionData.openFiles?.filter((f: any) => f.isDirty)?.length || 0} files need attention
- Error accumulation: ${sessionData.errors?.length || 0} unresolved issues
- Session cleanup: ${sessionData.breakthroughs?.length > 0 ? 'Good progress made' : 'Consider consolidating work'}`,

    learning: `- CoderOne v2.0 IDE utilization: Active session management
- Development workflow: ${sessionData.sessionType} approach
- AI collaboration: Session intelligence system engaged
- Next.js development: Advanced IDE features available`
  };
  
  return patterns[type] || '- Analysis in progress';
}

function generateNextStepsList(category: string, summary: string, sessionData: any): string {
  const steps: Record<string, string> = {
    immediate: `1. Save ${sessionData.openFiles?.filter((f: any) => f.isDirty)?.length || 0} unsaved files
2. Address ${sessionData.errors?.length || 0} error${sessionData.errors?.length === 1 ? '' : 's'} if present
3. Run tests to verify current state
4. Create checkpoint in CoderOne v2.0`,

    shortTerm: `1. Complete current ${sessionData.sessionType} work
2. Implement unit tests for changes
3. Update documentation for modifications
4. Optimize performance based on insights`,

    longTerm: `1. Plan architectural improvements for scalability
2. Address technical debt systematically  
3. Enhance CoderOne v2.0 workflow integration
4. Consider advanced IDE features`,

    testing: `1. Run existing test suite
2. Add tests for new functionality
3. Verify edge case handling
4. Test in CoderOne v2.0 integrated environment`,

    documentation: `1. Update README with session changes
2. Add inline code comments
3. Document API changes if applicable
4. Store session summary in docs system`,

    coderone: `1. Utilize advanced checkpoint features
2. Leverage session intelligence insights
3. Optimize terminal integration workflow
4. Explore additional Next.js IDE capabilities`
  };
  
  return steps[category] || '- Planning in progress';
}

export default useSessionSummary;