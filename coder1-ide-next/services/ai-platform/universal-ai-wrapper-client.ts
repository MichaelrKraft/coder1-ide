/**
 * Universal AI Wrapper Service (Client-side Mock)
 * Browser-safe mock implementation for development
 */

import { EventEmitter } from 'events';
import { cliDetector, CLIInfo } from './cli-detector-client';
import { logger } from '@/lib/logger';

export interface AISession {
  id: string;
  platform: string;
  process: any;
  context: string[];
  history: AIInteraction[];
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'idle' | 'terminated';
}

export interface AIInteraction {
  timestamp: Date;
  input: string;
  output: string;
  tokensUsed?: number;
  platform: string;
}

export interface AICommand {
  platform?: string;
  prompt: string;
  context?: string;
  files?: string[];
  sessionId?: string;
  stream?: boolean;
}

export interface AIResponse {
  platform: string;
  response: string;
  sessionId: string;
  tokensUsed?: number;
  timestamp: Date;
  error?: string;
}

class UniversalAIWrapperClient extends EventEmitter {
  private sessions: Map<string, AISession> = new Map();
  private activePlatform: CLIInfo | null = null;

  async initialize(): Promise<void> {
    logger.info('[Mock] Initializing Universal AI Wrapper...');
    
    try {
      const detection = await cliDetector.detectAll();
      
      if (detection.platforms.length === 0) {
        logger.warn('[Mock] No AI CLI platforms detected - running in basic mode');
        // Don't throw error - just run without AI features
        this.activePlatform = null;
        return;
      }

      this.activePlatform = detection.primary;
      logger.info(`[Mock] Universal AI Wrapper ready with ${detection.platforms.length} platforms`);
      logger.info(`[Mock] Primary platform: ${this.activePlatform?.name}`);
    } catch (error) {
      logger.warn('[Mock] Failed to initialize AI platforms:', error);
      // Continue without AI features rather than breaking
      this.activePlatform = null;
    }
  }

  async execute(command: AICommand): Promise<AIResponse> {
    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1000));

    const platform = this.activePlatform || { name: 'Mock AI' };
    const sessionId = command.sessionId || this.createSessionId();

    // Mock response based on platform
    let mockResponse = '';
    if (command.prompt.toLowerCase().includes('hello')) {
      mockResponse = `Hello! I'm ${platform.name} running in mock mode. How can I help you today?`;
    } else if (command.prompt.toLowerCase().includes('code')) {
      mockResponse = `\`\`\`javascript\n// Mock code generation from ${platform.name}\nfunction example() {\n  console.log('This is a mock response');\n}\n\`\`\``;
    } else {
      mockResponse = `[Mock ${platform.name} Response] I received your prompt: "${command.prompt}". In a real environment, I would process this with the actual AI CLI.`;
    }

    const response: AIResponse = {
      platform: platform.name || 'Mock',
      response: mockResponse,
      sessionId,
      tokensUsed: Math.floor(Math.random() * 100) + 50,
      timestamp: new Date()
    };

    // Emit stream events if requested
    if (command.stream) {
      this.emit('stream', {
        sessionId,
        platform: platform.name,
        data: mockResponse
      });
    }

    return response;
  }

  async switchPlatform(platformName: string): Promise<boolean> {
    const platform = await cliDetector.getPlatform(platformName);
    
    if (!platform?.installed) {
      logger.error(`❌ [Mock] Cannot switch to ${platformName}: Not available`);
      return false;
    }

    this.activePlatform = platform;
    logger.info(`🔄 [Mock] Switched to ${platformName}`);
    
    this.emit('platform-switched', platform);
    
    return true;
  }

  async getAvailablePlatforms(): Promise<CLIInfo[]> {
    const detection = await cliDetector.detectAll();
    return detection.platforms;
  }

  getActivePlatform(): CLIInfo | null {
    return this.activePlatform;
  }

  getSession(sessionId: string): AISession | undefined {
    return this.sessions.get(sessionId);
  }

  getActiveSessions(): AISession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) return;

    session.status = 'terminated';
    session.endTime = new Date();

    logger.info(`🔚 [Mock] Terminated session ${sessionId}`);
    
    this.emit('session-terminated', sessionId);
  }

  private createSessionId(): string {
    return `ai_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  cleanupSessions(): void {
    const terminated = Array.from(this.sessions.values())
      .filter(s => s.status === 'terminated');

    terminated.forEach(session => {
      const ageMs = Date.now() - (session.endTime?.getTime() || 0);
      const oneHour = 60 * 60 * 1000;

      if (ageMs > oneHour) {
        this.sessions.delete(session.id);
        logger.debug(`🗑️ [Mock] Cleaned up session ${session.id}`);
      }
    });
  }
}

export const universalAIWrapper = new UniversalAIWrapperClient();
export default universalAIWrapper;