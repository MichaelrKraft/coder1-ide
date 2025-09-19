/**
 * CLI Detection Service (Client-side Mock)
 * Browser-safe mock implementation for development
 */

import { logger } from '@/lib/logger';

export interface CLIInfo {
  name: string;
  command: string;
  version: string | null;
  installed: boolean;
  authenticated: boolean;
  description: string;
  icon: string;
  features: string[];
  contextCommand?: string;
  sessionCommand?: string;
}

export interface CLIDetectionResult {
  platforms: CLIInfo[];
  primary: CLIInfo | null;
  timestamp: Date;
}

// Mock data for browser testing
const MOCK_PLATFORMS: CLIInfo[] = [
  {
    name: 'Claude Code',
    command: 'claude',
    version: 'latest',
    installed: true,
    authenticated: true,
    description: 'Anthropic\'s Claude Code CLI - Native integration',
    icon: '🤖',
    features: ['code-generation', 'context-aware', 'multi-file', 'testing'],
    contextCommand: 'claude --context',
    sessionCommand: 'claude'
  },
  {
    name: 'OpenAI CLI',
    command: 'openai',
    version: '1.0.0',
    installed: true,
    authenticated: false,
    description: 'OpenAI\'s official CLI tool',
    icon: '🧠',
    features: ['code-generation', 'chat', 'completions'],
    contextCommand: 'openai --context',
    sessionCommand: 'openai chat'
  },
  {
    name: 'GitHub Copilot CLI',
    command: 'gh copilot',
    version: '2.0.0',
    installed: true,
    authenticated: true,
    description: 'GitHub Copilot in the command line',
    icon: '🐙',
    features: ['explain', 'suggest', 'code-generation'],
    contextCommand: 'gh copilot explain',
    sessionCommand: 'gh copilot suggest'
  }
];

class CLIDetectorClient {
  private cache: CLIDetectionResult | null = null;

  async detectAll(forceRefresh = false): Promise<CLIDetectionResult> {
    if (!forceRefresh && this.cache) {
      return this.cache;
    }

    logger.info('🔍 [Mock] Detecting AI CLI platforms...');

    // Simulate async detection
    await new Promise(resolve => setTimeout(resolve, 500));

    const result: CLIDetectionResult = {
      platforms: MOCK_PLATFORMS,
      primary: MOCK_PLATFORMS[0],
      timestamp: new Date()
    };

    this.cache = result;
    logger.info(`✅ [Mock] Detected ${MOCK_PLATFORMS.length} AI platforms`);
    
    return result;
  }

  async getPlatform(name: string): Promise<CLIInfo | null> {
    const result = await this.detectAll();
    return result.platforms.find(p => p.name === name) || null;
  }

  async isPlatformAvailable(name: string): Promise<boolean> {
    const platform = await this.getPlatform(name);
    return platform?.installed && platform?.authenticated || false;
  }

  async getSessionCommand(platformName: string, context?: string): Promise<string | null> {
    const platform = await this.getPlatform(platformName);
    if (!platform || !platform.installed) return null;
    return platform.sessionCommand || platform.command;
  }
}

export const cliDetector = new CLIDetectorClient();
export default cliDetector;