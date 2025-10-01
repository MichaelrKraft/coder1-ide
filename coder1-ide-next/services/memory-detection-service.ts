/**
 * Memory Detection Service
 * 
 * Analyzes session data to detect memory-worthy events and sessions
 * Integrates with SessionSummaryService for comprehensive session analysis
 */

import { SessionSummaryService } from './SessionSummaryService';

export interface MemoryWorthyEvent {
  type: 'bug-fix' | 'feature-completion' | 'breakthrough' | 'learning' | 'architecture-decision' | 'solution-discovery';
  confidence: number; // 0-1 scale
  title: string;
  description: string;
  context: {
    files: string[];
    commands: string[];
    errors?: string[];
    breakthroughs?: string[];
  };
  suggestedTags: string[];
}

export interface MemoryDetectionResult {
  isMemoryWorthy: boolean;
  confidence: number; // Overall confidence 0-1
  events: MemoryWorthyEvent[];
  suggestedMemoryTitle: string;
  suggestedMemoryDescription: string;
  autoGenerationRecommended: boolean;
}

export class MemoryDetectionService {
  private static instance: MemoryDetectionService;
  private sessionSummaryService: SessionSummaryService;

  constructor() {
    this.sessionSummaryService = SessionSummaryService.getInstance();
  }

  public static getInstance(): MemoryDetectionService {
    if (!MemoryDetectionService.instance) {
      MemoryDetectionService.instance = new MemoryDetectionService();
    }
    return MemoryDetectionService.instance;
  }

  /**
   * Analyze current session for memory-worthy events
   */
  public analyzeSession(
    openFiles: any[] = [],
    activeFile: string | null = null,
    terminalHistory: string = '',
    terminalCommands: string[] = []
  ): MemoryDetectionResult {
    // Collect session data using existing service
    const sessionData = this.sessionSummaryService.collectSessionData(
      openFiles,
      activeFile,
      terminalHistory,
      terminalCommands
    );

    const events: MemoryWorthyEvent[] = [];
    let overallConfidence = 0;

    // Detect different types of memory-worthy events
    events.push(...this.detectBugFixes(sessionData));
    events.push(...this.detectFeatureCompletions(sessionData));
    events.push(...this.detectBreakthroughs(sessionData));
    events.push(...this.detectLearningMoments(sessionData));
    events.push(...this.detectArchitectureDecisions(sessionData));
    events.push(...this.detectSolutionDiscoveries(sessionData));

    // Calculate overall confidence
    if (events.length > 0) {
      overallConfidence = events.reduce((sum, event) => sum + event.confidence, 0) / events.length;
    }

    // Determine if session is memory-worthy
    const isMemoryWorthy = this.isSessionMemoryWorthy(sessionData, events, overallConfidence);

    // Generate suggestions
    const suggestions = this.generateMemorySuggestions(sessionData, events);

    return {
      isMemoryWorthy,
      confidence: overallConfidence,
      events,
      suggestedMemoryTitle: suggestions.title,
      suggestedMemoryDescription: suggestions.description,
      autoGenerationRecommended: overallConfidence > 0.7 && isMemoryWorthy
    };
  }

  /**
   * Detect bug fix events
   */
  private detectBugFixes(sessionData: any): MemoryWorthyEvent[] {
    const events: MemoryWorthyEvent[] = [];

    // Check for error resolution patterns
    const errorCount = sessionData.errors.length;
    const breakthroughCount = sessionData.breakthroughs.length;
    const hasFixCommands = sessionData.terminalCommands.some((cmd: string) => 
      /fix|debug|test|solve/i.test(cmd)
    );

    // Look for error-to-success patterns in terminal
    const hasErrorResolution = sessionData.terminalHistory.includes('error') && 
                               sessionData.terminalHistory.includes('fixed');

    if ((errorCount > 0 && breakthroughCount > 0) || hasFixCommands || hasErrorResolution) {
      const confidence = Math.min(0.9, 
        (errorCount > 0 ? 0.3 : 0) + 
        (breakthroughCount > 0 ? 0.4 : 0) + 
        (hasFixCommands ? 0.2 : 0) + 
        (hasErrorResolution ? 0.3 : 0)
      );

      if (confidence > 0.4) {
        events.push({
          type: 'bug-fix',
          confidence,
          title: 'Bug Fix Resolution',
          description: `Fixed ${errorCount} error(s) with ${breakthroughCount} breakthrough(s)`,
          context: {
            files: sessionData.openFiles.map((f: any) => f.name),
            commands: sessionData.terminalCommands.filter((cmd: string) => 
              /fix|debug|test|solve/i.test(cmd)
            ),
            errors: sessionData.errors.map((e: any) => e.message),
            breakthroughs: sessionData.breakthroughs
          },
          suggestedTags: ['bug-fix', 'debugging', 'error-resolution']
        });
      }
    }

    return events;
  }

  /**
   * Detect feature completion events
   */
  private detectFeatureCompletions(sessionData: any): MemoryWorthyEvent[] {
    const events: MemoryWorthyEvent[] = [];

    const isFeatureDev = sessionData.sessionType === 'feature-dev';
    const hasNewFiles = sessionData.openFiles.length > 3;
    const hasImplementationCommands = sessionData.terminalCommands.some((cmd: string) =>
      /create|add|implement|build|new/i.test(cmd)
    );
    const hasTestCommands = sessionData.terminalCommands.some((cmd: string) =>
      /test|spec|jest|npm run/i.test(cmd)
    );

    if (isFeatureDev || hasNewFiles || hasImplementationCommands) {
      const confidence = 
        (isFeatureDev ? 0.4 : 0) +
        (hasNewFiles ? 0.3 : 0) +
        (hasImplementationCommands ? 0.2 : 0) +
        (hasTestCommands ? 0.2 : 0);

      if (confidence > 0.5) {
        events.push({
          type: 'feature-completion',
          confidence: Math.min(0.95, confidence),
          title: 'Feature Implementation',
          description: `Implemented new feature with ${sessionData.openFiles.length} files`,
          context: {
            files: sessionData.openFiles.map((f: any) => f.name),
            commands: sessionData.terminalCommands.filter((cmd: string) =>
              /create|add|implement|build|new|test/i.test(cmd)
            )
          },
          suggestedTags: ['feature', 'implementation', 'development']
        });
      }
    }

    return events;
  }

  /**
   * Detect breakthrough moments
   */
  private detectBreakthroughs(sessionData: any): MemoryWorthyEvent[] {
    const events: MemoryWorthyEvent[] = [];

    const breakthroughCount = sessionData.breakthroughs.length;
    const successPatterns = sessionData.terminalHistory.split('\n').filter((line: string) =>
      /success|works|fixed|resolved|complete/i.test(line)
    ).length;

    if (breakthroughCount > 0 || successPatterns > 2) {
      const confidence = Math.min(0.9, 
        (breakthroughCount * 0.3) + 
        (successPatterns * 0.1)
      );

      if (confidence > 0.3) {
        events.push({
          type: 'breakthrough',
          confidence,
          title: 'Development Breakthrough',
          description: `Achieved ${breakthroughCount} breakthrough(s) with ${successPatterns} success indicators`,
          context: {
            files: sessionData.openFiles.map((f: any) => f.name),
            commands: sessionData.terminalCommands,
            breakthroughs: sessionData.breakthroughs
          },
          suggestedTags: ['breakthrough', 'success', 'milestone']
        });
      }
    }

    return events;
  }

  /**
   * Detect learning moments
   */
  private detectLearningMoments(sessionData: any): MemoryWorthyEvent[] {
    const events: MemoryWorthyEvent[] = [];

    const isExploration = sessionData.sessionType === 'exploration';
    const hasLearningCommands = sessionData.terminalCommands.some((cmd: string) =>
      /help|docs|man|explore|analyze|investigate/i.test(cmd)
    );
    const hasLongSession = sessionData.sessionDuration > 30; // 30+ minutes

    if (isExploration || hasLearningCommands || hasLongSession) {
      const confidence = 
        (isExploration ? 0.5 : 0) +
        (hasLearningCommands ? 0.3 : 0) +
        (hasLongSession ? 0.2 : 0);

      if (confidence > 0.4) {
        events.push({
          type: 'learning',
          confidence: Math.min(0.8, confidence),
          title: 'Learning Session',
          description: `Explored and learned new concepts over ${sessionData.sessionDuration} minutes`,
          context: {
            files: sessionData.openFiles.map((f: any) => f.name),
            commands: sessionData.terminalCommands.filter((cmd: string) =>
              /help|docs|man|explore|analyze|investigate/i.test(cmd)
            )
          },
          suggestedTags: ['learning', 'exploration', 'discovery']
        });
      }
    }

    return events;
  }

  /**
   * Detect architecture decisions
   */
  private detectArchitectureDecisions(sessionData: any): MemoryWorthyEvent[] {
    const events: MemoryWorthyEvent[] = [];

    const hasArchitectureFiles = sessionData.openFiles.some((f: any) =>
      /config|setup|architecture|structure|index/i.test(f.name)
    );
    const hasStructuralCommands = sessionData.terminalCommands.some((cmd: string) =>
      /refactor|restructure|organize|migrate/i.test(cmd)
    );
    const isRefactoring = sessionData.sessionType === 'refactoring';

    if (hasArchitectureFiles || hasStructuralCommands || isRefactoring) {
      const confidence = 
        (hasArchitectureFiles ? 0.4 : 0) +
        (hasStructuralCommands ? 0.3 : 0) +
        (isRefactoring ? 0.4 : 0);

      if (confidence > 0.5) {
        events.push({
          type: 'architecture-decision',
          confidence: Math.min(0.9, confidence),
          title: 'Architecture Decision',
          description: 'Made important architectural or structural decisions',
          context: {
            files: sessionData.openFiles.map((f: any) => f.name),
            commands: sessionData.terminalCommands.filter((cmd: string) =>
              /refactor|restructure|organize|migrate/i.test(cmd)
            )
          },
          suggestedTags: ['architecture', 'design', 'structure']
        });
      }
    }

    return events;
  }

  /**
   * Detect solution discoveries
   */
  private detectSolutionDiscoveries(sessionData: any): MemoryWorthyEvent[] {
    const events: MemoryWorthyEvent[] = [];

    const hasWorkingCommands = sessionData.terminalCommands.some((cmd: string) =>
      /works|working|solution|found/i.test(cmd)
    );
    const hasMultipleApproaches = sessionData.terminalCommands.length > 10;
    const hasTroubleshootingPattern = sessionData.terminalHistory.includes('error') &&
                                     sessionData.terminalHistory.includes('solution');

    if (hasWorkingCommands || hasTroubleshootingPattern || 
        (hasMultipleApproaches && sessionData.breakthroughs.length > 0)) {
      const confidence = 
        (hasWorkingCommands ? 0.4 : 0) +
        (hasTroubleshootingPattern ? 0.4 : 0) +
        (hasMultipleApproaches && sessionData.breakthroughs.length > 0 ? 0.3 : 0);

      if (confidence > 0.4) {
        events.push({
          type: 'solution-discovery',
          confidence: Math.min(0.85, confidence),
          title: 'Solution Discovery',
          description: 'Discovered a solution through experimentation and troubleshooting',
          context: {
            files: sessionData.openFiles.map((f: any) => f.name),
            commands: sessionData.terminalCommands,
            breakthroughs: sessionData.breakthroughs
          },
          suggestedTags: ['solution', 'discovery', 'troubleshooting']
        });
      }
    }

    return events;
  }

  /**
   * Determine if session is memory-worthy
   */
  private isSessionMemoryWorthy(sessionData: any, events: MemoryWorthyEvent[], confidence: number): boolean {
    // High confidence events are always memory-worthy
    if (confidence > 0.7) return true;

    // Multiple events suggest memory-worthy session
    if (events.length >= 2 && confidence > 0.5) return true;

    // Long sessions with any meaningful events
    if (sessionData.sessionDuration > 45 && events.length > 0 && confidence > 0.3) return true;

    // Sessions with breakthroughs
    if (sessionData.breakthroughs.length > 1) return true;

    // Sessions with successful error resolution
    if (sessionData.errors.length > 0 && sessionData.breakthroughs.length > 0) return true;

    // Feature development sessions with multiple files
    if (sessionData.sessionType === 'feature-dev' && sessionData.openFiles.length > 2) return true;

    return false;
  }

  /**
   * Generate memory title and description suggestions
   */
  private generateMemorySuggestions(sessionData: any, events: MemoryWorthyEvent[]): {
    title: string;
    description: string;
  } {
    if (events.length === 0) {
      return {
        title: `${sessionData.sessionType || 'Development'} Session`,
        description: `Session working on ${sessionData.openFiles.length} files over ${sessionData.sessionDuration} minutes`
      };
    }

    // Use the highest confidence event for title
    const primaryEvent = events.reduce((highest, event) => 
      event.confidence > highest.confidence ? event : highest
    );

    let title = primaryEvent.title;
    
    // Add context if multiple events
    if (events.length > 1) {
      const eventTypes = [...new Set(events.map(e => e.type))];
      title = `${title} + ${eventTypes.length - 1} more`;
    }

    // Create comprehensive description
    const description = [
      primaryEvent.description,
      events.length > 1 ? `Also involved: ${events.slice(1).map(e => e.title.toLowerCase()).join(', ')}` : '',
      `Duration: ${sessionData.sessionDuration} minutes`,
      `Files: ${sessionData.openFiles.map((f: any) => f.name).join(', ') || 'None'}`
    ].filter(Boolean).join('. ');

    return { title, description };
  }

  /**
   * Get memory-worthy threshold for auto-generation
   */
  public getAutoGenerationThreshold(): number {
    return 0.7; // 70% confidence threshold for auto-generation
  }

  /**
   * Check if session meets auto-generation criteria
   */
  public shouldAutoGenerateMemory(detectionResult: MemoryDetectionResult): boolean {
    return detectionResult.autoGenerationRecommended && 
           detectionResult.confidence >= this.getAutoGenerationThreshold() &&
           detectionResult.isMemoryWorthy;
  }
}

// Export singleton instance
export const memoryDetectionService = MemoryDetectionService.getInstance();