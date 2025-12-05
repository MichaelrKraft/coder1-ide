import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Hook definitions with their configurations
const HOOK_DEFINITIONS: Record<string, {
  script: string;
  hookType: string;
  matcher: string;
  command: string;
}> = {
  'session-complete-notifier': {
    script: 'session-complete-notifier.sh',
    hookType: 'Stop',
    matcher: '',
    command: 'bash {hooksDir}/session-complete-notifier.sh'
  },
  'session-start-context': {
    script: 'session-start-context.sh',
    hookType: 'UserPromptSubmit',
    matcher: '',
    command: 'bash {hooksDir}/session-start-context.sh'
  },
  'auto-test-on-edit': {
    script: 'auto-test-on-edit.sh',
    hookType: 'PostToolUse',
    matcher: 'Edit|Write|MultiEdit',
    command: 'bash {hooksDir}/auto-test-on-edit.sh $TOOL_INPUT'
  }
};

// Path to bundled hook scripts
const SCRIPTS_SOURCE_DIR = path.join(process.cwd(), '..', 'CANONICAL', 'hooks', 'scripts');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hookId, scope = 'global' } = body;

    // Validate hook exists
    if (!HOOK_DEFINITIONS[hookId]) {
      return NextResponse.json(
        { error: `Unknown hook: ${hookId}` },
        { status: 400 }
      );
    }

    const hookDef = HOOK_DEFINITIONS[hookId];

    // Determine installation paths
    let hooksDir: string;
    let settingsPath: string;

    if (scope === 'global') {
      hooksDir = path.join(os.homedir(), '.claude', 'hooks');
      settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
    } else {
      // Project scope - use current working directory
      const projectPath = body.projectPath || process.cwd();
      hooksDir = path.join(projectPath, '.claude', 'hooks');
      settingsPath = path.join(projectPath, '.claude', 'settings.json');
    }

    // Create hooks directory if it doesn't exist
    await fs.mkdir(hooksDir, { recursive: true });

    // Copy the hook script
    const sourceScript = path.join(SCRIPTS_SOURCE_DIR, hookDef.script);
    const destScript = path.join(hooksDir, hookDef.script);

    try {
      const scriptContent = await fs.readFile(sourceScript, 'utf-8');
      await fs.writeFile(destScript, scriptContent, { mode: 0o755 });
    } catch (err) {
      console.error('Failed to copy script:', err);
      return NextResponse.json(
        { error: 'Failed to copy hook script. Make sure the script source exists.' },
        { status: 500 }
      );
    }

    // Read or create settings.json
    let settings: Record<string, unknown> = {};
    try {
      const settingsContent = await fs.readFile(settingsPath, 'utf-8');
      settings = JSON.parse(settingsContent);
    } catch {
      // Settings file doesn't exist, start fresh
      // Ensure parent directory exists
      await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    }

    // Initialize hooks object if it doesn't exist
    if (!settings.hooks) {
      settings.hooks = {};
    }

    const hooks = settings.hooks as Record<string, Array<{ matcher: string; hooks: string[] }>>;

    // Initialize hook type array if it doesn't exist
    if (!hooks[hookDef.hookType]) {
      hooks[hookDef.hookType] = [];
    }

    // Generate the command with the correct hooks directory
    const command = hookDef.command.replace('{hooksDir}', hooksDir);

    // Check if this hook is already installed
    const existingHook = hooks[hookDef.hookType].find(h =>
      h.hooks.some(cmd => cmd.includes(hookDef.script))
    );

    if (existingHook) {
      return NextResponse.json({
        success: true,
        message: 'Hook already installed',
        alreadyInstalled: true,
        hookId,
        scope,
        scriptPath: destScript,
        settingsPath
      });
    }

    // Add the new hook configuration
    hooks[hookDef.hookType].push({
      matcher: hookDef.matcher,
      hooks: [command]
    });

    // Write updated settings
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: `Hook "${hookId}" installed successfully`,
      hookId,
      scope,
      scriptPath: destScript,
      settingsPath,
      restartRequired: true
    });

  } catch (error) {
    console.error('Hook installation error:', error);
    return NextResponse.json(
      { error: 'Failed to install hook', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to check installation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hookId = searchParams.get('hookId');
    const scope = searchParams.get('scope') || 'global';

    if (!hookId) {
      // Return all installable hooks
      return NextResponse.json({
        installableHooks: Object.keys(HOOK_DEFINITIONS),
        hooks: HOOK_DEFINITIONS
      });
    }

    if (!HOOK_DEFINITIONS[hookId]) {
      return NextResponse.json(
        { error: `Unknown hook: ${hookId}` },
        { status: 400 }
      );
    }

    const hookDef = HOOK_DEFINITIONS[hookId];

    // Determine paths
    let hooksDir: string;
    let settingsPath: string;

    if (scope === 'global') {
      hooksDir = path.join(os.homedir(), '.claude', 'hooks');
      settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
    } else {
      hooksDir = path.join(process.cwd(), '.claude', 'hooks');
      settingsPath = path.join(process.cwd(), '.claude', 'settings.json');
    }

    // Check if script exists
    const scriptPath = path.join(hooksDir, hookDef.script);
    let scriptInstalled = false;
    try {
      await fs.access(scriptPath);
      scriptInstalled = true;
    } catch {
      scriptInstalled = false;
    }

    // Check if hook is in settings
    let hookConfigured = false;
    try {
      const settingsContent = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(settingsContent);
      const hooks = settings.hooks?.[hookDef.hookType] || [];
      hookConfigured = hooks.some((h: { hooks: string[] }) =>
        h.hooks.some((cmd: string) => cmd.includes(hookDef.script))
      );
    } catch {
      hookConfigured = false;
    }

    return NextResponse.json({
      hookId,
      scope,
      installed: scriptInstalled && hookConfigured,
      scriptInstalled,
      hookConfigured,
      scriptPath,
      settingsPath
    });

  } catch (error) {
    console.error('Hook status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check hook status', details: String(error) },
      { status: 500 }
    );
  }
}
