/**
 * Johnny5 Setup API
 *
 * Handles Johnny5 configuration for self-hosted setup.
 *
 * POST /api/johnny5/setup/config - Save Johnny5 configuration
 * GET /api/johnny5/setup/status - Check if Johnny5 is installed/configured
 * POST /api/johnny5/setup/install-daemon - Install system service (requires bridge)
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

// Force dynamic rendering - setup state changes
export const dynamic = 'force-dynamic';

// Johnny5 daemon config directory (stored in .manuslive for compatibility)
const JOHNNY5_DAEMON_DIR = join(homedir(), '.manuslive');
const JOHNNY5_DAEMON_CONFIG = join(JOHNNY5_DAEMON_DIR, 'config.json');
const JOHNNY5_DB = join(JOHNNY5_DAEMON_DIR, 'memory.sqlite');

// Coder1 local config for storing setup preferences
const CODER1_DIR = join(homedir(), '.coder1');
const JOHNNY5_USER_CONFIG = join(CODER1_DIR, 'johnny5-config.json');

interface Johnny5Config {
  integrations: {
    zapier?: { token: string } | null;
    telegram?: { token: string; botUsername: string } | null;
  };
  permissions: {
    fileWrite: boolean;
    terminalExec: boolean;
    autoActions: boolean;
    externalRequests: boolean;
  };
  proactivityLevel: 'low' | 'medium' | 'high';
  setupCompleted?: boolean;
  setupDate?: string;
}

interface Johnny5DaemonConfig {
  telegram?: {
    token: string;
    enabled: boolean;
  };
  gateway: {
    port: number;
  };
  memory: {
    path: string;
  };
}

/**
 * Ensure directories exist
 */
function ensureDirectories(): void {
  if (!existsSync(CODER1_DIR)) {
    mkdirSync(CODER1_DIR, { recursive: true });
  }
  if (!existsSync(JOHNNY5_DAEMON_DIR)) {
    mkdirSync(JOHNNY5_DAEMON_DIR, { recursive: true });
  }
}

/**
 * Check if Johnny5 is installed and running
 */
function checkJohnny5Status(): { installed: boolean; running: boolean; configured: boolean } {
  const installed = existsSync(JOHNNY5_DB) || existsSync(JOHNNY5_DAEMON_CONFIG);
  const configured = existsSync(JOHNNY5_DAEMON_CONFIG);

  let running = false;
  try {
    // Check if Johnny5 process is running
    const result = execSync('pgrep -f "johnny5" || pgrep -f "manuslive" || pgrep -f "moltbot" || true', {
      encoding: 'utf-8',
      timeout: 2000,
    }).trim();
    running = result.length > 0;
  } catch {
    // Process check failed, assume not running
  }

  return { installed, running, configured };
}

/**
 * GET - Check setup status
 */
export async function GET() {
  try {
    const johnny5Status = checkJohnny5Status();

    // Read existing Johnny5 user config if it exists
    let johnny5Config: Johnny5Config | null = null;
    if (existsSync(JOHNNY5_USER_CONFIG)) {
      try {
        johnny5Config = JSON.parse(readFileSync(JOHNNY5_USER_CONFIG, 'utf-8'));
      } catch {
        // Config file corrupted, ignore
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        setupCompleted: johnny5Config?.setupCompleted || false,
        setupDate: johnny5Config?.setupDate,
        johnny5: johnny5Status,
        integrations: {
          zapier: johnny5Config?.integrations?.zapier ? { connected: true } : { connected: false },
          telegram: johnny5Config?.integrations?.telegram
            ? { connected: true, botUsername: johnny5Config.integrations.telegram.botUsername }
            : { connected: false },
        },
        permissions: johnny5Config?.permissions || null,
        proactivityLevel: johnny5Config?.proactivityLevel || 'medium',
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[Johnny5 Setup API] Error checking status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Save configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Handle different actions
    if (action === 'install-daemon') {
      return handleInstallDaemon();
    }

    // Default action: save config
    return handleSaveConfig(body);
  } catch (error) {
    console.error('[Johnny5 Setup API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Setup failed' },
      { status: 500 }
    );
  }
}

/**
 * Save Johnny5 configuration
 */
async function handleSaveConfig(config: Johnny5Config): Promise<NextResponse> {
  try {
    ensureDirectories();

    // Add metadata
    const fullConfig: Johnny5Config = {
      ...config,
      setupCompleted: true,
      setupDate: new Date().toISOString(),
    };

    // Save Johnny5 user config
    writeFileSync(JOHNNY5_USER_CONFIG, JSON.stringify(fullConfig, null, 2), 'utf-8');
    console.log('[Johnny5 Setup API] Saved Johnny5 user config to', JOHNNY5_USER_CONFIG);

    // If Telegram is configured, update Johnny5 daemon config
    if (config.integrations?.telegram?.token) {
      const daemonConfig: Johnny5DaemonConfig = {
        telegram: {
          token: config.integrations.telegram.token,
          enabled: true,
        },
        gateway: {
          port: 18789,
        },
        memory: {
          path: JOHNNY5_DB,
        },
      };

      // Read existing daemon config and merge
      let existingConfig: Johnny5DaemonConfig | null = null;
      if (existsSync(JOHNNY5_DAEMON_CONFIG)) {
        try {
          existingConfig = JSON.parse(readFileSync(JOHNNY5_DAEMON_CONFIG, 'utf-8'));
        } catch {
          // Ignore corrupted config
        }
      }

      const mergedConfig = {
        ...existingConfig,
        ...daemonConfig,
      };

      writeFileSync(JOHNNY5_DAEMON_CONFIG, JSON.stringify(mergedConfig, null, 2), 'utf-8');
      console.log('[Johnny5 Setup API] Saved Johnny5 daemon config to', JOHNNY5_DAEMON_CONFIG);
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      data: {
        configPath: JOHNNY5_USER_CONFIG,
        daemonConfigPath: config.integrations?.telegram ? JOHNNY5_DAEMON_CONFIG : null,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[Johnny5 Setup API] Error saving config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

/**
 * Install Johnny5 daemon as system service
 * Requires Coder1 Bridge CLI to be running
 */
async function handleInstallDaemon(): Promise<NextResponse> {
  try {
    const platform = process.platform;

    // This would typically be handled via the Bridge CLI
    // For now, return instructions for manual setup
    let instructions: string;

    if (platform === 'darwin') {
      // macOS - launchd
      instructions = `To auto-start Johnny5 on login:
1. Run: coder1-bridge johnny5 install
Or manually create ~/Library/LaunchAgents/com.coder1.johnny5.plist`;
    } else if (platform === 'linux') {
      // Linux - systemd
      instructions = `To auto-start Johnny5 on login:
1. Run: coder1-bridge johnny5 install
Or manually create ~/.config/systemd/user/johnny5.service`;
    } else {
      instructions = 'Automatic daemon installation is not supported on this platform. Please start Johnny5 manually.';
    }

    return NextResponse.json({
      success: true,
      message: 'Daemon installation instructions',
      data: {
        platform,
        instructions,
        manualStart: 'cd ~/johnny5 && npm start',
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[Johnny5 Setup API] Error installing daemon:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to install daemon' },
      { status: 500 }
    );
  }
}
