/**
 * Bridge Daemon Lifecycle Manager
 *
 * Manages the Coder1 Bridge as a macOS launchd service.
 * Auto-starts on login, auto-connects using saved credentials.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PLIST_LABEL = 'com.coder1.bridge';
const PLIST_FILENAME = `${PLIST_LABEL}.plist`;
const LAUNCH_AGENTS_DIR = path.join(os.homedir(), 'Library', 'LaunchAgents');
const PLIST_PATH = path.join(LAUNCH_AGENTS_DIR, PLIST_FILENAME);
const CODER1_DIR = path.join(os.homedir(), '.coder1');
const LOGS_DIR = path.join(CODER1_DIR, 'logs');
const LOG_FILE = path.join(LOGS_DIR, 'bridge-daemon.log');
const ERROR_LOG_FILE = path.join(LOGS_DIR, 'bridge-daemon.error.log');

/**
 * Find the coder1-bridge executable path
 * @returns {string} Path to the bridge executable
 */
function getBridgePath() {
  // Try to find globally installed coder1-bridge
  try {
    return execSync('which coder1-bridge', { encoding: 'utf-8' }).trim();
  } catch {
    // Fallback: look for npm global install
    try {
      const npmGlobal = execSync('npm root -g', { encoding: 'utf-8' }).trim();
      const bridgePath = path.join(npmGlobal, 'coder1-bridge', 'src', 'index.js');
      if (fs.existsSync(bridgePath)) {
        return bridgePath;
      }
    } catch {}

    // Fallback: use local development path
    const localPath = path.join(__dirname, 'index.js');
    if (fs.existsSync(localPath)) {
      return localPath;
    }

    throw new Error('Could not find coder1-bridge executable');
  }
}

/**
 * Get the node executable path
 * @returns {string} Path to node
 */
function getNodePath() {
  try {
    return execSync('which node', { encoding: 'utf-8' }).trim();
  } catch {
    // Common fallback paths
    const fallbacks = ['/usr/local/bin/node', '/opt/homebrew/bin/node'];
    for (const p of fallbacks) {
      if (fs.existsSync(p)) return p;
    }
    throw new Error('Could not find node executable');
  }
}

/**
 * Generate the launchd plist content
 * @returns {string} Plist XML content
 */
function generatePlist() {
  const bridgePath = getBridgePath();
  const nodePath = getNodePath();

  // If bridge path is a JS file, we need to run it with node
  const isJsFile = bridgePath.endsWith('.js');

  const programArgs = isJsFile
    ? `<array>
        <string>${nodePath}</string>
        <string>${bridgePath}</string>
        <string>start</string>
        <string>--auto</string>
    </array>`
    : `<array>
        <string>${bridgePath}</string>
        <string>start</string>
        <string>--auto</string>
    </array>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_LABEL}</string>
    <key>ProgramArguments</key>
    ${programArgs}
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>StandardOutPath</key>
    <string>${LOG_FILE}</string>
    <key>StandardErrorPath</key>
    <string>${ERROR_LOG_FILE}</string>
    <key>ThrottleInterval</key>
    <integer>10</integer>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>`;
}

/**
 * Install the Bridge daemon
 * @returns {Object} Result with success status and message
 */
function install() {
  console.log('🔧 Installing Bridge daemon...\n');

  // Check platform
  if (process.platform !== 'darwin') {
    console.log('⚠️  Daemon auto-start is currently only supported on macOS.');
    console.log('   On other platforms, run: coder1-bridge start --auto');
    return { success: false, message: 'Unsupported platform' };
  }

  try {
    // Ensure directories exist
    if (!fs.existsSync(LAUNCH_AGENTS_DIR)) {
      fs.mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    // Unload existing daemon if present
    try {
      execSync(`launchctl unload "${PLIST_PATH}" 2>/dev/null`, { stdio: 'ignore' });
    } catch {}

    // Write plist
    const plistContent = generatePlist();
    fs.writeFileSync(PLIST_PATH, plistContent);
    console.log(`   ✓ Created: ${PLIST_PATH}`);

    // Load into launchd
    try {
      execSync(`launchctl load "${PLIST_PATH}"`, { stdio: 'pipe' });
      console.log('   ✓ Loaded into launchd\n');
      console.log('✅ Bridge daemon installed and started!');
      console.log('   Will auto-start on login and auto-connect using saved credentials.\n');
      console.log('   View logs: tail -f ' + LOG_FILE);
      return { success: true };
    } catch (e) {
      console.log('⚠️  Daemon created but failed to load automatically.');
      console.log('   Try running: launchctl load "' + PLIST_PATH + '"');
      return { success: false, message: e.message };
    }
  } catch (e) {
    console.log('❌ Failed to install daemon:', e.message);
    return { success: false, message: e.message };
  }
}

/**
 * Uninstall the Bridge daemon
 * @returns {Object} Result with success status
 */
function uninstall() {
  console.log('🗑️  Uninstalling Bridge daemon...\n');

  // Unload from launchd
  try {
    execSync(`launchctl unload "${PLIST_PATH}" 2>/dev/null`, { stdio: 'ignore' });
    console.log('   ✓ Unloaded from launchd');
  } catch {}

  // Remove plist file
  if (fs.existsSync(PLIST_PATH)) {
    fs.unlinkSync(PLIST_PATH);
    console.log(`   ✓ Removed: ${PLIST_PATH}`);
  }

  console.log('\n✅ Bridge daemon uninstalled.');
  console.log('   Bridge will no longer auto-start on login.');
  return { success: true };
}

/**
 * Get Bridge daemon status
 * @returns {Object} Status info (installed, running)
 */
function status() {
  const installed = fs.existsSync(PLIST_PATH);
  let running = false;
  let pid = null;

  try {
    const result = execSync(`launchctl list | grep ${PLIST_LABEL}`, { encoding: 'utf-8' });
    running = result.length > 0;
    // Parse PID from launchctl list output (format: PID status label)
    const parts = result.trim().split(/\s+/);
    if (parts[0] !== '-') {
      pid = parts[0];
    }
  } catch {}

  // Check for saved credentials
  const { hasCredentials } = require('./credentials-manager');
  const hasCreds = hasCredentials();

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║           Bridge Daemon Status                   ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  console.log(`  Daemon Installed:    ${installed ? '✅ Yes' : '○ No'}`);
  console.log(`  Daemon Running:      ${running ? '✅ Yes' + (pid ? ` (PID: ${pid})` : '') : '○ No'}`);
  console.log(`  Saved Credentials:   ${hasCreds ? '✅ Yes' : '○ No'}`);

  if (installed) {
    console.log(`\n  Plist:    ${PLIST_PATH}`);
    console.log(`  Log:      ${LOG_FILE}`);
    console.log(`  Errors:   ${ERROR_LOG_FILE}`);
  }

  if (!hasCreds) {
    console.log('\n  ⚠️  No saved credentials. Run "coder1-bridge start" first,');
    console.log('     enter a pairing code, and credentials will be saved.');
  }

  console.log('\n' + '─'.repeat(52) + '\n');

  return { installed, running, hasCredentials: hasCreds, pid };
}

/**
 * View recent daemon logs
 * @param {number} lines - Number of lines to show
 */
function logs(lines = 50) {
  console.log(`\n📋 Recent Bridge Daemon Logs (last ${lines} lines):\n`);
  console.log('─'.repeat(52));

  if (fs.existsSync(LOG_FILE)) {
    try {
      const content = execSync(`tail -n ${lines} "${LOG_FILE}"`, { encoding: 'utf-8' });
      console.log(content || '(empty)');
    } catch {
      console.log('(Could not read log file)');
    }
  } else {
    console.log('(No log file found - daemon may not have run yet)');
  }

  console.log('─'.repeat(52) + '\n');
}

module.exports = {
  install,
  uninstall,
  status,
  logs,
  PLIST_PATH,
  LOG_FILE,
  ERROR_LOG_FILE
};
