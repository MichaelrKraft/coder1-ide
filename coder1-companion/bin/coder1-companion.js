#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const boxen = require('boxen');
const inquirer = require('inquirer');
const updateNotifier = require('update-notifier');
const { Coder1Companion } = require('../src/index');
const pkg = require('../package.json');

// Check for updates
const notifier = updateNotifier({ pkg });
notifier.notify();

const program = new Command();

program
  .name('coder1-companion')
  .description('Coder1 IDE Companion Service - Bridge between web IDE and local Claude Code')
  .version(pkg.version);

// Start command
program
  .command('start')
  .description('Start the companion service')
  .option('-p, --port <port>', 'Port to bind to (auto-detected if not specified)')
  .option('-d, --daemon', 'Run as daemon (background process)')
  .option('--debug', 'Enable debug logging')
  .action(async (options) => {
    try {
      if (options.debug) {
        process.env.LOG_LEVEL = 'debug';
      }

      console.log(boxen(
        chalk.cyan.bold('🚀 Coder1 Companion Service') + '\n\n' +
        chalk.white('Starting bridge between web IDE and local Claude Code...') + '\n' +
        chalk.gray(`Version: ${pkg.version}`),
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'cyan'
        }
      ));

      const spinner = ora('Initializing services...').start();

      const companion = new Coder1Companion();
      const result = await companion.start();

      spinner.succeed('Companion service started successfully!');

      console.log('\n' + boxen(
        chalk.green('✅ Service Running') + '\n\n' +
        chalk.white(`🌐 WebSocket: ws://localhost:${result.port}`) + '\n' +
        chalk.white(`📡 HTTP API: http://localhost:${result.port}`) + '\n' +
        chalk.white(`🔒 Security: Enabled`) + '\n\n' +
        chalk.yellow('Web IDEs can now connect!') + '\n' +
        chalk.gray('Press Ctrl+C to stop'),
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'green'
        }
      ));

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n' + chalk.yellow('🛑 Shutting down gracefully...'));
        process.exit(0);
      });

    } catch (error) {
      console.error(chalk.red('\n❌ Failed to start companion service:'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Check companion service status')
  .action(async () => {
    const fs = require('fs');
    const path = require('path');
    const axios = require('axios');

    try {
      const connectionFile = path.join(require('os').homedir(), '.coder1-companion');
      
      if (!fs.existsSync(connectionFile)) {
        console.log(chalk.red('❌ Companion service not running'));
        return;
      }

      const connectionInfo = JSON.parse(fs.readFileSync(connectionFile, 'utf8'));
      
      // Test connection
      try {
        const response = await axios.get(`http://localhost:${connectionInfo.port}/health`, {
          timeout: 5000
        });

        console.log(boxen(
          chalk.green('✅ Companion Service Status') + '\n\n' +
          chalk.white(`Version: ${connectionInfo.version}`) + '\n' +
          chalk.white(`Port: ${connectionInfo.port}`) + '\n' +
          chalk.white(`Uptime: ${Math.round(response.data.uptime)}s`) + '\n' +
          chalk.white(`Connections: ${response.data.connections}`) + '\n' +
          chalk.white(`Active Projects: ${response.data.activeProjects}`) + '\n\n' +
          chalk.cyan('Services:') + '\n' +
          `  Claude Bridge: ${response.data.services.claudeBridge ? '✅' : '❌'}` + '\n' +
          `  File Sync: ${response.data.services.fileSync ? '✅' : '❌'}`,
          {
            padding: 1,
            borderStyle: 'round',
            borderColor: 'green'
          }
        ));

      } catch (error) {
        console.log(chalk.red('❌ Companion service not responding'));
        console.log(chalk.gray(`Connection file exists but service unreachable on port ${connectionInfo.port}`));
      }

    } catch (error) {
      console.log(chalk.red('❌ Error checking status:'), error.message);
    }
  });

// Stop command
program
  .command('stop')
  .description('Stop the companion service')
  .action(async () => {
    const fs = require('fs');
    const path = require('path');

    try {
      const connectionFile = path.join(require('os').homedir(), '.coder1-companion');
      
      if (!fs.existsSync(connectionFile)) {
        console.log(chalk.yellow('⚠️  Companion service not running'));
        return;
      }

      const connectionInfo = JSON.parse(fs.readFileSync(connectionFile, 'utf8'));
      
      // Send SIGTERM to process
      try {
        process.kill(connectionInfo.pid, 'SIGTERM');
        console.log(chalk.green('✅ Companion service stopped'));
      } catch (error) {
        console.log(chalk.red('❌ Failed to stop service:'), error.message);
        
        // Clean up connection file anyway
        try {
          fs.unlinkSync(connectionFile);
          console.log(chalk.gray('Connection file cleaned up'));
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }

    } catch (error) {
      console.log(chalk.red('❌ Error stopping service:'), error.message);
    }
  });

// Install command
program
  .command('install')
  .description('Install companion service globally and setup')
  .action(async () => {
    const spinner = ora('Installing Coder1 Companion Service...').start();

    try {
      // Check if already installed globally
      const { execSync } = require('child_process');
      
      try {
        execSync('npm list -g @coder1/companion', { stdio: 'ignore' });
        spinner.info('Companion service already installed globally');
      } catch (error) {
        // Not installed, install it
        execSync('npm install -g .', { stdio: 'inherit', cwd: __dirname + '/..' });
        spinner.succeed('Companion service installed globally');
      }

      // Run setup wizard
      spinner.stop();
      
      console.log('\n' + chalk.cyan.bold('🔧 Setup Wizard'));
      
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'autoStart',
          message: 'Start companion service automatically?',
          default: true
        },
        {
          type: 'input',
          name: 'customPort',
          message: 'Custom port (leave empty for auto-detection):',
          validate: (input) => {
            if (!input) return true;
            const port = parseInt(input);
            return (port >= 1000 && port <= 65535) || 'Port must be between 1000 and 65535';
          }
        }
      ]);

      if (answers.autoStart) {
        const startSpinner = ora('Starting companion service...').start();
        
        const companion = new Coder1Companion();
        await companion.start();
        
        startSpinner.succeed('Companion service started!');
      }

      console.log('\n' + boxen(
        chalk.green('🎉 Installation Complete!') + '\n\n' +
        chalk.white('Commands available:') + '\n' +
        chalk.cyan('  coder1-companion start') + chalk.gray('  - Start service') + '\n' +
        chalk.cyan('  coder1-companion status') + chalk.gray(' - Check status') + '\n' +
        chalk.cyan('  coder1-companion stop') + chalk.gray('   - Stop service') + '\n\n' +
        chalk.yellow('Your web IDE can now connect to Claude Code!'),
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'green'
        }
      ));

    } catch (error) {
      spinner.fail('Installation failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Doctor command
program
  .command('doctor')
  .description('Diagnose installation and connectivity issues')
  .action(async () => {
    console.log(chalk.cyan.bold('🏥 Coder1 Companion Doctor\n'));

    const { PreflightChecker } = require('../src/utils/PreflightChecker');
    const { Logger } = require('../src/utils/Logger');
    
    const logger = new Logger('Doctor');
    const checker = new PreflightChecker(logger);

    const checks = [
      { name: 'Node.js Version', check: () => checker.checkNodeVersion() },
      { name: 'Claude Code Installation', check: () => checker.checkClaudeCode() },
      { name: 'File Permissions', check: () => checker.checkFilePermissions() },
      { name: 'Port Availability', check: () => checker.checkPorts([57132, 57133, 57134]) },
      { name: 'Git Installation', check: () => checker.checkGit() }
    ];

    let passCount = 0;
    let warnCount = 0;
    let failCount = 0;

    for (const { name, check } of checks) {
      const spinner = ora(`Checking ${name}...`).start();
      
      try {
        const result = await check();
        
        if (result.success) {
          spinner.succeed(`${name}: ${chalk.green(result.message || 'OK')}`);
          passCount++;
        } else {
          if (result.critical) {
            spinner.fail(`${name}: ${chalk.red(result.message)}`);
            failCount++;
          } else {
            spinner.warn(`${name}: ${chalk.yellow(result.message)}`);
            warnCount++;
          }
        }
      } catch (error) {
        spinner.fail(`${name}: ${chalk.red(error.message)}`);
        failCount++;
      }
    }

    console.log('\n' + boxen(
      chalk.bold('📊 Health Check Results') + '\n\n' +
      `${chalk.green('✅ Passed:')} ${passCount}` + '\n' +
      `${chalk.yellow('⚠️  Warnings:')} ${warnCount}` + '\n' +
      `${chalk.red('❌ Failed:')} ${failCount}` + '\n\n' +
      (failCount === 0 
        ? chalk.green('🎉 System ready for Claude Code integration!')
        : chalk.red('⚠️  Issues found - please resolve critical failures')),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: failCount === 0 ? 'green' : 'red'
      }
    ));
  });

// Default action
program.action(() => {
  program.help();
});

program.parse(process.argv);

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}