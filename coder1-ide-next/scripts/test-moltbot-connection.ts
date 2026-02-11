#!/usr/bin/env npx tsx
/**
 * Moltbot Bridge Connection Test Script
 *
 * Tests the WebSocket connection to ManusLive gateway.
 * Run with: npx tsx scripts/test-moltbot-connection.ts
 *
 * Environment variables required:
 * - MOLTBOT_GATEWAY_URL: WebSocket URL (e.g., ws://192.168.1.100:55413)
 * - MOLTBOT_AUTH_TOKEN: Authentication token from ManusLive
 */

import { getMoltbotBridge, MoltbotBridgeService } from '../services/johnny5/moltbot-bridge';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runTests() {
  log('\n========================================', 'cyan');
  log('   Moltbot Bridge Connection Test', 'cyan');
  log('========================================\n', 'cyan');

  // Check environment variables
  const gatewayUrl = process.env.MOLTBOT_GATEWAY_URL || 'ws://localhost:55413';
  const authToken = process.env.MOLTBOT_AUTH_TOKEN || '';

  log('Environment Configuration:', 'blue');
  log(`  MOLTBOT_GATEWAY_URL: ${gatewayUrl}`);
  log(`  MOLTBOT_AUTH_TOKEN: ${authToken ? `${authToken.substring(0, 8)}...` : '(not set)'}`);
  log('');

  if (!authToken) {
    log('WARNING: MOLTBOT_AUTH_TOKEN is not set!', 'yellow');
    log('  Authentication may fail without a valid token.', 'yellow');
    log('  Get your token from ManusLive: Settings > Gateway > Auth Token', 'yellow');
    log('');
  }

  // Get bridge instance
  log('Creating MoltbotBridge instance...', 'blue');
  const bridge = getMoltbotBridge();
  const config = bridge.getConfig();
  log(`  Gateway URL from config: ${config.gatewayUrl}`);
  log(`  Connection timeout: ${config.connectionTimeout}ms`);
  log(`  Max retries: ${config.maxRetries}`);
  log('');

  // Test 1: Connection
  log('Test 1: WebSocket Connection', 'blue');
  log(`  Connecting to ${gatewayUrl}...`);

  try {
    await bridge.connect(gatewayUrl);
    const status = bridge.getStatus();

    if (status.connected) {
      log('  [PASS] WebSocket connection established', 'green');
    } else {
      log('  [FAIL] WebSocket failed to connect', 'red');
      return;
    }
  } catch (error) {
    log(`  [FAIL] Connection error: ${error instanceof Error ? error.message : error}`, 'red');
    log('');
    log('Troubleshooting:', 'yellow');
    log('  1. Is ManusLive running?', 'yellow');
    log('  2. Is the gateway URL correct?', 'yellow');
    log('  3. Are both machines on the same network?', 'yellow');
    log('  4. Is the port open and not blocked by firewall?', 'yellow');
    return;
  }

  // Test 2: Authentication
  log('');
  log('Test 2: Authentication', 'blue');
  log('  Waiting for authentication handshake...');

  // Wait for authentication (connect.challenge + connect response)
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Authentication timeout after 10 seconds'));
    }, 10000);

    // Check if already authenticated
    if (bridge.isConnected()) {
      clearTimeout(timeout);
      resolve();
      return;
    }

    // Listen for authenticated event
    bridge.once('authenticated', () => {
      clearTimeout(timeout);
      resolve();
    });

    bridge.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  }).then(() => {
    log('  [PASS] Authentication successful', 'green');
  }).catch((err) => {
    log(`  [FAIL] Authentication failed: ${err.message}`, 'red');
    if (!authToken) {
      log('  Hint: Set MOLTBOT_AUTH_TOKEN in your .env.local file', 'yellow');
    }
  });

  // Test 3: Send a test message
  if (bridge.isConnected()) {
    log('');
    log('Test 3: Send Test Message', 'blue');
    log('  Sending: "Hello from Coder1 IDE test!"');

    try {
      const response = await bridge.sendMessage('webchat-test', 'Hello from Coder1 IDE test! Please respond with a short greeting.');
      log('  [PASS] Message sent and response received', 'green');
      log(`  Response: ${response.text.substring(0, 200)}${response.text.length > 200 ? '...' : ''}`);
      log(`  Session ID: ${response.sessionId}`);
      log(`  Message ID: ${response.messageId}`);
      if (response.tokenUsage) {
        log(`  Tokens: ${response.tokenUsage.input} input, ${response.tokenUsage.output} output`);
      }
    } catch (err) {
      log(`  [FAIL] Send message failed: ${err instanceof Error ? err.message : err}`, 'red');
    }
  }

  // Test 4: List sessions
  if (bridge.isConnected()) {
    log('');
    log('Test 4: List Sessions', 'blue');
    log('  Querying available sessions...');

    try {
      const sessions = await bridge.listSessions();
      log(`  [PASS] Retrieved ${Object.keys(sessions || {}).length} sessions`, 'green');
    } catch (err) {
      log(`  [INFO] sessions.list not available or returned error`, 'yellow');
      log(`  Error: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Cleanup
  log('');
  log('Cleanup', 'blue');
  log('  Disconnecting...');
  bridge.disconnect();
  log('  [DONE] Disconnected', 'green');

  // Summary
  log('');
  log('========================================', 'cyan');
  log('   Test Complete', 'cyan');
  log('========================================', 'cyan');
  log('');
  log('If all tests passed, your Moltbot connection is working!', 'green');
  log('');
  log('Next steps:', 'blue');
  log('  1. Set MOLTBOT_ENABLED=true in .env.local');
  log('  2. Restart the Coder1 IDE server');
  log('  3. Open the Johnny5 dashboard to chat with your AI');
  log('');
}

// Run tests
runTests().catch((err) => {
  log(`\nUnexpected error: ${err}`, 'red');
  process.exit(1);
});
