/**
 * Client-side Memory Detection Service
 * Browser-safe version of the memory detection service
 */

import { SessionSummaryService } from '@/services/SessionSummaryService';
import { clientMemoryPreferences } from '@/lib/memory-preferences-client';

export interface MemoryWorthyEvent {
  type: 'bug-fix' | 'feature-completion' | 'breakthrough' | 'learning' | 'architecture-decision' | 'solution-discovery';
  confidence: number;
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
  confidence: number;
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
    // Check if memory detection is enabled
    if (!clientMemoryPreferences.isEnabled()) {
      return {
        isMemoryWorthy: false,
        confidence: 0,
        events: [],
        suggestedMemoryTitle: '',
        suggestedMemoryDescription: '',
        autoGenerationRecommended: false,
      };
    }
    
    console.log('🔍 [MEMORY-DETECT] Starting analysis with preferences:', {
      enabled: clientMemoryPreferences.isEnabled(),
      threshold: clientMemoryPreferences.getThreshold(),
      enabledEventTypes: clientMemoryPreferences.getEnabledEventTypes()
    });
    
    const sessionData = this.sessionSummaryService.collectSessionData(
      openFiles,
      activeFile,
      terminalHistory,
      terminalCommands
    );
    
    console.log('🔍 [MEMORY-DETECT] Session data collected:', {
      sessionType: sessionData.sessionType,
      sessionDuration: sessionData.sessionDuration,
      errors: sessionData.errors?.length || 0,
      breakthroughs: sessionData.breakthroughs?.length || 0
    });

    const events: MemoryWorthyEvent[] = [];
    let overallConfidence = 0;

    // Detect different types of memory-worthy events based on preferences
    if (clientMemoryPreferences.isEventTypeEnabled('bugFix')) {
      const bugFixes = this.detectBugFixes(sessionData);
      events.push(...bugFixes);
    }
    
    if (clientMemoryPreferences.isEventTypeEnabled('featureCompletion')) {
      const features = this.detectFeatureCompletions(sessionData);
      events.push(...features);
    }
    
    if (clientMemoryPreferences.isEventTypeEnabled('breakthrough')) {
      const breakthroughs = this.detectBreakthroughs(sessionData);
      events.push(...breakthroughs);
    }
    
    if (clientMemoryPreferences.isEventTypeEnabled('learning')) {
      const learning = this.detectLearningMoments(sessionData);
      events.push(...learning);
    }
    
    // TODO: Add detection for architecture-decision and solution-discovery when implemented
    
    console.log('🔍 [MEMORY-DETECT] Detection results after filtering:', {
      totalEvents: events.length,
      eventTypes: events.map(e => e.type)
    });

    // Calculate overall confidence
    if (events.length > 0) {
      overallConfidence = events.reduce((sum, event) => sum + event.confidence, 0) / events.length;
    }

    // Apply threshold from preferences
    const threshold = clientMemoryPreferences.getThreshold() / 100; // Convert percentage to decimal
    const meetsThreshold = overallConfidence >= threshold;

    // Determine if session is memory-worthy with threshold
    const isMemoryWorthy = meetsThreshold && this.isSessionMemoryWorthy(sessionData, events, overallConfidence);

    // Generate suggestions
    const suggestions = this.generateMemorySuggestions(sessionData, events);

    // Check auto-generation based on preferences
    const autoGenerationRecommended = isMemoryWorthy && clientMemoryPreferences.isAutoGenerationEnabled();

    const result = {
      isMemoryWorthy,
      confidence: overallConfidence,
      events,
      suggestedMemoryTitle: suggestions.title,
      suggestedMemoryDescription: suggestions.description,
      autoGenerationRecommended
    };
    
    console.log('🔍 [MEMORY-DETECT] Final result with preferences applied:', result);
    
    // Show notification if memory-worthy event detected
    if (isMemoryWorthy && clientMemoryPreferences.areNotificationsEnabled()) {
      clientMemoryPreferences.showNotification(
        `Memory-worthy session detected! (${Math.round(overallConfidence * 100)}% confidence)`,
        'info'
      );
    }
    
    return result;
  }

  private detectBugFixes(sessionData: any): MemoryWorthyEvent[] {
    const events: MemoryWorthyEvent[] = [];
    
    const errorCount = sessionData.errors?.length || 0;
    const breakthroughCount = sessionData.breakthroughs?.length || 0;
    const hasFixCommands = sessionData.terminalCommands.some((cmd: string) => 
      /fix|debug|test|solve/i.test(cmd)
    );

    if ((errorCount > 0 && breakthroughCount > 0) || hasFixCommands) {
      const confidence = Math.min(0.9, 
        (errorCount > 0 ? 0.3 : 0) + 
        (breakthroughCount > 0 ? 0.4 : 0) + 
        (hasFixCommands ? 0.3 : 0)
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
            errors: sessionData.errors?.map((e: any) => e.message) || [],
            breakthroughs: sessionData.breakthroughs || []
          },
          suggestedTags: ['bug-fix', 'debugging', 'error-resolution']
        });
      }
    }

    return events;
  }

  private detectFeatureCompletions(sessionData: any): MemoryWorthyEvent[] {
    const events: MemoryWorthyEvent[] = [];
    
    const isFeatureDev = sessionData.sessionType === 'feature-dev';
    const hasNewFiles = sessionData.openFiles.length > 3;
    const hasImplementationCommands = sessionData.terminalCommands.some((cmd: string) =>
      /create|add|implement|build|new/i.test(cmd)
    );

    if (isFeatureDev || hasNewFiles || hasImplementationCommands) {
      const confidence = 
        (isFeatureDev ? 0.4 : 0) +
        (hasNewFiles ? 0.3 : 0) +
        (hasImplementationCommands ? 0.3 : 0);

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

  private detectBreakthroughs(sessionData: any): MemoryWorthyEvent[] {
    const events: MemoryWorthyEvent[] = [];
    
    const breakthroughCount = sessionData.breakthroughs?.length || 0;
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
            breakthroughs: sessionData.breakthroughs || []
          },
          suggestedTags: ['breakthrough', 'success', 'milestone']
        });
      }
    }

    return events;
  }

  private detectLearningMoments(sessionData: any): MemoryWorthyEvent[] {
    const events: MemoryWorthyEvent[] = [];
    
    const isExploration = sessionData.sessionType === 'exploration';
    const hasLearningCommands = sessionData.terminalCommands.some((cmd: string) =>
      /help|docs|man|explore|analyze|investigate/i.test(cmd)
    );
    const hasLongSession = sessionData.sessionDuration > 30;

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

  private isSessionMemoryWorthy(sessionData: any, events: MemoryWorthyEvent[], confidence: number): boolean {
    // High confidence events are always memory-worthy
    if (confidence > 0.7) return true;

    // Multiple events suggest memory-worthy session
    if (events.length >= 2 && confidence > 0.5) return true;

    // Long sessions with any meaningful events
    if (sessionData.sessionDuration > 45 && events.length > 0 && confidence > 0.3) return true;

    // Sessions with breakthroughs
    if (sessionData.breakthroughs && sessionData.breakthroughs.length > 1) return true;

    // Sessions with successful error resolution
    if (sessionData.errors?.length > 0 && sessionData.breakthroughs?.length > 0) return true;

    // Feature development sessions with multiple files
    if (sessionData.sessionType === 'feature-dev' && sessionData.openFiles.length > 2) return true;

    return false;
  }

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

  public getAutoGenerationThreshold(): number {
    return 0.7;
  }

  public shouldAutoGenerateMemory(detectionResult: MemoryDetectionResult): boolean {
    return detectionResult.autoGenerationRecommended && 
           detectionResult.confidence >= this.getAutoGenerationThreshold() &&
           detectionResult.isMemoryWorthy;
  }
}

export const memoryDetectionService = MemoryDetectionService.getInstance();