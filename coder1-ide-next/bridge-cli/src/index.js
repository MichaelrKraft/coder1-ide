#!/usr/bin/env node

/**
 * Coder1 Bridge CLI
 * Connects local Claude CLI to remote Coder1 IDE
 */

const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const BridgeClient = require('./bridge-client');
const packageJson = require('../package.json');

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
      console.log(chalk.cyan(banner));
    }

    // Development mode overrides
    if (options.dev) {
      options.server = 'http://localhost:3001';
      console.log(chalk.yellow('🔧 Development mode enabled'));
    }

    console.log(chalk.blue(`📡 Connecting to: ${options.server}`));
    
    // Check if Claude CLI is installed
    const claudeCheck = await checkClaudeCLI();
    if (!claudeCheck.installed) {
      console.log(chalk.red('❌ Claude CLI not found!'));
      console.log(chalk.yellow('Please install Claude Code from: https://claude.ai/download'));
      process.exit(1);
    }
    console.log(chalk.green(`✅ Claude CLI detected: ${claudeCheck.version || 'Unknown version'}`));

    // Get pairing code
    const { pairingCode } = await inquirer.prompt([
      {
        type: 'input',
        name: 'pairingCode',
        message: 'Enter the 6-digit pairing code from the IDE:',
        validate: (input) => {
          if (!/^\d{6}$/.test(input)) {
            return 'Please enter a valid 6-digit code';
          }
          return true;
        }
      }
    ]);

    // Start bridge client
    const spinner = ora('Connecting to Coder1 IDE...').start();
    
    try {
      const bridge = new BridgeClient({
        serverUrl: options.server,
        verbose: options.verbose
      });

      await bridge.connect(pairingCode);
      
      spinner.succeed(chalk.green('✅ Bridge connected successfully!'));
      
      // Display connection info
      console.log('\n' + chalk.bgGreen.black(' CONNECTION ESTABLISHED '));
      console.log(chalk.gray('─'.repeat(40)));
      console.log(chalk.white('Bridge ID:'), chalk.cyan(bridge.bridgeId));
      console.log(chalk.white('User ID:'), chalk.cyan(bridge.userId));
      console.log(chalk.white('Status:'), chalk.green('● Active'));
      console.log(chalk.gray('─'.repeat(40)));
      console.log(chalk.yellow('\n📝 You can now use Claude commands in the IDE terminal!'));
      console.log(chalk.gray('Press Ctrl+C to disconnect\n'));

      // Keep process alive and handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n\n⏹️  Shutting down bridge...'));
        await bridge.disconnect();
        console.log(chalk.gray('Bridge disconnected. Goodbye!'));
        process.exit(0);
      });

    } catch (error) {
      spinner.fail(chalk.red('Failed to connect'));
      console.error(chalk.red('Error:'), error.message);
      
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
    console.log(chalk.blue('🔍 Checking bridge status...'));
    
    try {
      const response = await fetch(`${options.server}/api/bridge/generate-code?userId=test`);
      const data = await response.json();
      
      if (data.connected) {
        console.log(chalk.green('✅ Bridge service is online'));
        console.log(chalk.white('Connected bridges:'), data.bridges.length);
      } else {
        console.log(chalk.yellow('⚠️ No active bridges'));
      }
    } catch (error) {
      console.log(chalk.red('❌ Cannot reach bridge service'));
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
    console.log(chalk.blue('🧪 Testing Claude CLI...'));
    
    const check = await checkClaudeCLI();
    
    if (check.installed) {
      console.log(chalk.green('✅ Claude CLI is installed'));
      console.log(chalk.white('Version:'), check.version || 'Unknown');
      console.log(chalk.white('Path:'), check.path || 'In PATH');
      
      // Try a test command
      const { spawn } = require('child_process');
      const claude = spawn('claude', ['--version']);
      
      claude.stdout.on('data', (data) => {
        console.log(chalk.gray('Output:'), data.toString().trim());
      });
      
      claude.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green('✅ Claude CLI is working correctly'));
        } else {
          console.log(chalk.yellow('⚠️ Claude CLI returned non-zero exit code'));
        }
      });
    } else {
      console.log(chalk.red('❌ Claude CLI not found'));
      console.log(chalk.yellow('\nTo install Claude Code:'));
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
  console.log(chalk.cyan(banner));
  program.help();
}