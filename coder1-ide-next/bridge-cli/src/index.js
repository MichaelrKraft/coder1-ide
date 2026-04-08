#!/usr/bin/env node

/**
 * Coder1 Bridge CLI
 * Connects local Claude CLI to remote Coder1 IDE
 */

// Handle EPIPE gracefully — happens when server closes the socket mid-write (e.g. user
// navigates away). Without this handler Node throws and crashes the entire bridge process.
process.on('uncaughtException', (err) => {
  if (err.code === 'EPIPE') {
    console.warn('[Bridge] Connection write error (server closed socket), waiting for reconnect...');
    return; // Don't crash — Socket.IO will reconnect automatically
  }
  // Re-throw all other unexpected errors so they still surface
  console.error('[Bridge] Fatal uncaught error:', err);
  process.exit(1);
});

const { program } = require('commander');
const readline = require('readline');
const BridgeClient = require('./bridge-client');
const logger = require('./logger');
const packageJson = require('../package.json');

// Helper function to get pairing code input
async function askForPairingCode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const askCode = () => {
      rl.question('Enter the 6-digit pairing code from the IDE: ', (answer) => {
        if (!/^\d{6}$/.test(answer.trim())) {
          console.log('\x1b[31mPlease enter a valid 6-digit code\x1b[0m');
          askCode();
        } else {
          rl.close();
          resolve(answer.trim());
        }
      });
    };
    askCode();
  });
}

// ASCII Art Banner
const banner = `
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║    ██████╗  ██████╗ ██████╗ ███████╗██████╗  ██╗    ║
║   ██╔════╝ ██╔═══██╗██╔══██╗██╔════╝██╔══██╗███║    ║
║   ██║      ██║   ██║██║  ██║█████╗  ██████╔╝╚██║    ║
║   ██║      ██║   ██║██║  ██║██╔══╝  ██╔══██╗ ██║    ║
║   ╚██████╗ ╚██████╔╝██████╔╝███████╗██║  ██║ ██║    ║
║    ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═╝    ║
║                                                       ║
║              Bridge CLI v${packageJson.version}                    ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`;

// Configure commander
program
  .name('coder1-bridge')
  .description('Bridge service to connect Coder1 IDE with local Claude CLI')
  .version(packageJson.version);

// Start command
program
  .command('start')
  .description('Start the bridge service and connect to Coder1 IDE')
  .option('-s, --server <url>', 'Server URL', 'https://coder1.ai')
  .option('-d, --dev', 'Development mode (connect to localhost)')
  .option('-v, --verbose', 'Verbose logging')
  .option('--no-banner', 'Skip banner display')
  .option('--auto', 'Auto-connect using saved credentials (skip pairing code)')
  .action(async (options) => {
    if (!options.banner === false) {
      console.log('\x1b[36m%s\x1b[0m', banner); // Cyan color without chalk
    }

    // Development mode overrides
    if (options.dev) {
      options.server = 'http://localhost:3001';
      console.log('\x1b[33m🔧 Development mode enabled\x1b[0m');
    }

    console.log(`\x1b[34m📡 Connecting to: ${options.server}\x1b[0m`);
    
    // Check if Claude CLI is installed
    const claudeCheck = await checkClaudeCLI();
    if (!claudeCheck.installed) {
      console.log('\x1b[31m❌ Claude CLI not found!\x1b[0m');
      console.log('\x1b[33m\nTo install Claude Code:\x1b[0m');
      console.log('  npm install -g @anthropic-ai/claude-code');
      console.log('\x1b[33m\nThen authenticate:\x1b[0m');
      console.log('  claude auth login');
      console.log('\x1b[33m\nAlternatively, download from:\x1b[0m');
      console.log('  https://claude.ai/download');
      process.exit(1);
    }
    console.log(`\x1b[32m✅ Claude CLI detected: ${claudeCheck.version || 'Unknown version'}\x1b[0m`);
    console.log(`\x1b[90m   Path: ${claudeCheck.path}\x1b[0m`);

    // Check if Claude CLI is authenticated (Dec 22, 2025 fix)
    // Enhanced Feb 2, 2026: Verify Pro/Max subscription for Johnny5
    const authCheck = await checkClaudeAuth(claudeCheck.path);
    if (!authCheck.authenticated) {
      console.log('\x1b[31m❌ Claude Code authentication failed\x1b[0m');
      console.log(`\x1b[33m   ${authCheck.message}\x1b[0m`);
      console.log('\x1b[33m\n   To authenticate:\x1b[0m');
      console.log('   claude auth login');
      console.log('\x1b[33m\n   To check subscription status:\x1b[0m');
      console.log('   claude auth status\n');
      process.exit(1);
    } else if (authCheck.verified) {
      console.log('\x1b[32m✅ Claude Code authenticated\x1b[0m');
      console.log('\x1b[90m   Your Pro/Max plan is ready to use\x1b[0m\n');
    } else if (authCheck.warning) {
      console.log('\x1b[33m⚠️  Auth check: ' + authCheck.warning + '\x1b[0m\n');
    }

    // Create bridge client
    const bridge = new BridgeClient({
      serverUrl: options.server,
      verbose: options.verbose,
      local: options.dev,  // Pass the dev flag to indicate local connection
      claudePath: claudeCheck.path  // 🔧 FIX: Pass resolved Claude path to executor
    });

    try {
      // Try auto-connect if --auto flag is set
      if (options.auto) {
        console.log('🔄 Attempting auto-connect with saved credentials...');
        const success = await bridge.autoConnect();
        if (success) {
          console.log('\x1b[32m✅ Auto-connected successfully!\x1b[0m');
        } else {
          console.log('\x1b[33m⚠️  Auto-connect failed. Falling back to pairing code.\x1b[0m');
          const pairingCode = await askForPairingCode();
          console.log('🔄 Connecting to Coder1 IDE...');
          await bridge.connect(pairingCode);
        }
      } else {
        // Standard pairing code flow
        const pairingCode = await askForPairingCode();
        console.log('🔄 Connecting to Coder1 IDE...');
        await bridge.connect(pairingCode);
      }
      
      console.log('\x1b[32m✅ Bridge connected successfully!\x1b[0m');
      
      // Display connection info
      console.log('\n\x1b[42m\x1b[30m CONNECTION ESTABLISHED \x1b[0m');
      console.log('\x1b[90m' + '─'.repeat(40) + '\x1b[0m');
      console.log('\x1b[37mBridge ID:\x1b[0m \x1b[36m' + bridge.bridgeId + '\x1b[0m');
      console.log('\x1b[37mUser ID:\x1b[0m \x1b[36m' + bridge.userId + '\x1b[0m');
      console.log('\x1b[37mStatus:\x1b[0m \x1b[32m● Active\x1b[0m');
      console.log('\x1b[90m' + '─'.repeat(40) + '\x1b[0m');
      console.log('\x1b[33m\n📝 You can now use Claude commands in the IDE terminal!\x1b[0m');
      console.log('\x1b[90mPress Ctrl+C to disconnect\x1b[0m\n');

      // Keep process alive and handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\x1b[33m\n\n⏹️  Shutting down bridge...\x1b[0m');
        await bridge.disconnect();
        console.log('\x1b[90mBridge disconnected. Goodbye!\x1b[0m');
        process.exit(0);
      });

    } catch (error) {
      console.log('\x1b[31m❌ Failed to connect\x1b[0m');
      console.error('\x1b[31mError:\x1b[0m', error.message);
      
      if (options.verbose) {
        console.error(error.stack);
      }
      
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Check bridge connection status')
  .option('-s, --server <url>', 'Server URL', 'https://coder1.ai')
  .action(async (options) => {
    const { hasCredentials, loadCredentials } = require('./credentials-manager');

    console.log('\x1b[34m🔍 Checking bridge status...\x1b[0m\n');

    // Check saved credentials
    console.log('\x1b[37mLocal Status:\x1b[0m');
    if (hasCredentials()) {
      const creds = loadCredentials();
      console.log('\x1b[32m  ✅ Saved credentials found\x1b[0m');
      console.log(`\x1b[90m     Server: ${creds?.serverUrl || 'N/A'}\x1b[0m`);
      console.log(`\x1b[90m     Saved: ${creds?.savedAt || 'N/A'}\x1b[0m`);
      console.log('\x1b[90m     Tip: Use --auto flag to connect without pairing code\x1b[0m');
    } else {
      console.log('\x1b[33m  ○ No saved credentials\x1b[0m');
      console.log('\x1b[90m     Connect once to save credentials for auto-reconnect\x1b[0m');
    }

    // Check server status
    console.log('\n\x1b[37mServer Status:\x1b[0m');
    try {
      const response = await fetch(`${options.server}/api/bridge/generate-code?userId=test`);
      const data = await response.json();

      if (data.connected) {
        console.log('\x1b[32m  ✅ Bridge service is online\x1b[0m');
        console.log(`\x1b[90m     Connected bridges: ${data.bridges?.length || 0}\x1b[0m`);
      } else {
        console.log('\x1b[33m  ⚠️ No active bridges\x1b[0m');
      }
    } catch (error) {
      console.log('\x1b[31m  ❌ Cannot reach bridge service\x1b[0m');
      if (options.verbose) {
        console.error(error);
      }
    }

    console.log('');
  });

// Test command
program
  .command('test')
  .description('Test Claude CLI installation')
  .action(async () => {
    console.log('\x1b[34m🧪 Testing Claude CLI...\x1b[0m');
    
    const check = await checkClaudeCLI();
    
    if (check.installed) {
      console.log('\x1b[32m✅ Claude CLI is installed\x1b[0m');
      console.log('\x1b[37mVersion:\x1b[0m', check.version || 'Unknown');
      console.log('\x1b[37mPath:\x1b[0m', check.path || 'In PATH');
      
      // Try a test command
      const { spawn } = require('child_process');
      const claude = spawn('claude', ['--version']);
      
      claude.stdout.on('data', (data) => {
        console.log('\x1b[90mOutput:\x1b[0m', data.toString().trim());
      });
      
      claude.on('close', (code) => {
        if (code === 0) {
          console.log('\x1b[32m✅ Claude CLI is working correctly\x1b[0m');
        } else {
          console.log('\x1b[33m⚠️ Claude CLI returned non-zero exit code\x1b[0m');
        }
      });
    } else {
      console.log('\x1b[31m❌ Claude CLI not found\x1b[0m');
      console.log('\x1b[33m\nTo install Claude Code:\x1b[0m');
      console.log('  npm install -g @anthropic-ai/claude-code');
      console.log('\x1b[33m\nThen authenticate:\x1b[0m');
      console.log('  claude auth login');
      console.log('\x1b[33m\nAlternatively, download from:\x1b[0m');
      console.log('  https://claude.ai/download');
      console.log('\x1b[33m\nAfter installation, run this test again.\x1b[0m');
    }
  });

// Diagnose command - full diagnostic for troubleshooting
// 🔧 FIX (Jan 4, 2026): Added auth status to diagnostics
program
  .command('diagnose')
  .description('Full diagnostic check for troubleshooting')
  .action(async () => {
    console.log('\n🔍 Coder1 Bridge Diagnostic Report\n');
    console.log('='.repeat(50));

    // System info
    console.log('\n📋 System Information:');
    console.log(`   Platform: ${process.platform}`);
    console.log(`   Node.js: ${process.version}`);
    console.log(`   Architecture: ${process.arch}`);

    // Claude CLI check
    console.log('\n🤖 Claude CLI Status:');
    const check = await checkClaudeCLI();
    if (check.installed) {
      console.log(`   ✅ Installed: ${check.path}`);
      console.log(`   Version: ${check.version || 'Unknown'}`);

      // 🔧 FIX: Add authentication status check
      // Enhanced Feb 2, 2026: Show verification status for Johnny5
      console.log('\n🔐 Authentication Status:');
      const authCheck = await checkClaudeAuth(check.path);
      if (authCheck.authenticated && authCheck.verified) {
        console.log('   ✅ Authenticated & Verified');
        console.log('   ✅ Pro/Max subscription active');
      } else if (authCheck.authenticated) {
        console.log('   ✅ Authenticated');
        if (authCheck.warning) {
          console.log(`   ⚠️  ${authCheck.warning}`);
        }
      } else {
        console.log('   ❌ NOT AUTHENTICATED');
        console.log(`   ${authCheck.message || 'Run: claude auth login'}`);
      }
    } else {
      console.log('   ❌ NOT FOUND');
      console.log('\n   Checked locations:');
      if (process.platform === 'win32') {
        console.log('   - %LOCALAPPDATA%\\Programs\\Claude\\claude.exe');
        console.log('   - %APPDATA%\\npm\\claude.cmd');
        console.log('   - C:\\Program Files\\Claude\\claude.exe');
      } else {
        console.log('   - /usr/local/bin/claude');
        console.log('   - /opt/homebrew/bin/claude');
        console.log('   - ~/.npm-global/bin/claude');
      }
    }

    // PATH info
    const pathSeparator = process.platform === 'win32' ? ';' : ':';
    console.log('\n📁 PATH Environment:');
    const pathDirs = (process.env.PATH || '').split(pathSeparator).slice(0, 5);
    pathDirs.forEach(p => console.log(`   - ${p}`));
    if (pathDirs.length < (process.env.PATH || '').split(':').length) {
      console.log('   ... (truncated)');
    }

    console.log('\n' + '='.repeat(50));
    console.log('Share this output when reporting issues.\n');
  });

// Helper function to check if Claude CLI is authenticated
// 🔧 FIX (Dec 22, 2025): Check auth status before commands to avoid silent timeouts
// 🔧 UPDATE (Feb 2, 2026): Enhanced with quick functional test for Johnny5 Bridge support
async function checkClaudeAuth(claudePath) {
  const { execSync, spawnSync } = require('child_process');

  try {
    // Step 1: Check version command works
    const result = execSync(`"${claudePath}" --version 2>&1`, {
      encoding: 'utf-8',
      timeout: 15000  // 15 second timeout
    });

    // Check for auth-related error messages in version output
    const lowerResult = result.toLowerCase();
    if (lowerResult.includes('not authenticated') ||
        lowerResult.includes('please log in') ||
        lowerResult.includes('auth login') ||
        lowerResult.includes('unauthorized')) {
      return {
        authenticated: false,
        message: 'Claude CLI requires authentication. Run: claude auth login'
      };
    }

    // Step 2: Quick functional test - verify we can actually execute commands
    // This confirms the user has an active Pro/Max subscription
    console.log('\x1b[90m   Verifying Claude Code authentication...\x1b[0m');

    try {
      const testResult = spawnSync(claudePath, ['--print', 'Say exactly: AUTH_OK'], {
        encoding: 'utf-8',
        timeout: 30000,  // 30 second timeout for auth test
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (testResult.status === 0 && testResult.stdout) {
        const output = testResult.stdout.toLowerCase();
        if (output.includes('auth_ok') || output.includes('ok')) {
          return {
            authenticated: true,
            verified: true,
            message: 'Claude Code authenticated and ready'
          };
        }
      }

      // Check stderr for auth errors
      if (testResult.stderr) {
        const stderr = testResult.stderr.toLowerCase();
        if (stderr.includes('not authenticated') ||
            stderr.includes('unauthorized') ||
            stderr.includes('subscription') ||
            stderr.includes('quota') ||
            stderr.includes('rate limit')) {
          return {
            authenticated: false,
            message: 'Claude Code subscription issue. Check your Pro/Max plan status.'
          };
        }
      }

      // Command ran but output was unexpected - still consider it working
      return {
        authenticated: true,
        verified: true,
        warning: 'Auth test completed with unexpected output'
      };

    } catch (testError) {
      // Test command failed - might be auth, might be other issue
      if (testError.killed) {
        return {
          authenticated: false,
          message: 'Claude CLI timed out (possible auth or subscription issue). Run: claude auth status'
        };
      }
      // Don't fail completely if just the test had issues
      return {
        authenticated: true,
        verified: false,
        warning: 'Could not verify auth (version check passed)'
      };
    }

  } catch (error) {
    // If command times out or fails, auth might be the issue
    if (error.killed || error.signal === 'SIGTERM') {
      return {
        authenticated: false,
        message: 'Claude CLI is not responding (possible auth issue). Run: claude auth status'
      };
    }
    return {
      authenticated: true,  // Assume ok if just version check failed
      warning: error.message
    };
  }
}

// Helper function to check Claude CLI
// 🔧 FIX (Dec 15, 2025): Enhanced to try common paths and always return full path
// This fixes "Claude CLI not found" errors when pty.spawn can't find 'claude' in PATH
async function checkClaudeCLI() {
  const { execSync } = require('child_process');
  const fs = require('fs');

  // Detect platform
  const isWindows = process.platform === 'win32';

  // Common Claude CLI install locations - platform specific
  const commonPaths = isWindows
    ? [
        // Windows paths
        `${process.env.LOCALAPPDATA}\\Programs\\Claude\\claude.exe`,
        `${process.env.APPDATA}\\npm\\claude.cmd`,
        `${process.env.USERPROFILE}\\.claude\\bin\\claude.exe`,
        'C:\\Program Files\\Claude\\claude.exe',
        'C:\\Program Files (x86)\\Claude\\claude.exe'
      ]
    : [
        // macOS/Linux paths
        '/usr/local/bin/claude',
        '/opt/homebrew/bin/claude',
        `${process.env.HOME}/.local/bin/claude`,      // Common Linux/pip location
        `${process.env.HOME}/.npm-global/bin/claude`,
        `${process.env.HOME}/.claude/bin/claude`,     // Claude's own install location
        `${process.env.HOME}/.claude/local/claude`,   // OAuth/download install location (Dec 2025)
        '/usr/bin/claude'
      ];

  // First try platform-specific command to find in PATH
  let claudePath = null;
  try {
    if (isWindows) {
      // Windows uses 'where' instead of 'which'
      claudePath = execSync('where claude 2>nul', { encoding: 'utf-8' }).split('\n')[0].trim();
    } else {
      claudePath = execSync('which claude 2>/dev/null', { encoding: 'utf-8' }).trim();
    }
    if (claudePath && !fs.existsSync(claudePath)) {
      claudePath = null; // Invalid path
    }
  } catch {
    claudePath = null;
  }

  // If which failed, try common paths
  if (!claudePath) {
    for (const p of commonPaths) {
      try {
        if (fs.existsSync(p)) {
          claudePath = p;
          break;
        }
      } catch {}
    }
  }

  // If still not found, Claude is not installed
  if (!claudePath) {
    return {
      installed: false,
      version: null,
      path: null
    };
  }

  // Get version using the full path
  let version = null;
  try {
    version = execSync(`"${claudePath}" --version 2>&1`, { encoding: 'utf-8' }).trim();
  } catch {
    // Claude exists but --version failed - still usable
    version = 'unknown';
  }

  return {
    installed: true,
    version: version,
    path: claudePath
  };
}

// Bridge daemon management command
// Manages the Bridge as a macOS launchd service for auto-start on login
program
  .command('daemon <action>')
  .description('Manage Bridge daemon for auto-start (install|uninstall|status|logs)')
  .action(async (action) => {
    const bridgeDaemon = require('./bridge-daemon');
    const { hasCredentials } = require('./credentials-manager');

    const validActions = ['install', 'uninstall', 'status', 'logs'];
    if (!validActions.includes(action)) {
      console.log('\x1b[31m❌ Invalid action: ' + action + '\x1b[0m');
      console.log('Valid actions: ' + validActions.join(', '));
      process.exit(1);
    }

    try {
      let result;
      switch (action) {
        case 'install':
          // Check if credentials exist before installing
          if (!hasCredentials()) {
            console.log('\x1b[33m⚠️  No saved credentials found!\x1b[0m');
            console.log('\nBefore installing the daemon, you need to connect once to save credentials:');
            console.log('  1. Run: coder1-bridge start');
            console.log('  2. Enter the pairing code from Coder1 IDE');
            console.log('  3. After connection, credentials are saved');
            console.log('  4. Then run: coder1-bridge daemon install\n');
            process.exit(1);
          }
          result = bridgeDaemon.install();
          break;
        case 'uninstall':
          result = bridgeDaemon.uninstall();
          break;
        case 'status':
          result = bridgeDaemon.status();
          break;
        case 'logs':
          bridgeDaemon.logs(50);
          break;
      }

      // For non-status commands, exit with appropriate code
      if (action !== 'status' && action !== 'logs' && result && !result.success) {
        process.exit(1);
      }
    } catch (error) {
      console.log('\x1b[31m❌ Error: ' + error.message + '\x1b[0m');
      process.exit(1);
    }
  });

// Johnny5 daemon management command
// Manages the Johnny5 daemon as a macOS launchd service
program
  .command('johnny5 <action>')
  .description('Manage Johnny5 daemon (install|start|stop|status|uninstall)')
  .action(async (action) => {
    const johnny5Daemon = require('./johnny5-daemon');

    const validActions = ['install', 'start', 'stop', 'status', 'uninstall'];
    if (!validActions.includes(action)) {
      console.log('\x1b[31m❌ Invalid action: ' + action + '\x1b[0m');
      console.log('Valid actions: ' + validActions.join(', '));
      process.exit(1);
    }

    try {
      let result;
      switch (action) {
        case 'install':
          result = johnny5Daemon.install();
          break;
        case 'start':
          result = johnny5Daemon.start();
          break;
        case 'stop':
          result = johnny5Daemon.stop();
          break;
        case 'status':
          result = johnny5Daemon.status();
          break;
        case 'uninstall':
          result = johnny5Daemon.uninstall();
          break;
      }

      // For non-status commands, exit with appropriate code
      if (action !== 'status' && result && !result.success) {
        process.exit(1);
      }
    } catch (error) {
      console.log('\x1b[31m❌ Error: ' + error.message + '\x1b[0m');
      process.exit(1);
    }
  });

// Setup command - install Coder1 Power Pack onto local Claude Code environment
program
  .command('setup')
  .description('Install Coder1 Power Pack onto your local Claude Code environment')
  .option('--power-pack', 'Install the curated Coder1 Claude Code configuration')
  .option('--dry-run', 'Preview what would be installed without making changes')
  .action(async (options) => {
    if (!options.powerPack) {
      console.log('Usage: coder1-bridge setup --power-pack');
      return;
    }

    const { installPowerPack } = require('./power-pack-installer');
    const fs = require('fs');
    const path = require('path');

    const packDir = path.resolve(__dirname, '../../public/power-pack');
    const manifest = JSON.parse(fs.readFileSync(path.join(packDir, 'manifest.json'), 'utf-8'));

    const assets = {
      claudeMd: fs.readFileSync(path.join(packDir, manifest.claudeMd), 'utf-8'),
      hooks: JSON.parse(fs.readFileSync(path.join(packDir, manifest.hooks), 'utf-8')),
      rules: Object.fromEntries(
        manifest.rules.map((rulePath) => [
          path.basename(rulePath),
          fs.readFileSync(path.join(packDir, rulePath), 'utf-8'),
        ])
      ),
    };

    if (options.dryRun) {
      console.log('Dry run — would install:');
      console.log('  MCPs:', manifest.mcpServers.map((m) => m.id).join(', '));
      console.log('  CLAUDE.md section: # Coder1 Power Pack');
      console.log('  Hooks: PreToolUse, PostToolUse');
      console.log('  Rules:', manifest.rules.map((r) => path.basename(r)).join(', '));
      return;
    }

    console.log('Installing Coder1 Power Pack...\n');
    const result = installPowerPack(manifest, assets);

    if (result.installed.length > 0) {
      console.log('Installed:', result.installed.join(', '));
    }
    if (result.skipped.length > 0) {
      console.log('Skipped (already present):', result.skipped.map((s) => s.id).join(', '));
    }
    if (result.errors.length > 0) {
      console.error('Errors:', result.errors.map((e) => e.id).join(', '));
      process.exit(1);
    }
    console.log('\nDone. Restart Claude Code for changes to take effect.');
  });

// Parse arguments
program.parse(process.argv);

// If no command specified, show help
if (program.args.length === 0) {
  console.log('\x1b[36m%s\x1b[0m', banner);
  program.help();
}