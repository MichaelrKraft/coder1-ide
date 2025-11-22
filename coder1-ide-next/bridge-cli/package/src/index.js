#!/usr/bin/env node

/**
 * Coder1 Bridge CLI
 * Connects local Claude CLI to remote Coder1 IDE
 */

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
  .option('-s, --server <url>', 'Server URL', 'https://coder1-ide.onrender.com')
  .option('-d, --dev', 'Development mode (connect to localhost)')
  .option('-v, --verbose', 'Verbose logging')
  .option('--no-banner', 'Skip banner display')
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
      console.log('\x1b[33mPlease install Claude Code from: https://claude.ai/download\x1b[0m');
      process.exit(1);
    }
    console.log(`\x1b[32m✅ Claude CLI detected: ${claudeCheck.version || 'Unknown version'}\x1b[0m`);

    // Get pairing code using readline
    const pairingCode = await askForPairingCode();

    // Start bridge client with simple status
    console.log('🔄 Connecting to Coder1 IDE...');
    
    try {
      const bridge = new BridgeClient({
        serverUrl: options.server,
        verbose: options.verbose,
        local: options.dev  // Pass the dev flag to indicate local connection
      });

      await bridge.connect(pairingCode);
      
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
  .option('-s, --server <url>', 'Server URL', 'https://coder1-ide.onrender.com')
  .action(async (options) => {
    console.log('\x1b[34m🔍 Checking bridge status...\x1b[0m');
    
    try {
      const response = await fetch(`${options.server}/api/bridge/generate-code?userId=test`);
      const data = await response.json();
      
      if (data.connected) {
        console.log('\x1b[32m✅ Bridge service is online\x1b[0m');
        console.log('\x1b[37mConnected bridges:\x1b[0m', data.bridges.length);
      } else {
        console.log('\x1b[33m⚠️ No active bridges\x1b[0m');
      }
    } catch (error) {
      console.log('\x1b[31m❌ Cannot reach bridge service\x1b[0m');
      if (options.verbose) {
        console.error(error);
      }
    }
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
      console.log('1. Visit: https://claude.ai/download');
      console.log('2. Download and install for your platform');
      console.log('3. Restart your terminal');
      console.log('4. Run this test again');
    }
  });

// Helper function to check Claude CLI
async function checkClaudeCLI() {
  const { execSync } = require('child_process');
  
  try {
    // Try to run claude --version
    const version = execSync('claude --version 2>&1', { encoding: 'utf-8' }).trim();
    
    // Try to find claude path
    let path;
    try {
      path = execSync('which claude 2>&1', { encoding: 'utf-8' }).trim();
    } catch {
      path = null;
    }
    
    return {
      installed: true,
      version: version,
      path: path
    };
  } catch (error) {
    return {
      installed: false,
      version: null,
      path: null
    };
  }
}

// Parse arguments
program.parse(process.argv);

// If no command specified, show help
if (program.args.length === 0) {
  console.log('\x1b[36m%s\x1b[0m', banner);
  program.help();
}