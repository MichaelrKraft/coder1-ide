/**
 * CLI Detection Service
 * Detects which AI CLI tools are installed and available on the system
 */

import { execSync } from 'child_process';
import { logger } from '@/lib/logger';

// Helper function to execute commands asynchronously
const execAsync = (command: string): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    try {
      const stdout = execSync(command, { encoding: 'utf8' });
      resolve({ stdout, stderr: '' });
    } catch (error: any) {
      if (error.stdout || error.stderr) {
        resolve({ stdout: error.stdout || '', stderr: error.stderr || '' });
      } else {
        reject(error);
      }
    }
  });
};

export interface CLIInfo {
  name: string;
  command: string;
  version: string | null;
  installed: boolean;
  authenticated: boolean;
  description: string;
  icon: string;
  features: string[];
  contextCommand?: string; // Command to inject context
  sessionCommand?: string; // Command to start a session
}

export interface CLIDetectionResult {
  platforms: CLIInfo[];
  primary: CLIInfo | null; // Most capable/preferred platform
  timestamp: Date;
}

/**
 * Define supported AI CLI platforms
 */
const AI_PLATFORMS: Partial<CLIInfo>[] = [
  {
    name: 'Claude Code',
    command: 'claude',
    description: 'Anthropic\'s Claude Code CLI - Native integration',
    icon: '🤖',
    features: ['code-generation', 'context-aware', 'multi-file', 'testing'],
    contextCommand: 'claude --context',
    sessionCommand: 'claude'
  },
  {
    name: 'OpenAI CLI',
    command: 'openai',
    description: 'OpenAI\'s official CLI tool',
    icon: '🧠',
    features: ['code-generation', 'chat', 'completions'],
    contextCommand: 'openai --context',
    sessionCommand: 'openai chat'
  },
  {
    name: 'GitHub Copilot CLI',
    command: 'gh copilot',
    description: 'GitHub Copilot in the command line',
    icon: '🐙',
    features: ['explain', 'suggest', 'code-generation'],
    contextCommand: 'gh copilot explain',
    sessionCommand: 'gh copilot suggest'
  },
  {
    name: 'Aider',
    command: 'aider',
    description: 'AI pair programming in your terminal',
    icon: '👥',
    features: ['code-generation', 'git-aware', 'multi-file', 'refactoring'],
    contextCommand: 'aider --read',
    sessionCommand: 'aider'
  },
  {
    name: 'Continue Dev',
    command: 'continue',
    description: 'Open-source AI code assistant',
    icon: '⚡',
    features: ['code-generation', 'context-aware', 'multi-model'],
    sessionCommand: 'continue'
  },
  {
    name: 'Codeium CLI',
    command: 'codeium',
    description: 'Free AI code completion and chat',
    icon: '🎯',
    features: ['code-generation', 'autocomplete', 'chat'],
    sessionCommand: 'codeium chat'
  },
  {
    name: 'Cursor CLI',
    command: 'cursor',
    description: 'AI-first code editor CLI',
    icon: '✨',
    features: ['code-generation', 'context-aware', 'chat'],
    sessionCommand: 'cursor'
  },
  {
    name: 'Ollama',
    command: 'ollama',
    description: 'Run LLMs locally',
    icon: '🦙',
    features: ['local-models', 'privacy-first', 'code-generation'],
    sessionCommand: 'ollama run codellama'
  }
];

class CLIDetector {
  private cache: CLIDetectionResult | null = null;
  private cacheTimeout: NodeJS.Timeout | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Detect all installed AI CLI platforms
   */
  async detectAll(forceRefresh = false): Promise<CLIDetectionResult> {
    // Return cached result if available and not forcing refresh
    if (!forceRefresh && this.cache) {
      return this.cache;
    }

    logger.info('🔍 Detecting installed AI CLI platforms...');

    const detectionPromises = AI_PLATFORMS.map(platform => 
      this.detectPlatform(platform as CLIInfo)
    );

    const platforms = await Promise.all(detectionPromises);
    
    // Filter to only installed platforms
    const installedPlatforms = platforms.filter(p => p.installed);

    // Determine primary platform (prefer Claude, then most feature-rich)
    const primary = this.selectPrimaryPlatform(installedPlatforms);

    const result: CLIDetectionResult = {
      platforms: installedPlatforms,
      primary,
      timestamp: new Date()
    };

    // Cache the result
    this.cache = result;
    this.resetCacheTimeout();

    logger.info(`✅ Detected ${installedPlatforms.length} AI platforms`);
    
    return result;
  }

  /**
   * Detect a specific platform
   */
  private async detectPlatform(platformInfo: CLIInfo): Promise<CLIInfo> {
    const platform: CLIInfo = {
      ...platformInfo,
      version: null,
      installed: false,
      authenticated: false
    };

    try {
      // Check if command exists and get version
      const versionCommand = this.getVersionCommand(platform.command);
      const { stdout } = await execAsync(versionCommand);
      
      platform.installed = true;
      platform.version = this.parseVersion(stdout, platform.name);

      // Check authentication status
      platform.authenticated = await this.checkAuthentication(platform);

      logger.debug(`✅ ${platform.name}: v${platform.version || 'unknown'} (${platform.authenticated ? 'authenticated' : 'not authenticated'})`);
    } catch (error) {
      // Command not found or other error
      logger.debug(`❌ ${platform.name}: Not installed`);
    }

    return platform;
  }

  /**
   * Get appropriate version command for each CLI
   */
  private getVersionCommand(command: string): string {
    const versionCommands: Record<string, string> = {
      'claude': 'claude --version 2>&1',
      'openai': 'openai --version 2>&1',
      'gh copilot': 'gh copilot --version 2>&1',
      'aider': 'aider --version 2>&1',
      'continue': 'continue --version 2>&1',
      'codeium': 'codeium --version 2>&1',
      'cursor': 'cursor --version 2>&1',
      'ollama': 'ollama --version 2>&1'
    };

    return versionCommands[command] || `${command} --version 2>&1`;
  }

  /**
   * Parse version from command output
   */
  private parseVersion(output: string, platformName: string): string | null {
    // Try common version patterns
    const patterns = [
      /version\s+(\d+\.\d+\.\d+)/i,
      /v(\d+\.\d+\.\d+)/i,
      /(\d+\.\d+\.\d+)/
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Platform-specific parsing
    if (platformName === 'Claude Code' && output.includes('Claude')) {
      return 'latest'; // Claude might not show version number
    }

    return null;
  }

  /**
   * Check if platform is authenticated
   */
  private async checkAuthentication(platform: CLIInfo): Promise<boolean> {
    try {
      const authCommands: Record<string, string> = {
        'Claude Code': 'claude config get api_key 2>&1',
        'OpenAI CLI': 'openai api models.list --limit 1 2>&1',
        'GitHub Copilot CLI': 'gh auth status 2>&1',
        'Aider': 'aider --check-auth 2>&1',
        'Ollama': 'ollama list 2>&1' // Check if models are available
      };

      const authCommand = authCommands[platform.name];
      if (!authCommand) {
        // Assume authenticated if we can't check
        return true;
      }

      const { stdout, stderr } = await execAsync(authCommand);
      const output = stdout + stderr;

      // Platform-specific auth checks
      if (platform.name === 'Claude Code') {
        return !output.includes('not set') && !output.includes('error');
      }
      if (platform.name === 'GitHub Copilot CLI') {
        return output.includes('Logged in');
      }
      if (platform.name === 'OpenAI CLI') {
        return !output.includes('Incorrect API key') && !output.includes('No API key');
      }
      if (platform.name === 'Ollama') {
        return output.length > 0 && !output.includes('no models');
      }

      // Generic success check
      return !output.toLowerCase().includes('error') && 
             !output.toLowerCase().includes('unauthorized');
    } catch {
      return false;
    }
  }

  /**
   * Select the primary/preferred platform
   */
  private selectPrimaryPlatform(platforms: CLIInfo[]): CLIInfo | null {
    if (platforms.length === 0) return null;

    // Priority order
    const priorityOrder = [
      'Claude Code',      // Native integration
      'Aider',           // Most feature-rich
      'GitHub Copilot CLI', // Popular and powerful
      'OpenAI CLI',      // Official OpenAI
      'Continue Dev',    // Open source
      'Cursor CLI',      // Modern
      'Codeium CLI',     // Free
      'Ollama'          // Local/privacy
    ];

    // Find authenticated platforms first
    const authenticatedPlatforms = platforms.filter(p => p.authenticated);
    
    if (authenticatedPlatforms.length > 0) {
      // Return highest priority authenticated platform
      for (const name of priorityOrder) {
        const platform = authenticatedPlatforms.find(p => p.name === name);
        if (platform) return platform;
      }
      return authenticatedPlatforms[0];
    }

    // If no authenticated platforms, return highest priority installed
    for (const name of priorityOrder) {
      const platform = platforms.find(p => p.name === name);
      if (platform) return platform;
    }

    return platforms[0];
  }

  /**
   * Reset cache timeout
   */
  private resetCacheTimeout(): void {
    if (this.cacheTimeout) {
      clearTimeout(this.cacheTimeout);
    }

    this.cacheTimeout = setTimeout(() => {
      this.cache = null;
    }, this.CACHE_DURATION);
  }

  /**
   * Get a specific platform by name
   */
  async getPlatform(name: string): Promise<CLIInfo | null> {
    const result = await this.detectAll();
    return result.platforms.find(p => p.name === name) || null;
  }

  /**
   * Check if a specific platform is available
   */
  async isPlatformAvailable(name: string): Promise<boolean> {
    const platform = await this.getPlatform(name);
    return platform?.installed && platform?.authenticated || false;
  }

  /**
   * Get command to start a session with context
   */
  async getSessionCommand(platformName: string, context?: string): Promise<string | null> {
    const platform = await this.getPlatform(platformName);
    if (!platform || !platform.installed) return null;

    let command = platform.sessionCommand || platform.command;

    // Add context if provided and platform supports it
    if (context && platform.contextCommand) {
      // Escape context for shell
      const escapedContext = context.replace(/'/g, "'\\''");
      command = `echo '${escapedContext}' | ${platform.contextCommand}`;
    }

    return command;
  }
}

// Export singleton instance
export const cliDetector = new CLIDetector();

// Export for use in other modules
export default cliDetector;