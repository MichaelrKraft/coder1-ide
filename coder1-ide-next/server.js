/**
 * Next.js Custom Server with Integrated Terminal Support
 * 
 * This unified server replaces the dual-server architecture:
 * - Handles Next.js pages and API routes
 * - Provides WebSocket support via Socket.IO
 * - Manages terminal PTY sessions
 * - Integrates tmux orchestration
 */

// Load environment variables from .env.local (development only)
// In production (Render), environment variables are provided directly by the platform
const path = require('path');
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config({ path: path.join(__dirname, '.env.local') });
  } catch (err) {
    console.log('dotenv not available - using system environment variables');
  }
}

// Environment validation diagnostic logging
console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 [ENV-DIAGNOSTIC] Environment Validation at Startup');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   CLAUDE_CODE_OAUTH_TOKEN exists:', !!process.env.CLAUDE_CODE_OAUTH_TOKEN);
console.log('   ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
console.log('   .env.local path:', path.join(__dirname, '.env.local'));
console.log('═══════════════════════════════════════════════════════════');

// Git commit hash for deployment verification
const { execSync, spawn } = require('child_process');
const getGitCommit = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    // Fallback to platform-specific env vars (Render removes .git folder after build)
    return process.env.RENDER_GIT_COMMIT?.slice(0, 7) ||
           process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
           'unknown';
  }
};
const GIT_COMMIT = getGitCommit();

// 🔧 CRITICAL FIX (Nov 26, 2025): Enable TypeScript runtime loader
// Required for loading .ts files like bridge-manager.ts
// Without this, Node.js cannot import TypeScript files and bridge namespace fails to initialize
try {
  require('tsx/cjs');
  console.log('✅ TypeScript runtime (tsx) loaded successfully');
} catch (error) {
  console.error('❌ Failed to load TypeScript runtime:', error.message);
  console.error('   Bridge functionality may be limited without TypeScript support');
}

// 📦 AUTOMATED MIGRATIONS (Feb 1, 2026)
// Ensure database schema is up-to-date before starting server
// This handles the new SQLite-based bridge pairing codes table
try {
  // Use tsx to load the TypeScript migration runner directly
  const { runMigrations } = require('./db/migrations/run-migrations.ts');
  console.log('🔄 Running database migrations...');
  runMigrations();
} catch (error) {
  console.error('⚠️  Migration check failed:', error.message);
  console.error('   Continuing startup, but database features may be unstable');
}

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const pty = require('node-pty');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const fs = require('fs');
const express = require('express');

// Environment detection
const isDevelopment = process.env.NODE_ENV !== 'production';

// ================================================================================
// Distributed Tracing Utilities (Server-side)
// ================================================================================

/**
 * Extract trace context from Socket.IO payload
 * Trace context is passed in the _trace property by the client
 * @param {Object} payload - The Socket.IO event payload
 * @returns {{ traceId: string, spanId?: string, parentSpanId?: string } | undefined}
 */
function extractTraceFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return undefined;
  const trace = payload._trace;
  if (!trace || !trace.traceId) return undefined;
  return {
    traceId: trace.traceId,
    spanId: trace.spanId,
    parentSpanId: trace.parentSpanId
  };
}

/**
 * Generate a trace ID for server-initiated operations
 * Format: trace_{timestamp}_{random}
 */
function generateServerTraceId() {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log with trace context prefix for distributed tracing
 * @param {string} traceId - The trace ID
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {Object} [data] - Additional data to log
 */
function logWithTrace(traceId, level, message, data) {
  const prefix = traceId ? `[${traceId}]` : '[no-trace]';
  const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (data !== undefined) {
    logFn(`${prefix} ${message}`, data);
  } else {
    logFn(`${prefix} ${message}`);
  }
}

// Memory Optimizer with environment-aware limits - Updated for 2GB Standard plan
const { getMemoryOptimizer } = require('./services/memory-optimizer');
const memoryOptimizer = getMemoryOptimizer({
  maxHeapMB: isDevelopment ? 2048 : (parseInt(process.env.NODE_OPTIONS?.match(/--max-old-space-size=(\d+)/)?.[1]) || 1500),
  warningThresholdMB: isDevelopment ? 1500 : 1200,  // 80% of 1500MB
  panicThresholdMB: isDevelopment ? 1800 : (parseInt(process.env.MEMORY_PANIC_THRESHOLD_MB) || 1800),
  checkIntervalMs: isDevelopment ? 60000 : 30000  // Check less frequently in dev
});

// Enhanced tmux service
let EnhancedTmuxService;
try {
  EnhancedTmuxService = require('./services/enhanced-tmux-service.ts').EnhancedTmuxService;
} catch (error) {
  console.warn('⚠️ Enhanced tmux service not available:', error.message);
  EnhancedTmuxService = null;
}

// WebSocket Event Bridge for Claude Code Bridge Service (JavaScript version)
let WebSocketEventBridge;
try {
  const bridgeModule = require('./services/websocket-event-bridge.ts');
  WebSocketEventBridge = bridgeModule.getWebSocketEventBridge();
} catch (error) {
  console.warn('⚠️ WebSocket Event Bridge not available:', error.message);
  WebSocketEventBridge = null;
}

// Eternal Memory Context Loader for automatic session context injection
let eternalMemoryLoader = null;
if (process.env.ENABLE_ETERNAL_MEMORY === 'true') {
  try {
    // Dynamic import since this is TypeScript
    const eternalMemoryModule = require('./services/eternal-memory-context-loader.ts');
    eternalMemoryLoader = eternalMemoryModule.eternalMemoryContextLoader;
    console.log('✨ Eternal Memory enabled - previous sessions will be auto-loaded');
  } catch (error) {
    console.warn('⚠️ Eternal Memory not available:', error.message);
  }
}

// Memory Exporter for Claude Skills integration
let memoryExporter = null;
try {
  const memoryExporterModule = require('./services/memory-exporter.ts');
  memoryExporter = memoryExporterModule.memoryExporter;
  console.log('💾 Memory Exporter loaded - will export to Claude Skills directory');
} catch (error) {
  console.warn('⚠️ Memory Exporter not available:', error.message);
}

// Agent Terminal Manager for Phase 2: Interactive Agent Terminals
// Uses global singleton registry to prevent multiple instances across module reloads
let agentTerminalManager;
try {
  const { getAgentTerminalManager } = require('./services/agent-terminal-manager.ts');
  agentTerminalManager = getAgentTerminalManager();
  console.log('✅ Agent Terminal Manager loaded successfully');
  console.log('🌍 Global registry ensures single instance across all modules');
} catch (error) {
  console.warn('⚠️ Agent Terminal Manager not available:', error.message);
  agentTerminalManager = null;
}

// Claude CLI Puppeteer Service for AI Team spawning
let claudePuppeteer;
try {
  const { getClaudePuppeteer } = require('./services/claude-code-bridge.ts');
  claudePuppeteer = getClaudePuppeteer();
  console.log('✅ Claude CLI Puppeteer service loaded');
} catch (error) {
  console.warn('⚠️ Claude CLI Puppeteer not available:', error.message);
  claudePuppeteer = null;
}

// Moltbot Bridge for Johnny5 autonomous agent integration
// Uses .ts file directly since tsx loader is enabled
let moltbotBridge;
try {
  const { getMoltbotBridge } = require('./services/johnny5/moltbot-bridge.ts');
  moltbotBridge = getMoltbotBridge();
  console.log('✅ Moltbot Bridge service loaded');

  if (process.env.MOLTBOT_ENABLED !== 'true') {
    console.log('ℹ️ Moltbot integration disabled (set MOLTBOT_ENABLED=true to enable)');
  }
  // NOTE: Actual connection happens later (line ~1844) AFTER Socket.IO event listeners are configured
} catch (error) {
  console.warn('⚠️ Moltbot Bridge not available:', error.message);
  moltbotBridge = null;
}

/**
 * Ensure ManusLive daemon is running before connecting Moltbot
 * Auto-starts the daemon if not already running
 */
async function ensureManusLiveRunning() {
  const MANUSLIVE_PORT = parseInt(process.env.MANUSLIVE_PORT || '55413');
  const MANUSLIVE_PATH = process.env.MANUSLIVE_PATH ||
    path.join(process.env.HOME, 'manuslive/manuslive');

  // 1. Check if already running
  try {
    execSync(`lsof -i :${MANUSLIVE_PORT} 2>/dev/null | grep LISTEN`, { encoding: 'utf-8' });
    console.log(`✅ ManusLive daemon already running on port ${MANUSLIVE_PORT}`);
    return { success: true, wasRunning: true };
  } catch {
    // Not running, continue to start it
  }

  // 2. Check if ManusLive is installed
  const cliPath = path.join(MANUSLIVE_PATH, 'dist/cli.js');
  if (!fs.existsSync(cliPath)) {
    console.warn(`⚠️ ManusLive not found at ${MANUSLIVE_PATH}`);
    console.warn('   Johnny5 will use Bridge or Gemini fallback');
    return { success: false, error: 'ManusLive not installed' };
  }

  // 3. Start ManusLive daemon
  console.log(`🚀 Starting ManusLive daemon from ${MANUSLIVE_PATH}...`);
  try {
    const daemon = spawn('node', ['dist/cli.js', 'start', '--skip-validation'], {
      cwd: MANUSLIVE_PATH,
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore'],
      env: { ...process.env, NODE_ENV: 'production' }
    });
    daemon.unref();

    // 4. Wait for it to be ready (with timeout)
    const maxWait = 60000; // 60 seconds (ManusLive can take 30-45s to initialize)
    const checkInterval = 500;
    let waited = 0;

    while (waited < maxWait) {
      await new Promise(r => setTimeout(r, checkInterval));
      waited += checkInterval;

      try {
        execSync(`lsof -i :${MANUSLIVE_PORT} 2>/dev/null | grep LISTEN`, { encoding: 'utf-8' });
        console.log(`✅ ManusLive daemon started successfully (${waited}ms)`);
        return { success: true, wasRunning: false, startTime: waited };
      } catch {
        // Still waiting
      }
    }

    console.warn(`⚠️ ManusLive daemon did not start within ${maxWait}ms`);
    return { success: false, error: 'Startup timeout' };

  } catch (err) {
    console.error('❌ Failed to start ManusLive:', err.message);
    return { success: false, error: err.message };
  }
}

// Socket.IO instance (initialized later after HTTP server creation)
let io;

// Conductor system removed - using simple multi-Claude tabs instead
// Multi-Claude tabs will be handled through the terminal UI directly

// Try to load AI Agent Orchestrator for team status broadcasting
let aiOrchestratorRef = null;
try {
  // Dynamic require - may fail if TypeScript module not compiled
  const orchModule = require('./services/ai-agent-orchestrator');
  aiOrchestratorRef = orchModule.aiOrchestrator || null;
} catch (e) {
  // Orchestrator not available in plain JS context - will be handled by Next.js API routes
}

// Broadcast team status updates periodically
setInterval(() => {
  if (!io) return;

  // Existing agent terminal manager broadcasts
  if (agentTerminalManager) {
    const stats = agentTerminalManager.getStats();

    if (stats.totalSessions > 0) {
      const agents = stats.sessions.map(session => ({
        agentId: session.agentId,
        role: session.role,
        status: session.bufferSize > 0 ? 'working' : 'idle',
        bufferSize: session.bufferSize
      }));

      // Broadcast to all connected clients
      io.emit('team:status:update', { agents });
    }
  }

  // AI Agent Orchestrator team broadcasts
  try {
    const teams = aiOrchestratorRef?.getAllTeams?.() || [];
    if (teams.length > 0) {
      const team = teams[0]; // Support one active team at a time
      io.emit('team:status:update', {
        type: 'orchestrator',
        team: {
          teamId: team.teamId,
          status: team.status,
          requirement: team.projectRequirement,
          overallProgress: Math.round(
            team.agents.reduce((s, a) => s + a.progress, 0) / Math.max(team.agents.length, 1)
          )
        },
        agents: team.agents.map(a => ({
          agentId: a.agentId || a.sessionId,
          agentName: a.agentName,
          status: a.status,
          progress: a.progress,
          currentTask: a.currentTask,
          filesCount: a.files ? a.files.length : 0,
          output: (a.output || []).slice(-5)
        }))
      });
    }
  } catch (e) { /* orchestrator not available */ }
}, 3000); // Update every 3 seconds

// Agent Coordinator for multi-agent workflows with terminal integration
// IMPORTANT: Will be initialized AFTER Socket.IO is created (need io instance)
let agentCoordinator = null;

// Skills Service for Progressive Disclosure Architecture (PDA)
let skillsService;
if (process.env.ENABLE_SKILLS_SYSTEM === 'true') {
  try {
    const { initializeSkillsService } = require('./lib/skills-service.ts');
    // Will be initialized async in server startup
    console.log('📚 Skills System enabled - will initialize on server start');
  } catch (error) {
    console.warn('⚠️ Skills System not available:', error.message);
    skillsService = null;
  }
}

// Terminal Token Integration for automatic Claude usage tracking
let terminalTokenIntegration;
try {
  const { terminalTokenIntegration: integration } = require('./services/terminal-token-integration.ts');
  terminalTokenIntegration = integration;
} catch (error) {
  console.warn('⚠️ Terminal Token Integration not available:', error.message);
  terminalTokenIntegration = null;
}

// Test PTY compatibility on startup
const testPtyCompatibility = () => {
  try {
    const testPty = pty.spawn('echo', ['test'], {});
    testPty.kill();
    console.log('✅ PTY COMPATIBILITY: Working on this environment');
    return true;
  } catch (error) {
    console.error('❌ PTY COMPATIBILITY: Failed -', error.message);
    console.error('  This means terminal sessions will NOT work!');
    console.error('  Potential fix: npm rebuild node-pty --update-binary');
    return false;
  }
};
const ptyCompatible = testPtyCompatibility();

// Environment validation
let envValidator;
try {
  envValidator = require('./lib/env-validator').envValidator;
  // Check environment variables on startup
  if (!envValidator.isValid()) {
    console.error('\n🚨 Environment Variable Validation Failed!\n');
    console.error(envValidator.getReport());
    process.exit(1);
  } else {
    console.log('\n✅ Environment variables validated successfully');
    if (envValidator.getWarnings().length > 0) {
      console.warn('\n⚠️  Environment warnings:');
      envValidator.getWarnings().forEach(warn => console.warn(`  - ${warn}`));
    }
  }
} catch (error) {
  console.warn('⚠️ Environment validator not available, skipping validation');
}

// Environment configuration
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0'; // Bind to all interfaces for Render
const port = parseInt(process.env.PORT || '3001', 10);

// Alpha deployment configuration
const isAlphaMode = process.env.ALPHA_MODE_ENABLED === 'true';
const alphaInviteCode = process.env.ALPHA_INVITE_CODE;
const maxAlphaUsers = parseInt(process.env.MAX_ALPHA_USERS || '10');
const deploymentMode = process.env.DEPLOYMENT_MODE || 'standard';

// Track active alpha sessions
const alphaActiveSessions = new Map();

// 🔧 FIX (Dec 15, 2025): Map terminal session IDs to their Socket.IO sockets
// This fixes bridge response routing - sessionId is NOT a socket ID
// Used by bridgeManager event handlers to find the correct socket
const terminalSessionSockets = new Map();

// Run database migrations before starting server
console.log('📦 Running database migrations...');
try {
  // Use dynamic import for TypeScript file with better-sqlite3 support
  const { execSync } = require('child_process');
  const migrationResult = execSync('npx tsx db/migrations/run-migrations.ts migrate', {
    cwd: __dirname,
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  console.log(migrationResult);
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  if (!isDevelopment) {
    // In production, we must have a valid database
    process.exit(1);
  } else {
    console.warn('⚠️  Continuing in development mode despite migration failure');
  }
}

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Terminal session storage
const terminalSessions = new Map();
const sessionMetadata = new Map();

// 🔧 FIX (Oct 24, 2025): Session cleanup grace period for navigation persistence
// Prevents killing PTY during Timeline ↔ IDE navigation while still cleaning up on actual close/refresh
const sessionCleanupTimers = new Map(); // sessionId -> setTimeout timer

// Claude Code session state tracking
const claudeCodeSessions = new Map(); // sessionId -> { inClaudeSession: boolean, sessionStartTime: Date }

// Interactive Claude CLI sessions via bridge (PTY mode)
// Maps sessionId -> { commandId, bridgeId, startTime }
// When populated, terminal input routes to bridge instead of local PTY
const interactiveClaudeSessions = new Map();

// Context capture integration
const terminalDataBuffers = new Map(); // Buffer terminal data for context capture
const contextSessions = new Map(); // Map terminal sessions to context sessions

// Activity tracking for memory flush scheduling (Dec 4, 2025)
let lastTerminalActivity = Date.now();
let lastClaudeResponseTime = 0; // Track when Claude responses complete
const markTerminalActivity = () => {
  lastTerminalActivity = Date.now();
};

// Detect Claude response completion for early memory flush
const detectClaudeResponse = (content) => {
  // Quick patterns that indicate Claude response completion
  const completionPatterns = [
    /^\s*\$\s*$/m,                    // Shell prompt after response
    /Human:|User:/i,                   // Next turn marker
    /───────────────/,                 // Claude section dividers
    /✓.*completed/i,                   // Task completion
    /Created|Modified|Fixed|Added/i,   // Action completion words
  ];

  return completionPatterns.some(p => p.test(content));
};

// Flush buffered terminal context data to the API
const flushContextData = async (sessionId) => {
  const buffer = terminalDataBuffers.get(sessionId);
  if (!buffer || buffer.length === 0) return;

  try {
    const chunks = [...buffer]; // Copy buffer
    terminalDataBuffers.set(sessionId, []); // Clear buffer

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`http://localhost:${port}/api/context/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chunks,
        sessionId,
        projectPath: '/Users/michaelkraft/autonomous_vibe_interface'
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
    }
  } catch (error) {
    console.warn(`[Context] Failed to flush context data:`, error.message);
  }
};

// Smart early flush when Claude response detected
const triggerEarlyFlushIfNeeded = async (sessionId, content) => {
  if (!detectClaudeResponse(content)) return;

  // Don't flush too often (min 15s between early flushes)
  const now = Date.now();
  if (now - lastClaudeResponseTime < 15000) return;

  lastClaudeResponseTime = now;

  const buffer = terminalDataBuffers.get(sessionId);
  // Early flush if we have at least 5 chunks (reduced from 10)
  if (buffer && buffer.length >= 5) {
    // Fire and forget - don't block terminal
    flushContextData(sessionId).catch(err => {
      console.warn(`[Context] Early flush failed:`, err.message);
    });
  }
};

// 🔌 Initialize server buffer access for requirement extraction API
try {
  const { initializeServerBuffers } = require(path.join(__dirname, 'lib', 'server-terminal-access.js'));
  initializeServerBuffers({ terminalDataBuffers });
} catch (error) {
  console.warn('⚠️ Server terminal access module not available (expected in standalone builds)');
  console.warn('Terminal requirement extraction API will use fallback mode');
}

// 🎯 CRITICAL FIX (Oct 28, 2025): Separate buffer for terminal history restoration
// terminalDataBuffers filters out ANSI codes, making it useless for history display
// This buffer keeps ANSI codes for proper terminal rendering on reconnection
const terminalHistoryBuffers = new Map(); // sessionId -> array of terminal output chunks WITH ANSI codes

// 🚀 PERFORMANCE FIX: Debounce timers for memory API calls
const memoryDebounceTimers = new Map(); // sessionId -> timer reference

// Team presence tracking: teamId -> Map<userId, { userId, username, sockets: Set<socketId> }>
const teamPresence = new Map();

// Collaborative editing document state: fileId -> { updates[], userCount, lastActivity, cleanupTimer }
const collabDocs = new Map();

function broadcastPresence(teamId) {
  const members = teamPresence.get(teamId);
  const onlineList = members
    ? Array.from(members.values()).map(m => ({ userId: m.userId, username: m.username }))
    : [];
  io.to(`team:${teamId}`).emit('team:presence:update', { teamId, online: onlineList });
}

// Git output detection for team code awareness
const gitOutputBuffer = new Map(); // sessionId -> string buffer
const teamActivityBuffers = new Map(); // teamId -> array of events (max 30)
const MAX_ACTIVITY_BUFFER = 30;

// Maps terminal sessions to teams for activity broadcasting
const sessionTeamMapping = new Map(); // sessionId -> { teamId, userId, username }

function detectGitEvent(sessionId, rawData) {
  // 🔧 FIX (Feb 11, 2026): Claude CLI uses cursor-right sequences (\e[1C, \e[3C)
  // instead of spaces between words. Replace them with equivalent spaces BEFORE
  // stripping other ANSI sequences, so word boundaries are preserved.
  let clean = rawData.replace(/\x1b\[(\d+)C/g, (_, n) => ' '.repeat(parseInt(n, 10)));
  clean = clean.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

  const prev = gitOutputBuffer.get(sessionId) || '';
  const combined = prev + clean;
  // 🔧 FIX (Feb 11, 2026): Claude CLI uses \r for line breaks in its TUI output.
  // Split on \r, \n, or \r\n so commit lines are properly separated.
  const lines = combined.split(/\r?\n|\r/);
  const remainder = lines.pop() || '';
  gitOutputBuffer.set(sessionId, remainder);

  const events = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Git commit: "[main abc1234] commit message"
    // Removed ^ anchor — Claude CLI wraps output in box-drawing chars and other prefixes.
    const commitMatch = trimmed.match(/\[([\w\-\/\.]+)\s+([a-f0-9]{7,})\]\s*(.*)/);
    if (commitMatch) {
      events.push({ type: 'commit', branch: commitMatch[1], sha: commitMatch[2], message: commitMatch[3] });
      continue;
    }

    // Git push: "To github.com:user/repo.git" or "To https://github.com/..."
    if (/^To\s+(git@|https?:\/\/).*\.git/.test(trimmed)) {
      const pushMatch = trimmed.match(/^To\s+(.+\.git)/);
      events.push({ type: 'push', remote: pushMatch?.[1] || 'origin' });
      continue;
    }

    // Branch switch: "Switched to branch 'feature'" or "Switched to a new branch 'feature'"
    if (/^Switched to (?:a new )?branch/.test(trimmed)) {
      const branchMatch = trimmed.match(/branch '([^']+)'/);
      events.push({ type: 'branch', branch: branchMatch?.[1] || 'unknown' });
    }
  }
  return events;
}

// Claude Code session management helpers
function isInClaudeCodeSession(sessionId) {
  const sessionState = claudeCodeSessions.get(sessionId);
  return sessionState ? sessionState.inClaudeSession : false;
}

function startClaudeCodeSession(sessionId) {
  claudeCodeSessions.set(sessionId, {
    inClaudeSession: true,
    sessionStartTime: new Date()
  });
  console.log(`[Claude Session] Started Claude Code session for terminal ${sessionId}`);
}

function endClaudeCodeSession(sessionId) {
  const sessionState = claudeCodeSessions.get(sessionId);
  if (sessionState) {
    // Calculate session duration
    const duration = sessionState.sessionStartTime
      ? Date.now() - sessionState.sessionStartTime.getTime()
      : 0;

    claudeCodeSessions.set(sessionId, {
      ...sessionState,
      inClaudeSession: false
    });
    console.log(`[Claude Session] Ended Claude Code session for terminal ${sessionId} (duration: ${duration}ms)`);

    // 🔔 Emit claude:sessionComplete for audio alert feature
    // Terminal.tsx listens for this event to play completion sound
    const terminalSession = terminalSessions.get(sessionId);
    if (terminalSession && terminalSession.connectedSockets) {
      terminalSession.connectedSockets.forEach(socket => {
        if (socket.connected) {
          socket.emit('claude:sessionComplete', {
            sessionId: sessionId,
            duration: duration
          });
          console.log(`[Claude Session] Emitted claude:sessionComplete to socket (duration: ${duration}ms)`);
        }
      });
    }
  }
}

function detectClaudeCodeSessionStart(input) {
  // Claude Code session start patterns (from context-processor.ts)
  const sessionStartPatterns = [
    /^claude\s*$/i,                     // just "claude"
    /^claude\s+(.+)$/i,                 // claude with command
    /^claude-code\s*$/i,                // claude-code variant
    /^claude-code\s+(.+)$/i,           // claude-code with command
    /^cc\s*$/i,                        // cc shorthand
    /^cc\s+(.+)$/i,                    // cc with command
    /^\$\s*claude\s*$/i,               // with bash prompt
    /^\$\s*claude\s+(.+)$/i,           // with bash prompt and command
    /^>\s*claude\s*$/i,                // with > prompt
    /^>\s*claude\s+(.+)$/i,            // with > prompt and command
    /^➜\s*.*claude\s*$/i,              // with zsh prompt
    /^➜\s*.*claude\s+(.+)$/i,          // with zsh prompt and command
    /^\[.*\]\$\s*claude\s*$/i,         // with git prompt
    /^\[.*\]\$\s*claude\s+(.+)$/i      // with git prompt and command
  ];
  
  return sessionStartPatterns.some(pattern => pattern.test(input.trim()));
}

function detectClaudeCodeSessionEnd(input) {
  // Common Claude Code session exit patterns
  const sessionEndPatterns = [
    /^exit\s*$/i,                      // exit command
    /^quit\s*$/i,                      // quit command
    /^bye\s*$/i,                       // bye command
    /^\x03/,                           // Ctrl+C
    /^\x04/                            // Ctrl+D
  ];
  
  return sessionEndPatterns.some(pattern => pattern.test(input));
}

function createClaudePromptForSlashCommand(slashCommand) {
  // Create Claude-formatted prompts for slash commands that work well in Claude Code sessions
  const claudePrompts = {
    // Feature Implementation
    'implement': 'I need help implementing a new feature. Please ask me what feature I want to build, then guide me through the implementation with architectural planning and best practices.',
    'design': 'I need help with UI/UX design. Please ask me what interface or component I need to design, then provide mockup suggestions and implementation guidance.',
    
    // Build & Test
    'build': 'Help me with building and compilation. Please analyze my project structure and provide the appropriate build commands, handle any build errors, and optimize the build process.',
    'test': 'Generate comprehensive tests for my code. Please analyze the current codebase and create unit tests, integration tests, and suggest testing strategies.',
    'deploy': 'Guide me through deploying to production. Please check my deployment configuration, suggest best practices, and help with any deployment issues.',
    
    // Code Analysis & Debugging
    'analyze': 'Perform a deep analysis of my codebase. Please review the architecture, identify potential issues, suggest improvements, and provide a comprehensive audit report.',
    'troubleshoot': 'Help me debug a complex issue. Please ask me about the problem, analyze error messages, review relevant code, and guide me to a solution.',
    'explain': 'Explain this code in detail. I will show you code and you should provide clear explanations of what it does, how it works, and document it thoroughly.',
    
    // Quality Assurance
    'improve': 'Analyze my code for optimization opportunities. Please review performance, suggest refactoring, improve code quality, and modernize patterns.',
    'cleanup': 'Help me clean up and standardize my code. Please fix formatting issues, remove dead code, improve naming conventions, and ensure consistency.',
    
    // Project Management
    'document': 'Generate comprehensive documentation for my project. Please create README files, API documentation, inline comments, and user guides.',
    'git': 'Help with Git workflow. Please assist with commits, branching strategies, merge conflicts, and repository management.',
    'estimate': 'Help me estimate this project. Please analyze requirements, break down tasks, estimate time and resources, and create a project timeline.',
    'task': 'Help me manage tasks and track progress. Please create a task list, prioritize work, track dependencies, and monitor completion.',
    'index': 'Index and analyze my codebase structure. Please create a searchable index of functions, classes, dependencies, and provide codebase insights.',
    'load': 'Load and analyze specific files or contexts. Please help me understand code relationships and dependencies in my project.',
    'spawn': 'Help me spawn a multi-agent task force. Please coordinate multiple AI agents to work on different aspects of my project simultaneously.',
    
    // Git & Version Control
    'commit': 'Help me create a git commit. Please review my changes, suggest a clear commit message, and ensure proper git hygiene.',
    'push': 'Help me push changes to the repository. Please check for conflicts, review changes, and ensure safe deployment.',
    'pull': 'Help me pull the latest changes. Please handle merge conflicts, review incoming changes, and update my local repository safely.',
    
    // Development
    'help': 'Show me available slash commands and how to use them in this context.',
    'status': 'Show me the current status of my project and development environment.'
  };
  
  const prompt = claudePrompts[slashCommand];
  if (prompt) {
    return `The user executed the /${slashCommand} command. ${prompt}`;
  }
  
  // Fallback for unknown commands
  return `The user executed the /${slashCommand} command. Please help them with this request or explain what this command should do if you're familiar with it.`;
}

async function routeSlashCommandToClaudeCode(sessionId, slashCommand, claudePrompt, socket, session) {
  try {
    // Check if bridge is available
    if (!bridgeManager) {
      socket.emit('terminal:data', {
        id: sessionId,
        data: '\r\n❌ Bridge not available. Slash commands in Claude Code require the bridge connection.\r\n'
      });
      return;
    }
    
    // Get user ID from session
    const userId = session.userId || 'default';
    let bridgeStatus = bridgeManager.getBridgeStatus?.(userId);

    // ALPHA FIX (Dec 3, 2025): Fallback to ANY connected bridge
    if (!bridgeStatus?.connected && bridgeManager.findAnyConnectedBridge) {
      const anyBridge = bridgeManager.findAnyConnectedBridge();
      if (anyBridge) {
        bridgeStatus = { connected: true, bridges: [anyBridge] };
      }
    }

    if (!bridgeStatus?.connected) {
      socket.emit('terminal:data', {
        id: sessionId,
        data: '\r\n⚠️  Claude Bridge not connected.\r\n'
      });
      socket.emit('terminal:data', {
        id: sessionId,
        data: 'To use slash commands in Claude Code:\r\n'
      });
      socket.emit('terminal:data', {
        id: sessionId,
        data: '1. Click "🌉 Connect Bridge" in the status bar\r\n'
      });
      socket.emit('terminal:data', {
        id: sessionId,
        data: '2. Follow the connection instructions\r\n\r\n'
      });
      return;
    }
    
    // Execute the slash command through bridge as a properly formatted Claude command
    const commandRequest = {
      sessionId,
      commandId: `slash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      command: `claude ${claudePrompt}`,  // Format as proper Claude CLI command
      context: {
        workingDirectory: process.cwd(),
        currentFile: null,
        selection: null,
        slashCommand: slashCommand  // Add context about the original slash command
      },
      timestamp: new Date()
    };
    
    console.log(`[Terminal] Executing slash command /${slashCommand} through bridge for user ${userId}`);
    
    const result = await bridgeManager.executeCommand(userId, commandRequest);
    
    if (!result.success) {
      socket.emit('terminal:data', {
        id: sessionId,
        data: `\r\n❌ Error processing /${slashCommand}: ${result.error}\r\n`
      });
    } else {
      socket.emit('terminal:data', {
        id: sessionId,
        data: `\r\n✅ /${slashCommand} command sent to Claude Code successfully.\r\n`
      });
    }
    
  } catch (error) {
    console.error(`[Terminal] Error routing slash command /${slashCommand}:`, error);
    socket.emit('terminal:data', {
      id: sessionId,
      data: `\r\n❌ Error processing /${slashCommand}: ${error.message}\r\n`
    });
  }
}

// Initialize enhanced tmux service
let tmuxService;
if (EnhancedTmuxService) {
  try {
    tmuxService = new EnhancedTmuxService();
    // REMOVED: // REMOVED: // REMOVED: console.log('🚀 Enhanced tmux service initialized');
  } catch (error) {
    console.warn('⚠️ Failed to initialize tmux service:', error.message);
    tmuxService = null;
  }
} else {
  tmuxService = null;
}

// Session management
class TerminalSession {
  constructor(id, userId = 'default', cols = 80, rows = 30) {
    this.id = id;
    this.userId = userId;
    this.created = new Date();
    this.lastActivity = new Date();
    
    try {
      // Create PTY process
      const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
      // Use current working directory in production, specific path in development
      const workingDir = process.env.NODE_ENV === 'production' 
        ? process.cwd() 
        : path.join(process.env.HOME || process.cwd(), 'autonomous_vibe_interface');
      
      // Ensure working directory exists
      const finalWorkingDir = fs.existsSync(workingDir) ? workingDir : process.cwd();
      this.workingDir = finalWorkingDir; // Store for Time Capsule repo path

      console.log(`[Terminal] Creating PTY session ${id} with shell: ${shell}, cwd: ${finalWorkingDir}`);
      
      // Ensure PATH includes common locations for Claude CLI
      const enhancedPath = [
        '/opt/homebrew/bin',
        '/usr/local/bin', 
        '/usr/bin',
        '/bin',
        '/usr/sbin',
        '/sbin',
        process.env.PATH
      ].filter(Boolean).join(':');
      
      // Z.AI GLM Backend Configuration (YouTube architecture)
      // When USE_GLM_BACKEND is true, configure Claude CLI to use GLM via Z.AI's Anthropic-compatible API
      const useGLMBackend = process.env.USE_GLM_BACKEND === 'true';
      const baseEnv = {
        ...process.env,
        PATH: enhancedPath,
        CODER1_IDE: 'true',
        TERMINAL_SESSION_ID: id
      };
      
      // Add Z.AI configuration for GLM backend (enables full tool use at $0.10/M)
      if (useGLMBackend && process.env.ZAI_API_KEY && process.env.ZAI_BASE_URL) {
        Object.assign(baseEnv, {
          ANTHROPIC_BASE_URL: process.env.ZAI_BASE_URL,
          ANTHROPIC_AUTH_TOKEN: process.env.ZAI_API_KEY,
          ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-4.6',
          ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.6',
          ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-4.6'
        });
        console.log(`🚀 [Terminal] GLM Backend enabled for session ${id} via Z.AI (90% tool use success rate)`);
      }
      
      this.pty = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: finalWorkingDir,
        env: baseEnv
      });
      
      // Critical diagnostic: Verify PTY was actually created
      console.log(`🎯 PTY SPAWN TEST: ${this.pty ? '✅ SUCCESS' : '❌ FAILED'} for session ${id}`);
      if (this.pty) {
        console.log(`[Terminal] PTY session ${id} created successfully with PID: ${this.pty.pid}`);
      } else {
        console.error(`[Terminal] PTY is null after spawn for session ${id}!`);
        throw new Error('PTY spawn returned null');
      }
      
      // Set a cleaner prompt after terminal starts (overrides .bashrc)
      const isProduction = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production' || process.env.PORT === '10000';
      if (isProduction) {
        setTimeout(() => {
          // Export a cleaner PS1 prompt
          this.pty.write('export PS1="\\[\\033[01;32m\\]coder1\\[\\033[00m\\]:\\[\\033[01;34m\\]\\W\\[\\033[00m\\]$ "\r');
          // Clear the screen for clean terminal start
          this.pty.write('clear\r');
        }, 100);
      }
    } catch (error) {
      console.error(`[Terminal] Failed to create PTY session ${id}:`, error);
      throw new Error(`Failed to create terminal session: ${error.message}`);
    }
    
    // REMOVED: // REMOVED: // REMOVED: console.log(`[Terminal] Created session ${id} with PID ${this.pty.pid}`);
  }
  
  write(data) {
    this.lastActivity = new Date();
    if (this.pty) {
      this.pty.write(data);
    }
  }
  
  resize(cols, rows) {
    if (this.pty) {
      this.pty.resize(cols, rows);
    }
  }
  
  destroy() {
    if (this.pty) {
      // REMOVED: // REMOVED: // REMOVED: console.log(`[Terminal] Destroying session ${this.id}`);
      try {
        this.pty.kill();
      } catch (error) {
        console.error(`[Terminal] Error killing PTY:`, error);
      }
      this.pty = null;
    }
  }
}

// Helper to get or create terminal session
function getOrCreateSession(sessionId, userId = 'default', cols = 80, rows = 30) {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${uuidv4().slice(0, 8)}`;
  }

  if (!terminalSessions.has(sessionId)) {
    const session = new TerminalSession(sessionId, userId, cols, rows);
    terminalSessions.set(sessionId, session);
    
    // Set up PTY exit handler only (data handler will be set up in socket connection)
    session.pty.onExit(({ exitCode, signal }) => {
      // 🔧 FIX (Feb 2026): Notify connected client that session is gone
      // This triggers auto-reconnect on the client instead of silent input loss
      const sessionSocket = terminalSessionSockets.get(sessionId);
      if (sessionSocket?.connected) {
        sessionSocket.emit('terminal:error', {
          message: 'Terminal session not found'
        });
      }

      terminalSessions.delete(sessionId);
      terminalSessionSockets.delete(sessionId);

      // 🎯 Clean up terminal history buffer
      if (terminalHistoryBuffers.has(sessionId)) {
        terminalHistoryBuffers.delete(sessionId);
      }
    });
  }
  
  return terminalSessions.get(sessionId);
}

// Helper function for health check endpoint
function handleHealthCheck(req, res) {
  const stats = memoryOptimizer.getStats();
  
  // Get Socket.IO stats if available
  let socketStats = {
    available: false,
    connectedClients: 0,
    transport: 'unknown',
    ptyCompatible: false
  };
  
  if (global.io) {
    socketStats = {
      available: true,
      connectedClients: global.io.engine?.clientsCount || 0,
      transports: global.io.engine?.transports || [],
      ptyCompatible: ptyCompatible || false,
      activeSessions: terminalSessions.size,
      namespace: '/'
    };
  }
  
  const health = {
    status: stats.status,
    commit: GIT_COMMIT,
    uptime: Date.now() - (global.serverStartTime || Date.now()),
    memory: {
      used: stats.heapUsedMB,
      limit: 400,
      percentage: stats.percentage
    },
    socketio: socketStats,
    sessions: {
      terminal: terminalSessions.size,
      alpha: alphaActiveSessions.size,
      max: maxAlphaUsers
    },
    alpha: {
      enabled: isAlphaMode,
      mode: deploymentMode,
      slotsAvailable: maxAlphaUsers - alphaActiveSessions.size
    },
    pty: {
      compatible: ptyCompatible || false,
      platform: os.platform(),
      shell: os.platform() === 'win32' ? 'powershell.exe' : 'bash'
    },
    timestamp: new Date().toISOString()
  };
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(health));
}

// Helper function to parse cookies from request
function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name) cookies[name] = value;
    return cookies;
  }, {});
}

// Helper function for alpha validation
function validateAlphaAccess(req, res) {
  if (!isAlphaMode) return true;

  // Check if user is authenticated (has auth-token cookie)
  // Authenticated users bypass invite code requirement
  const cookies = parseCookies(req);
  if (cookies['auth-token']) {
    return true; // Authenticated users can access without invite code
  }

  const parsedUrl = parse(req.url, true);
  const providedCode = req.headers['x-alpha-code'] ||
                      parsedUrl.query.alphaCode ||
                      parsedUrl.query.invite;

  if (providedCode !== alphaInviteCode) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Invalid alpha invite code',
      message: 'This is a private alpha. Please contact the team for access.'
    }));
    return false;
  }
  
  if (alphaActiveSessions.size >= maxAlphaUsers) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Alpha capacity reached',
      message: `All ${maxAlphaUsers} alpha slots are currently in use. Please try again later.`,
      slotsAvailable: 0
    }));
    return false;
  }
  
  return true;
}

// Main server initialization
app.prepare().then(() => {
  global.serverStartTime = Date.now();
  
  // 🗑️ REMOVED (Nov 26, 2025): Misleading API route verification
  // Previous code checked .next/server/app/api/bridge for pre-compiled routes
  // This created false alarms in development mode where Next.js compiles routes on-demand
  // All bridge API routes work correctly - they compile when first accessed
  // See: tasks/bridge-api-routes-analysis-nov-26-2025.md for full explanation
  
  // Create HTTP server with enhanced error handling
  // Generate unique ID for this server instance (for debugging load balancing)
  const INSTANCE_ID = require('crypto').randomUUID().slice(0, 8);
  console.log(`🆔 Server Instance ID: ${INSTANCE_ID}`);

  console.log('[DEBUG] Creating HTTP server...');
  const server = createServer((req, res) => {
    console.log(`🔍 [DEBUG] Request received: ${req.method} ${req.url}`);
    // ADDED: Debug header to trace which server instance handled the request
    res.setHeader('X-Instance-ID', INSTANCE_ID);

    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;
    
    // Add CORS headers for API routes when in development
    if (dev && pathname?.startsWith('/api/')) {
      res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
    }
    
    // Health check endpoint
    if (pathname === '/api/health' || pathname === '/health') {
      return handleHealthCheck(req, res);
    }
    
    // Terminal requirement extraction endpoint (server-side for buffer access)
    if (pathname === '/api/terminal/extract-requirement' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const { sessionId } = JSON.parse(body);
          
          if (!sessionId || typeof sessionId !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              requirement: '',
              confidence: 'low',
              fallbackNeeded: true,
              error: 'Valid session ID is required',
              userMessages: [],
              conversationContext: ''
            }));
            return;
          }

          const buffer = terminalDataBuffers.get(sessionId);
          
          if (!buffer || buffer.length === 0) {
            console.warn(`[Extract Requirement] No buffer found for session: ${sessionId}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              requirement: '',
              confidence: 'low',
              fallbackNeeded: true,
              message: 'No conversation history found. Start a conversation with Claude first.',
              userMessages: [],
              conversationContext: ''
            }));
            return;
          }

          console.log(`[Extract Requirement] Processing ${buffer.length} buffer chunks for session ${sessionId}`);
          
          // Debug: Log first few chunks to see structure
          console.log(`[Extract Requirement] Sample chunks:`, buffer.slice(0, 5).map(chunk => ({
            type: chunk.type,
            content: chunk.content?.substring(0, 50),
            timestamp: chunk.timestamp
          })));

          // Import and use the requirement extractor
          const { extractRequirementFromDataBuffer, validateExtraction } = require(path.join(__dirname, 'lib', 'requirement-extractor.js'));
          const result = extractRequirementFromDataBuffer(buffer);
          const validation = validateExtraction(result);
          const fallbackNeeded = result.confidence === 'low' || !validation.valid;
          
          // Log extraction and quality results
          console.log(`[Extract Requirement] Extraction result:`, {
            requirement: result.requirement.substring(0, 100),
            confidence: result.confidence,
            fallbackNeeded,
            validationReason: validation.reason
          });
          
          // Log quality assessment
          if (result.quality) {
            console.log(`[Extract Requirement] Quality assessment:`, {
              score: result.quality.score,
              passed: result.quality.passed,
              aspectsDetected: result.quality.aspectsDetected,
              threshold: result.quality.threshold,
              missingAspects: result.quality.missingAspects
            });
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            requirement: result.requirement,
            confidence: result.confidence,
            fallbackNeeded,
            userMessages: result.userMessages,
            conversationContext: result.conversationContext,
            extractedFrom: result.extractedFrom,
            validation: validation.valid ? undefined : validation.reason,
            quality: result.quality // Include quality assessment in response
          }));
        } catch (error) {
          console.error('[Extract Requirement] Error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            requirement: '',
            confidence: 'low',
            fallbackNeeded: true,
            error: error.message || 'Unknown error occurred',
            userMessages: [],
            conversationContext: ''
          }));
        }
      });
      return;
    }
    
    // Explicit static file serving for /public directory
    // Critical for serving install-bridge.sh and other static assets
    if (pathname && !pathname.startsWith('/api/') && !pathname.startsWith('/_next/')) {
      const publicPath = path.join(__dirname, 'public', pathname);
      
      // Check if file exists in public directory
      if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
        try {
          const content = fs.readFileSync(publicPath);
          
          // Set appropriate content type
          const ext = path.extname(pathname).toLowerCase();
          const contentTypes = {
            '.sh': 'text/x-shellscript',
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.txt': 'text/plain'
          };
          
          const contentType = contentTypes[ext] || 'application/octet-stream';
          res.writeHead(200, { 
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600'
          });
          res.end(content);
          return;
        } catch (error) {
          console.error(`Error serving static file ${pathname}:`, error.message);
        }
      }
    }

    if (pathname === '/welcome') {
      req.url = '/coder1-alpha-welcome.html';
      const cleanParsedUrl = parse(req.url, true);
      return handle(req, res, cleanParsedUrl);
    }

    // OAuth routes must bypass custom server handling and reach Next.js App Router
    if (pathname?.startsWith('/api/v2/auth/')) {
      console.log(`🔐 Delegating OAuth route to Next.js App Router: ${pathname}`);
      return handle(req, res, parsedUrl);
    }

    // Alpha validation for protected routes
    if (isAlphaMode && (pathname === '/' || pathname === '/ide' || pathname?.startsWith('/api/claude'))) {
      if (!validateAlphaAccess(req, res)) {
        return;
      }
    }
    
    // Enhanced error handling and smart CSS/JS serving
    const handleWithFallback = async () => {
      try {
        // Smart asset serving: Handle CSS/JS files with any query parameters from Next.js static serving
        // This preserves image preloading while fixing CSS/JS 404 errors
        const isCSSOrJS = pathname?.endsWith('.css') || pathname?.endsWith('.js');
        const hasQueryParams = req.url.includes('?');
        const isNextStaticAsset = pathname?.startsWith('/_next/static/');
        
        if (isCSSOrJS && hasQueryParams && isNextStaticAsset) {
          console.log(`🎯 Smart asset serving: ${pathname} with query params`);
          
          // Strip ALL query parameters that break CSS/JS serving (not just ?v=)
          const cleanUrl = req.url.split('?')[0];
          const cleanParsedUrl = parse(cleanUrl, true);
          
          // Set proper headers for static assets
          if (pathname.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (pathname.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
          
          // Handle request with cleaned URL to fix query parameter issues
          await handle(req, res, cleanParsedUrl);
          
        } else {
          // Handle all other requests normally (preserves image preloading)
          await handle(req, res, parsedUrl);
        }
        
      } catch (error) {
        console.error(`❌ Request handling error for ${pathname}:`, error.message);
        
        // CSS serving fallback
        if (pathname?.includes('css') || req.headers.accept?.includes('text/css')) {
          console.log('🔄 Attempting CSS fallback...');
          res.writeHead(200, { 'Content-Type': 'text/css' });
          res.end(`
            /* CSS Fallback - Basic Dark Theme */
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #0a0a0a; 
              color: #ffffff; 
              height: 100vh; 
              overflow: hidden;
            }
            .error-notice {
              position: fixed;
              top: 20px;
              right: 20px;
              background: rgba(255, 87, 87, 0.9);
              color: white;
              padding: 12px 16px;
              border-radius: 6px;
              z-index: 10000;
              font-size: 14px;
            }
            .loading-notice {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              text-align: center;
            }
          `);
          return;
        }
        
        // IDE page fallback
        if (pathname === '/ide' || pathname?.startsWith('/ide')) {
          console.log('🔄 Serving IDE fallback page...');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Coder1 IDE - Loading...</title>
              <style>
                body { 
                  font-family: system-ui, sans-serif; 
                  background: #0a0a0a; 
                  color: #fff; 
                  margin: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  flex-direction: column;
                }
                .loader { 
                  border: 4px solid #333; 
                  border-top: 4px solid #00d9ff; 
                  border-radius: 50%; 
                  width: 40px; 
                  height: 40px; 
                  animation: spin 2s linear infinite; 
                  margin-bottom: 20px;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .message { text-align: center; max-width: 500px; line-height: 1.6; }
                .retry { 
                  margin-top: 20px; 
                  padding: 10px 20px; 
                  background: #00d9ff; 
                  color: #000; 
                  border: none; 
                  border-radius: 4px; 
                  cursor: pointer;
                }
              </style>
            </head>
            <body>
              <div class="loader"></div>
              <div class="message">
                <h2>Coder1 IDE is loading...</h2>
                <p>The server is initializing. This page will automatically refresh when ready.</p>
                <button class="retry" onclick="window.location.reload()">Refresh Now</button>
              </div>
              <script>
                console.log('IDE fallback page loaded - server may be restarting');
                setTimeout(() => window.location.reload(), 5000);
              </script>
            </body>
            </html>
          `);
          return;
        }
        
        // Generic error fallback
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head><title>Coder1 - Server Error</title></head>
            <body style="font-family: system-ui; background: #0a0a0a; color: #fff; padding: 40px; text-align: center;">
              <h1>🔧 Server Error</h1>
              <p>The server encountered an error processing your request.</p>
              <p><button onclick="window.location.reload()" style="padding: 10px 20px; background: #00d9ff; color: #000; border: none; border-radius: 4px;">Retry</button></p>
            </body>
            </html>
          `);
        }
      }
    };
    
    // Execute with fallback handling - MUST return the promise to prevent request handler from exiting early
    return handleWithFallback().catch(error => {
      console.error('❌ Critical request handling error:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    });
  });
  
  // Track command buffers globally for all sessions
  const commandBuffers = new Map();
  
  // Track socket-to-session relationships for cleanup
  const socketToSession = new Map();
  
  // [DEBUG] Add event listeners before Socket.IO attaches
  console.log('[DEBUG] Adding HTTP server event listeners...');
  server.on('connection', (socket) => console.log('[DEBUG] TCP connection received'));
  server.on('request', (req) => console.log('[DEBUG] HTTP request event:', req.url));
  server.on('upgrade', (req, socket, head) => console.log('[DEBUG] Upgrade request:', req.url));

  // Initialize Socket.IO with Render-specific configuration
  // UPDATED: Increased timeouts to prevent connection drops during idle periods
  // UPDATED: Added Chrome extension conflict protection
  console.log('[DEBUG] Attaching Socket.IO to server...');
  io = new Server(server, {
    cors: {
      origin: dev 
        ? [
            `http://localhost:${port}`,
            'http://localhost:3000',
            'http://localhost:3001'
          ]
        : process.env.NODE_ENV === 'production'
          ? ['https://*.onrender.com', process.env.RENDER_EXTERNAL_URL || '*']
          : true,
      credentials: true,
      methods: ['GET', 'POST'], // ADDED: Explicit methods to prevent extension blocking
      allowedHeaders: ['Content-Type', 'Authorization'] // ADDED: Prevent extension header injection
    },
    path: '/socket.io/',
    transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket
    allowEIO3: true, // Support older clients
    pingTimeout: 300000, // 5 min — allows long Claude CLI commands without disconnect
    pingInterval: 25000, // 25s — keep connection alive
    upgradeTimeout: 30000, // Time to wait for upgrade from polling to websocket
    allowUpgrades: true, // Allow upgrade from polling to websocket
    perMessageDeflate: false, // Disable compression for better reliability on Render
    httpCompression: false, // Disable HTTP compression for better reliability
    connectTimeout: 45000, // ADDED: 45 seconds for initial connection
    maxHttpBufferSize: 1e6, // ADDED: 1MB max buffer (prevents memory issues)
    // ADDED: Chrome extension conflict protection
    cookie: false, // Disable cookies to prevent extension interference
    destroyUpgrade: false, // Keep upgrade connections alive
    destroyUpgradeTimeout: 1000 // But clean up failed upgrades quickly
  });

  // [DEBUG] Check server listeners after Socket.IO attached
  console.log('[DEBUG] Socket.IO attached. Server request listeners:', server.listenerCount('request'));
  console.log('[DEBUG] Server connection listeners:', server.listenerCount('connection'));

  // Inject Instance ID into Socket.IO handshake headers for sticky-session debugging
  io.engine.on("headers", (headers, req) => {
    headers["X-Instance-ID"] = INSTANCE_ID;
  });

  // Add WebSocket authentication middleware (if available)
  try {
    const { createSocketAuthMiddleware } = require('./lib/websocket-auth');
    io.use(createSocketAuthMiddleware());
    console.log('🔐 WebSocket authentication middleware enabled');
  } catch (error) {
    console.warn('⚠️ WebSocket authentication not available (development mode):', error.message);
    // Continue without authentication for development/backwards compatibility
  }

  // Connect WebSocket Event Bridge to Socket.IO server for Claude Code Bridge events
  if (WebSocketEventBridge) {
    try {
      WebSocketEventBridge.connectToSocketServer(io);
      // REMOVED: // REMOVED: // REMOVED: console.log('🔗 WebSocket Event Bridge connected for Claude Code Bridge events');
    } catch (error) {
      console.warn('⚠️ Failed to connect WebSocket Event Bridge:', error.message);
    }
  }

  // Initialize Agent Terminal Manager with Socket.IO instance
  if (agentTerminalManager) {
    try {
      agentTerminalManager.setSocketIO(io);
      console.log('🤖 Agent Terminal Manager initialized for Phase 2');
    } catch (error) {
      console.warn('⚠️ Failed to initialize Agent Terminal Manager:', error.message);
    }
  }
  
  // Initialize Agent Coordinator with Socket.IO instance (CRITICAL for agent:spawn events)
  // This must happen AFTER Socket.IO is created
  if (!agentCoordinator) {
    try {
      const { getCoordinatorService } = require('./services/agent-coordinator');
      agentCoordinator = getCoordinatorService({ io });
      console.log('🎭 Agent Coordinator initialized with Socket.IO');
    } catch (error) {
      console.warn('⚠️ Agent Coordinator not available:', error.message);
      agentCoordinator = null;
    }
  }
  
  // Connect Agent Coordinator to Agent Terminal Manager for output routing
  if (agentCoordinator && agentTerminalManager) {
    try {
      agentCoordinator.setAgentTerminalManager(agentTerminalManager);
      console.log('🔌 Agent Coordinator connected to Agent Terminal Manager');
    } catch (error) {
      console.warn('⚠️ Failed to connect Agent Coordinator to Terminal Manager:', error.message);
    }
  }
  
  // 🔗 Connect Claude CLI Puppeteer to Agent Terminal Manager for cleanup coordination
  if (claudePuppeteer && agentTerminalManager) {
    try {
      claudePuppeteer.setAgentTerminalManager(agentTerminalManager);
      console.log('🧹 Claude CLI Puppeteer connected to Agent Terminal Manager for cleanup');
    } catch (error) {
      console.warn('⚠️ Failed to connect Claude CLI Puppeteer to Terminal Manager:', error.message);
    }
  }

  // Initialize Coder1 Bridge Manager for local Claude CLI connections
  let bridgeManager;
  try {
    const { bridgeManager: manager } = require('./services/bridge-manager.ts');
    bridgeManager = manager;
    
    // Set up bridge namespace
    const bridgeNamespace = io.of('/bridge');
    
    // Bridge authentication middleware
    bridgeNamespace.use(async (socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'coder1-bridge-secret-2025';
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.userId;
        socket.bridgeMetadata = {
          version: decoded.version,
          platform: decoded.platform,
          claudeVersion: decoded.claudeVersion
        };
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
    
    // Bridge connection handler
    bridgeNamespace.on('connection', (socket) => {
      console.log(`🌉 Bridge connected: User ${socket.userId}, Platform: ${socket.bridgeMetadata.platform}`);
      
      // Register bridge with manager
      const bridgeId = bridgeManager.registerBridge(
        socket,
        socket.userId,
        socket.bridgeMetadata
      );
      
      // Send connection confirmation
      socket.emit('connection:accepted', {
        bridgeId,
        capabilities: ['claude', 'files', 'git']
      });
      
      // Handle command output from bridge
      socket.on('claude:output', (data) => {
        // Forward output to the terminal session
        io.emit('terminal:data', {
          id: data.sessionId,
          data: data.data
        });

        // 🔧 FIX (Feb 11, 2026): Run git event detection on bridge claude:output
        // This is the ACTUAL path for bridge Claude CLI output (not command:output).
        // Without this, commits made by Claude CLI via bridge are never detected.
        if (data.data && data.sessionId) {
          const gitEvents = detectGitEvent(data.sessionId, data.data);

          if (process.env.NEXT_PUBLIC_TIME_CAPSULES === 'true' && gitEvents.length > 0) {
            const claudeSession = claudeCodeSessions.get(data.sessionId);
            if (claudeSession && claudeSession.inClaudeSession) {
              for (const event of gitEvents) {
                if (event.type === 'commit') {
                  const duration = claudeSession.sessionStartTime
                    ? Date.now() - claudeSession.sessionStartTime.getTime()
                    : 0;
                  const session = terminalSessions.get(data.sessionId);
                  const terminalSocket = terminalSessionSockets.get(data.sessionId);
                  if (terminalSocket) {
                    terminalSocket.emit('time_capsule:commit_detected', {
                      sessionId: data.sessionId,
                      sha: event.sha,
                      branch: event.branch,
                      message: event.message,
                      claudeSessionStart: claudeSession.sessionStartTime,
                      duration,
                      repoPath: session?.workingDir || process.cwd(),
                    });
                  }
                  console.log(`[Time Capsule] Commit detected during Claude session (bridge claude:output): ${event.sha}`);
                }
              }
            }
          }
        }
      });
      
      // Handle command completion from bridge
      socket.on('claude:complete', (data) => {
        // FIX (Jan 2026): Differentiate success vs failure messages
        const message = data.exitCode === 0
          ? `\r\n✅ Command completed successfully\r\n`
          : `\r\n❌ Command failed (exit code: ${data.exitCode})${data.error ? ': ' + data.error : ''}\r\n`;

        io.emit('terminal:data', {
          id: data.sessionId,
          data: message
        });
      });
      
      // Handle file operations from bridge
      socket.on('file:response', (data) => {
        // Forward file operation responses
        bridgeManager.emit('file:response', data);
      });

      // Handle living files sync from bridge (on connect or refresh)
      socket.on('livingfiles:sync', (data) => {
        console.log(`📁 Living files synced from bridge ${bridgeId} (${Object.keys(data?.files || {}).length} files)`);
        // bridgeManager handles caching via its own socket handler in setupSocketHandlers
      });

      // Handle living files write acknowledgment from bridge
      socket.on('livingfiles:write-ack', (data) => {
        if (!data.success) {
          console.error(`📁 Living file write failed on bridge ${bridgeId}: ${data.filename} - ${data.error}`);
        }
        // bridgeManager handles cache invalidation via its own socket handler
      });
      
      // Handle interactive session started from bridge (Dec 10, 2025)
      // When Claude is running in interactive PTY mode, we need to route terminal input to it
      socket.on('claude:interactive:started', async (data) => {
        const { commandId, pid, sessionId } = data;
        console.log(`🎭 Interactive Claude session started: commandId=${commandId}, pid=${pid}`);

        // Find the terminal sessionId for this command
        // The sessionId comes from the original execute request
        if (sessionId) {
          interactiveClaudeSessions.set(sessionId, {
            commandId,
            bridgeId,
            pid,
            startTime: Date.now()
          });
          console.log(`📍 Tracking interactive session for terminal: ${sessionId}`);

          // 🔧 FIX (Feb 11, 2026): Also track in claudeCodeSessions for Time Capsule detection
          // On server restart/reconnect, bridge re-sends this event but claudeCodeSessions
          // is empty. Without this, Time Capsule commit detection never triggers because
          // all input routes to bridge (bypassing startClaudeCodeSession in command processing).
          startClaudeCodeSession(sessionId);

          // Notify the frontend that Claude is now in interactive mode
          io.emit('claude:mode:changed', {
            sessionId,
            mode: 'interactive',
            commandId
          });

          // Auto-fetch Johnny5 context for the new Claude session
          try {
            const contextUrl = `http://localhost:${port}/api/johnny5/context-for-claude`;
            const contextResp = await fetch(contextUrl);
            if (contextResp.ok) {
              const contextData = await contextResp.json();
              if (contextData.hasContext) {
                console.log(`[Johnny5→Claude] Context available: ${contextData.factCount} facts, ${contextData.context.length} chars`);
                // Emit context to frontend for optional injection
                io.emit('johnny5:claude-context-ready', {
                  sessionId,
                  context: contextData.context,
                  factCount: contextData.factCount,
                });
              }
            }
          } catch (contextErr) {
            console.warn('[Johnny5→Claude] Failed to fetch context:', contextErr.message);
          }
        }
      });

      // Handle interactive session ended from bridge
      socket.on('claude:interactive:ended', (data) => {
        const { commandId, exitCode, signal } = data;
        console.log(`🏁 Interactive Claude session ended: commandId=${commandId}, exitCode=${exitCode}`);

        // Find and remove the session by commandId
        for (const [sessionId, sessionData] of interactiveClaudeSessions.entries()) {
          if (sessionData.commandId === commandId) {
            interactiveClaudeSessions.delete(sessionId);
            // 🔧 FIX (Feb 11, 2026): Also end Claude session tracking for Time Capsule
            endClaudeCodeSession(sessionId);
            console.log(`🧹 Cleaned up interactive session for terminal: ${sessionId}`);

            // Notify the frontend that Claude is no longer in interactive mode
            io.emit('claude:mode:changed', {
              sessionId,
              mode: 'normal',
              exitCode
            });
            break;
          }
        }
      });

      // Handle heartbeat from bridge
      socket.on('heartbeat', (data) => {
        // TODO: Implement updateHeartbeat method in bridge-manager.js
        // bridgeManager.updateHeartbeat(bridgeId);
        console.log(`💓 Bridge heartbeat received from ${bridgeId}`);

        // Phase 1: Forward session token data to all browser clients
        if (data.sessionData?.tokens) {
          io.emit('bridge:session:tokens', {
            bridgeId,
            tokens: data.sessionData.tokens,
            hasActiveSession: data.sessionData.hasActiveSession,
            timestamp: data.sessionData.timestamp || Date.now()
          });
          console.log(`📊 Forwarded session tokens to browsers:`, {
            input: data.sessionData.tokens.input,
            output: data.sessionData.tokens.output,
            total: data.sessionData.tokens.total
          });
        }
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`🔌 Bridge disconnected: ${bridgeId}`);
        bridgeManager.unregisterBridge(bridgeId);
      });
      
      // Listen for bridge manager events and forward to appropriate destinations
      bridgeManager.on('command:output', (data) => {
        // Track token usage for responses
        (async () => {
          try {
            const { tokenTracker } = require('./services/token-tracker');
            await tokenTracker.trackResponse(data.data?.length || 0, data.sessionId);
            console.log(`📊 Tracked response tokens for session: ${data.sessionId}`);
          } catch (error) {
            console.error('Failed to track response tokens:', error);
          }
        })();

        // Forward to terminal session
        // 🔧 FIX (Dec 15, 2025): Use terminalSessionSockets map instead of socket ID lookup
        // data.sessionId is an app-level ID like "term_abc123", NOT a Socket.IO socket ID
        const terminalSocket = terminalSessionSockets.get(data.sessionId);
        if (terminalSocket) {
          terminalSocket.emit('terminal:data', {
            id: data.sessionId,
            data: data.data
          });
        } else {
          console.warn(`⚠️ No socket found for session ${data.sessionId} - bridge output lost`);
        }

        // 🔧 FIX (Feb 11, 2026): Run git event detection on bridge output
        // Bridge output bypasses PTY onData handler, so detectGitEvent was never called
        // for commits made by Claude CLI running via the bridge.
        if (data.data && data.sessionId) {
          const gitEvents = detectGitEvent(data.sessionId, data.data);

          // Time Capsule: Detect commits during active Claude sessions (bridge path)
          if (process.env.NEXT_PUBLIC_TIME_CAPSULES === 'true' && gitEvents.length > 0) {
            const claudeSession = claudeCodeSessions.get(data.sessionId);
            if (claudeSession && claudeSession.inClaudeSession) {
              for (const event of gitEvents) {
                if (event.type === 'commit') {
                  const duration = claudeSession.sessionStartTime
                    ? Date.now() - claudeSession.sessionStartTime.getTime()
                    : 0;
                  const session = terminalSessions.get(data.sessionId);
                  if (terminalSocket) {
                    terminalSocket.emit('time_capsule:commit_detected', {
                      sessionId: data.sessionId,
                      sha: event.sha,
                      branch: event.branch,
                      message: event.message,
                      claudeSessionStart: claudeSession.sessionStartTime,
                      duration,
                      repoPath: session?.workingDir || process.cwd(),
                    });
                  }
                  console.log(`[Time Capsule] Commit detected during Claude session (bridge): ${event.sha}`);
                }
              }
            }
          }
        }
      });

      bridgeManager.on('command:complete', (data) => {
        // Forward completion to terminal session
        // 🔧 FIX (Dec 15, 2025): Use terminalSessionSockets map instead of socket ID lookup
        const terminalSocket = terminalSessionSockets.get(data.sessionId);
        if (terminalSocket) {
          terminalSocket.emit('claude:complete', data);
        } else {
          console.warn(`⚠️ No socket found for session ${data.sessionId} - completion event lost`);
        }
      });

      // FIXED (Dec 10, 2025): Handle cancelled commands when bridge disconnects
      // Send error message to terminal so user knows what happened
      bridgeManager.on('command:cancelled', (data) => {
        console.log(`[Bridge] Command cancelled: ${data.commandId}, reason: ${data.error}`);
        // Try to find the terminal socket by sessionId
        // Note: The sessionId might be different from the socket ID, so we broadcast
        io.emit('terminal:data', {
          id: data.sessionId,
          data: `\r\n❌ ${data.error}\r\n`
        });
      });

      // ADDED (Dec 11, 2025): Handle claude:error events from bridge
      // Display clear error messages in terminal when commands fail
      bridgeManager.on('command:error', (data) => {
        console.log(`[Bridge] Command error: ${data.commandId}, error: ${data.error}`);
        // Find the terminal socket and send error message
        // 🔧 FIX (Dec 15, 2025): Use terminalSessionSockets map instead of socket ID lookup
        const terminalSocket = terminalSessionSockets.get(data.sessionId);
        if (terminalSocket) {
          terminalSocket.emit('terminal:data', {
            id: data.sessionId,
            data: `\r\n\x1b[31m❌ Error: ${data.error}\x1b[0m\r\n`
          });
        } else {
          // Fallback: broadcast to all sockets since no mapping found
          console.warn(`⚠️ No socket found for session ${data.sessionId} - broadcasting error`);
          io.emit('terminal:data', {
            id: data.sessionId,
            data: `\r\n\x1b[31m❌ Error: ${data.error}\x1b[0m\r\n`
          });
        }
      });

      // Forward bridge connection events to all Socket.IO clients
      // This enables the frontend to hide the "Connect Bridge" button when connected
      bridgeManager.on('bridge:connected', (data) => {
        console.log(`[Bridge] Connected: ${data.bridgeId} for user ${data.userId}`);
        io.emit('bridge:connected', data);
      });

      bridgeManager.on('bridge:disconnected', (data) => {
        console.log(`[Bridge] Disconnected: ${data.bridgeId} for user ${data.userId}`);
        io.emit('bridge:disconnected', data);
      });

      console.log(`✅ Coder1 Bridge registered: ${bridgeId}`);
    });
    
    // Make bridge manager globally available for API routes
    global.bridgeManager = bridgeManager;
    console.log('🌉 Coder1 Bridge Manager initialized');
    
  } catch (error) {
    console.error('❌ CRITICAL: Bridge Manager failed to initialize');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    console.error('   This means the /bridge namespace was NOT created!');
    console.error('   Bridge clients will receive "Invalid namespace" error');
    console.error('   Check that TypeScript runtime (tsx) is loaded correctly');
    bridgeManager = null;
  }

  // Make Socket.IO server available globally for Express routes compatibility
  global.io = io;
  
  // Simple global bridge for emitting events from API routes to Socket.IO
  // Bypasses the complex WebSocketEventBridge that has import issues
  global.emitBridgeEvent = (eventName, data) => {
    try {
      io.emit(eventName, data);
      console.log(`🔗 [BRIDGE] Emitted ${eventName} to all Socket.IO clients:`, data.teamId || 'unknown');
    } catch (error) {
      console.error(`❌ [BRIDGE] Failed to emit ${eventName}:`, error);
    }
  };

  // Forward Moltbot events to Socket.IO clients for Johnny5 dashboard
  // NOTE: Set up event listeners BEFORE calling connect() to avoid race conditions
  if (moltbotBridge) {
    moltbotBridge.on('message', (data) => {
      if (io && data.sessionId) {
        io.to(`johnny5:${data.sessionId}`).emit('johnny5:message', data);
      }
    });

    moltbotBridge.on('session-update', (session) => {
      if (io) {
        io.emit('johnny5:session-update', session);
      }
    });

    moltbotBridge.on('connected', () => {
      console.log('🎉 [MoltbotBridge] Connected event received, emitting to Socket.IO');
      if (io) {
        io.emit('johnny5:moltbot-connected');
      }
    });

    moltbotBridge.on('disconnected', (reason) => {
      console.log('⚠️ [MoltbotBridge] Disconnected event received:', reason);
      if (io) {
        io.emit('johnny5:moltbot-disconnected', { reason });
      }
    });

    console.log('🔗 Moltbot event forwarding configured');
  }

  // Connect to Moltbot if enabled (Johnny5 autonomous agent)
  // NOTE: This MUST come AFTER setting up event listeners above
  if (moltbotBridge && process.env.MOLTBOT_ENABLED === 'true' && process.env.MOLTBOT_GATEWAY_URL) {
    // Ensure ManusLive daemon is running before connecting
    ensureManusLiveRunning().then((result) => {
      if (!result.success) {
        console.warn(`⚠️ ManusLive unavailable: ${result.error}`);
        console.warn('   Johnny5 will use Bridge or Gemini fallback');
        // Don't try to connect if ManusLive failed to start
        return;
      }

      // Connect to Moltbot Gateway
      console.log('🤖 Initializing Moltbot connection...');
      try {
        moltbotBridge.connect(process.env.MOLTBOT_GATEWAY_URL)
          .then(() => console.log('✅ Connected to Moltbot Gateway'))
          .catch(err => console.warn('⚠️ Moltbot connection failed (will retry):', err.message));
      } catch (err) {
        console.warn('⚠️ Moltbot connection error:', err.message);
      }
    });
  }

  // Event Bridge Note: Event forwarding handled directly in claude-code-bridge.js
  // The bridge service emits directly to global.io when available
  // This avoids TypeScript module import issues in server.js
  
  // Socket.IO connection handling
  io.on('connection', (socket) => {
    // Comprehensive connection logging for debugging
    console.log(`🔌 PRODUCTION SOCKET CONNECTED: ${socket.id}`);
    console.log('  Transport:', socket.conn.transport.name);
    console.log('  Remote IP:', socket.handshake.address);
    console.log('  User-Agent:', socket.handshake.headers['user-agent']);
    console.log('  PTY Compatible:', ptyCompatible);
    
    // Test echo to verify bidirectional communication
    socket.emit('test:echo', { time: Date.now() });
    socket.on('test:echo:response', (data) => {
      console.log('✅ Socket bidirectional test passed:', data);
    });
    
    // ADDED: Client heartbeat keepalive handler - prevents idle disconnects
    socket.on('ping', (data) => {
      const now = Date.now();
      const latency = now - (data?.timestamp || now);
      console.log(`💓 Heartbeat ping received from ${socket.id} (latency: ${latency}ms)`);

      // Respond with pong including original timestamp for RTT calculation
      socket.emit('pong', {
        timestamp: data?.timestamp || now,
        serverTime: now
      });
    });

    // Johnny5 command execution audit logging
    socket.on('johnny5:audit-command', async (data) => {
      try {
        const { logAudit } = require('./lib/johnny5-db.ts');
        await logAudit('command_executed', {
          sessionId: data.sessionId,
          command: data.command,
          output: data.output,
          timedOut: data.timedOut,
          truncated: data.truncated,
          durationMs: data.durationMs,
        });
        console.log(`[Johnny5] Audit logged: ${data.command} (${data.durationMs}ms)`);
      } catch (err) {
        console.warn('[Johnny5] Failed to log command audit:', err.message);
      }
    });

    // Team presence: join
    socket.on('team:presence:join', ({ teamId, userId, username }) => {
      if (!teamId || !userId) return;
      socket.join(`team:${teamId}`);
      if (!teamPresence.has(teamId)) teamPresence.set(teamId, new Map());
      const members = teamPresence.get(teamId);
      socket._teamPresence = { teamId, userId, username };
      if (!members.has(userId)) {
        members.set(userId, { userId, username, sockets: new Set() });
      }
      members.get(userId).sockets.add(socket.id);
      broadcastPresence(teamId);

      // Map terminal sessions to team for code activity tracking
      // Use the socketToSession map to find this socket's terminal session
      if (socketToSession) {
        const termSessionId = socketToSession.get(socket.id);
        if (termSessionId) {
          sessionTeamMapping.set(termSessionId, { teamId, userId, username });
        }
      }
    });

    // Team presence: leave
    socket.on('team:presence:leave', ({ teamId, userId }) => {
      const members = teamPresence.get(teamId);
      if (members && members.has(userId)) {
        const entry = members.get(userId);
        entry.sockets.delete(socket.id);
        if (entry.sockets.size === 0) members.delete(userId);
      }
      socket.leave(`team:${teamId}`);
      broadcastPresence(teamId);
    });

    // Team presence: request current state
    socket.on('team:presence:request', ({ teamId }) => {
      const members = teamPresence.get(teamId);
      const onlineList = members
        ? Array.from(members.values()).map(m => ({ userId: m.userId, username: m.username }))
        : [];
      socket.emit('team:presence:update', { teamId, online: onlineList });
    });

    // ===============================================
    // COLLABORATIVE EDITING (Yjs)
    // ===============================================

    // Per-socket rate limiting for collab events
    const collabRateEntry = { count: 0, resetTime: Date.now() + 60000 };

    function checkCollabRate(limit = 300) {
      const now = Date.now();
      if (now > collabRateEntry.resetTime) {
        collabRateEntry.count = 1;
        collabRateEntry.resetTime = now + 60000;
        return true;
      }
      if (++collabRateEntry.count > limit) {
        socket.emit('collab:error', { code: 429, message: 'Too many events' });
        return false;
      }
      return true;
    }

    function validateCollabAuth(teamId) {
      // In development, allow if user has team presence set
      if (!socket._teamPresence) {
        socket.emit('collab:error', { code: 401, message: 'Join a team first' });
        return false;
      }
      // Verify claimed teamId matches socket's team
      if (socket._teamPresence.teamId !== teamId) {
        socket.emit('collab:error', { code: 403, message: 'Team mismatch' });
        return false;
      }
      // Verify user is actually in the team presence map
      const members = teamPresence.get(teamId);
      if (!members || !members.has(socket._teamPresence.userId)) {
        socket.emit('collab:error', { code: 403, message: 'Not a team member' });
        return false;
      }
      return true;
    }

    // Join a collaborative editing room for a file
    socket.on('collab:join', ({ fileId, teamId }) => {
      if (!checkCollabRate()) return;
      if (!fileId) return;
      // Allow joining without team for single-user editing (no auth required)
      if (teamId && !validateCollabAuth(teamId)) return;

      const room = `collab:${fileId}`;
      socket.join(room);
      socket._collabSession = { fileId, teamId };

      if (!collabDocs.has(fileId)) {
        collabDocs.set(fileId, { updates: [], userCount: 0, lastActivity: Date.now(), cleanupTimer: null });
      }
      const doc = collabDocs.get(fileId);
      doc.userCount++;
      doc.lastActivity = Date.now();

      // Clear any pending cleanup timer
      if (doc.cleanupTimer) {
        clearTimeout(doc.cleanupTimer);
        doc.cleanupTimer = null;
      }

      // Send existing updates to late joiner
      if (doc.updates.length > 0) {
        socket.emit('y:sync-response', { fileId, updates: doc.updates });
      }

      // Notify room
      const userId = socket._teamPresence?.userId || socket.id;
      const userName = socket._teamPresence?.username || 'Anonymous';
      socket.to(room).emit('collab:user-joined', { userId, userName });

      console.log(`[COLLAB] ${userId} joined ${room} (${doc.userCount} users)`);
    });

    // Leave a collaborative editing room
    socket.on('collab:leave', ({ fileId }) => {
      if (!socket._collabSession || socket._collabSession.fileId !== fileId) return;

      const room = `collab:${fileId}`;
      socket.leave(room);

      if (collabDocs.has(fileId)) {
        const doc = collabDocs.get(fileId);
        doc.userCount = Math.max(0, doc.userCount - 1);

        // Schedule cleanup if room is empty
        if (doc.userCount <= 0 && !doc.cleanupTimer) {
          doc.cleanupTimer = setTimeout(() => {
            const current = collabDocs.get(fileId);
            if (current && current.userCount <= 0) {
              collabDocs.delete(fileId);
              console.log(`[COLLAB] Cleaned up empty doc: ${fileId}`);
            }
          }, 5 * 60 * 1000); // 5 min cleanup delay
        }
      }

      const userId = socket._teamPresence?.userId || socket.id;
      socket.to(room).emit('collab:user-left', { userId });
      socket._collabSession = null;
    });

    // Yjs document update relay
    socket.on('y:update', ({ fileId, update }) => {
      if (!checkCollabRate()) return;
      if (!socket._collabSession || socket._collabSession.fileId !== fileId) return;

      // Size guard
      if (update && update.length > 512 * 1024) {
        socket.emit('collab:error', { code: 413, message: 'Update too large' });
        return;
      }

      // Broadcast to room (excluding sender)
      socket.to(`collab:${fileId}`).emit('y:update', {
        update,
        senderId: socket.id,
        timestamp: Date.now(),
      });

      // Store for late joiners
      if (collabDocs.has(fileId)) {
        const doc = collabDocs.get(fileId);
        doc.updates.push(update);
        doc.lastActivity = Date.now();

        // Prune stored updates to prevent unbounded growth
        if (doc.updates.length > 200) {
          // Keep only the last 100 updates (simple pruning without Y.mergeUpdates on server)
          doc.updates = doc.updates.slice(-100);
        }
      }
    });

    // Yjs awareness relay (cursor positions, selections)
    socket.on('y:awareness', ({ fileId, state }) => {
      if (!checkCollabRate(600)) return; // Higher limit for awareness
      if (!socket._collabSession || socket._collabSession.fileId !== fileId) return;

      socket.to(`collab:${fileId}`).emit('y:awareness', {
        clientId: socket.id,
        userId: socket._teamPresence?.userId || socket.id,
        userName: socket._teamPresence?.username || 'Anonymous',
        state,
        timestamp: Date.now(),
      });
    });

    // Sync request (for reconnecting clients)
    socket.on('y:sync-request', ({ fileId }) => {
      if (!socket._collabSession) return;
      if (collabDocs.has(fileId)) {
        socket.emit('y:sync-response', {
          fileId,
          updates: collabDocs.get(fileId).updates,
        });
      } else {
        // No stored state — signal synced with empty updates
        socket.emit('y:sync-response', { fileId, updates: [] });
      }
    });

    let currentSessionId = null;

    // Handle terminal creation
    socket.on('terminal:create', async (data) => {
      // Extract trace context from payload for distributed tracing
      const traceCtx = extractTraceFromPayload(data);
      const traceId = traceCtx?.traceId || generateServerTraceId();

      logWithTrace(traceId, 'info', '📟 TERMINAL CREATE REQUEST:', {
        sessionId: data?.id,
        transport: socket.conn.transport.name,
        socketId: socket.id,
        ptyCompatible,
        hasTrace: !!traceCtx,
        timestamp: new Date().toISOString()
      });

      try {
        const { id, cols = 80, rows = 30, workingDirectory } = data || {};

        // 🔍 DEBUG: Log terminal:create event
        console.log('[TERMINAL-CREATE] Received terminal:create event');
        console.log('[TERMINAL-CREATE] Client provided id:', id || '(none - will auto-generate)');
        console.log('[TERMINAL-CREATE] Current terminalSessions.size:', terminalSessions.size);
        console.log('[TERMINAL-CREATE] Existing sessions:', Array.from(terminalSessions.keys()));

        // Check memory before creating new session (environment-aware threshold)
        const memStats = memoryOptimizer.getMemoryUsage();
        const memoryThreshold = isDevelopment ? 3000 : 350; // Increased dev limit to 3GB for heavy local usage
        if (memStats.heapUsedMB > memoryThreshold) {
          socket.emit('terminal:error', { 
            message: 'System under memory pressure. Please try again in a moment.' 
          });
          return;
        }
        
        // Use passed session ID or create new one
        const sessionId = id || `session_${Date.now()}_${uuidv4().slice(0, 8)}`;
        console.log('[TERMINAL-CREATE] Using sessionId:', sessionId);

        let session;
        try {
          session = getOrCreateSession(sessionId, 'default', cols, rows);
          currentSessionId = sessionId;
          console.log(`[TERMINAL-CREATE] Session created/retrieved (${cols}x${rows}). terminalSessions.size:`, terminalSessions.size);
        } catch (error) {
          console.error(`[Terminal] Failed to create/get session ${sessionId}:`, error);
          socket.emit('terminal:error', {
            message: `Failed to create terminal session: ${error.message}`
          });
          return;
        }

        // 🔧 FIX (Dec 15, 2025): Store sessionId → socket mapping for bridge response routing
        // This allows bridgeManager to forward output to the correct terminal socket
        terminalSessionSockets.set(sessionId, socket);
        console.log(`📍 Mapped terminal session ${sessionId} → socket ${socket.id}`);

        // Register session with memory optimizer
        memoryOptimizer.registerSession(sessionId, {
          type: 'terminal',
          socketId: socket.id,
          createdAt: Date.now()
        });
        
        // Resize if needed
        session.resize(cols, rows);
        
        // PHASE 1 FIX: Initialize context session DISABLED for memory stability
        // - Auto-initializing context for every terminal session causes memory exhaustion
        // - Results in 1,673+ sessions created, causing server crashes (exit code 137)
        // PRESERVED: Original code for Phase 2 restoration:
        // await initializeContextSession(sessionId);
        
        // Set up data forwarding for this socket with context capture
        // Track connected sockets for this session
        if (!session.connectedSockets) {
          session.connectedSockets = new Set();
        }
        session.connectedSockets.add(socket);
        
        // 🔧 FIX (Oct 24, 2025): Cancel cleanup timer if reconnecting to existing session
        // This happens when navigating Timeline → IDE with same sessionId
        const hasCleanupTimer = sessionCleanupTimers.has(sessionId);
        if (hasCleanupTimer) {
          console.log(`♻️ Reconnected to session ${sessionId} - cancelling cleanup timer`);
          clearTimeout(sessionCleanupTimers.get(sessionId));
          sessionCleanupTimers.delete(sessionId);
        }
        
        // 🔧 FIX (Jan 31, 2026): Confirm terminal creation/connection to client
        // This is required to clear the client-side connection watchdog
        socket.emit('terminal:created', {
          sessionId,
          pid: session.pid
        });
        console.log(`✅ Emitted terminal:created for session ${sessionId} (PID: ${session.pid})`);

        // 🎯 CRITICAL FIX (Oct 28, 2025): Check for terminal history to detect reconnections
        // Don't rely on cleanup timer - it might have expired already!
        // Check if history exists in memory OR persistent file
        let terminalHistory = terminalHistoryBuffers.get(sessionId);
        let historyText = '';
        
        // 🔒 CRITICAL FIX (Oct 28, 2025): Try loading from persistent file if not in memory
        // This allows restoration even after PTY cleanup (grace period expired)
        if (!terminalHistory || terminalHistory.length === 0) {
          const fs = require('fs');
          const historyFile = path.join(__dirname, 'data', 'terminal-history', `${sessionId}.txt`);
          
          if (fs.existsSync(historyFile)) {
            historyText = fs.readFileSync(historyFile, 'utf8');
            console.log(`💾 Loaded terminal history from file: ${historyFile} (${historyText.length} chars)`);
            
            // Restore to memory buffer for future reconnections
            terminalHistory = [historyText];
            terminalHistoryBuffers.set(sessionId, terminalHistory);
          }
        } else {
          historyText = terminalHistory.join('');
        }
        
        // Send history if this is a reconnection (has history in memory or file)
        const isReconnection = historyText && historyText.length > 0;
        if (isReconnection) {
          console.log(`♻️ Reconnection detected - found ${historyText.length} chars of history`);
          console.log(`📜 Sending ${terminalHistory ? terminalHistory.length : 1} terminal history chunks to reconnecting client`);
          console.log(`📜 First 200 chars: ${historyText.substring(0, 200)}`);
          
          // 🚨 DIAGNOSTIC LOGGING - Server-Side Event Emission
          const emissionTimestamp = new Date().toISOString();
          console.log('═════════════════════════════════════════════════════════');
          console.log('📤 [SERVER] About to emit terminal:history');
          console.log(`⏰ Timestamp: ${emissionTimestamp}`);
          console.log(`🆔 Session ID: "${sessionId}"`);
          console.log(`🔌 Socket ID: "${socket.id}"`);
          console.log(`📦 Chunks to send: ${terminalHistory ? terminalHistory.length : 1}`);
          console.log(`📏 Total chars: ${historyText.length}`);
          console.log(`📝 First 100 chars: ${historyText.substring(0, 100)}`);
          console.log('═════════════════════════════════════════════════════════');
          
          // 🔧 CRITICAL FIX: Add 100ms delay to allow client listener to register
          // Race condition: Client emits terminal:create and immediately registers listener,
          // but Socket.IO's event loop might not have processed the registration yet.
          // This delay ensures the client's terminal:history listener is ready.
          // ⚡ PERFORMANCE FIX (Jan 31, 2026): Removed 100ms delay
          // The client now registers the listener BEFORE emitting terminal:create,
          // so the race condition is solved architecturally.
          // This allows the history to be sent immediately, beating the Chaos Proxy's 100ms kill timer.
          console.log('⚡ [SERVER] Emitting terminal:history immediately');
          
          // Send history via Socket.IO event
          socket.emit('terminal:history', { 
            id: sessionId, 
            history: historyText,
            chunkCount: terminalHistory ? terminalHistory.length : 1
          });
          
          console.log('✅ [SERVER] terminal:history emission completed');
        } else {
          console.log(`🆕 New session ${sessionId} - no history to restore`);
        }
        
        // Only set up PTY data handler once per session to avoid duplicates
        if (!session.dataHandlerSetup) {
          session.pty.onData((data) => {
            // Update session activity on output so viewing logs/dev servers counts as active
            session.lastActivity = new Date();
            
            // Track terminal output with token integration for Claude response monitoring
            if (terminalTokenIntegration) {
              terminalTokenIntegration.onTerminalOutput(sessionId, data);
            }
            
            // Forward to all connected sockets for this session
            session.connectedSockets.forEach(connectedSocket => {
              if (connectedSocket.connected) {
                connectedSocket.emit('terminal:data', { id: sessionId, data });
              }
            });
            
            // 🎯 CRITICAL FIX (Oct 28, 2025): Buffer ALL terminal output for history restoration
            // Keep ANSI codes for proper rendering, only filter problematic focus codes
            // IMPORTANT: Check for ANSI escape sequences \x1b[I and \x1b[O, not just [I and [O
            const hasFocusCodes = data.includes('\x1b[I') || data.includes('\x1b[O');
            if (!hasFocusCodes) {
              // Buffer for terminal history (keeps ANSI codes for colors/formatting)
              if (!terminalHistoryBuffers.has(sessionId)) {
                terminalHistoryBuffers.set(sessionId, []);
              }
              const historyBuffer = terminalHistoryBuffers.get(sessionId);
              historyBuffer.push(data);
              
              // Keep last 200 chunks (~50KB typical)
              if (historyBuffer.length > 200) {
                historyBuffer.splice(0, historyBuffer.length - 200);
              }
            } else {
              // Log when we filter focus codes
              if (data.length < 100) {
                console.log(`🔍 [SERVER-HISTORY] Filtered focus code from history buffer: "${data.substring(0, 50)}"`);
              }
            }
            
            // 🔒 Buffer terminal output for context capture with ANSI filtering (Oct 24, 2025)
            // CRITICAL: Only filter focus codes ([I], [O]), keep other ANSI codes for Claude conversations
            // Claude Code output needs ANSI codes for proper rendering and history restoration
            // IMPORTANT: Check for ANSI escape sequences \x1b[I and \x1b[O, not just [I and [O
            const hasFocusCodesOnly = data.includes('\x1b[I') || data.includes('\x1b[O');
            if (!hasFocusCodesOnly) {
              bufferTerminalData(sessionId, 'terminal_output', data);
            } else {
              // Log filtered focus codes for debugging
              if (data.length < 50) {
                console.log(`🔍 [SERVER-CONTEXT] Blocked focus code from context capture: "${data}"`);
              }
            }

            // Git event detection for team code awareness
            const gitEvents = detectGitEvent(sessionId, data);
            if (gitEvents.length > 0 && sessionTeamMapping.has(sessionId)) {
              const { teamId, userId, username } = sessionTeamMapping.get(sessionId);
              for (const event of gitEvents) {
                const fullEvent = {
                  ...event,
                  userId,
                  username,
                  timestamp: new Date().toISOString(),
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                };

                // Buffer
                if (!teamActivityBuffers.has(teamId)) teamActivityBuffers.set(teamId, []);
                const buffer = teamActivityBuffers.get(teamId);
                buffer.push(fullEvent);
                if (buffer.length > MAX_ACTIVITY_BUFFER) buffer.splice(0, buffer.length - MAX_ACTIVITY_BUFFER);

                // Broadcast to team room
                io.to(`team:${teamId}`).emit('team:codeEvent', fullEvent);
              }
            }

            // Time Capsule: Detect commits during active Claude sessions
            if (process.env.NEXT_PUBLIC_TIME_CAPSULES === 'true' && gitEvents.length > 0) {
              const claudeSession = claudeCodeSessions.get(sessionId);
              if (claudeSession && claudeSession.inClaudeSession) {
                for (const event of gitEvents) {
                  if (event.type === 'commit') {
                    const duration = claudeSession.sessionStartTime
                      ? Date.now() - claudeSession.sessionStartTime.getTime()
                      : 0;
                    const session = terminalSessions.get(sessionId);
                    socket.emit('time_capsule:commit_detected', {
                      sessionId,
                      sha: event.sha,
                      branch: event.branch,
                      message: event.message,
                      claudeSessionStart: claudeSession.sessionStartTime,
                      duration,
                      repoPath: session?.workingDir || process.cwd(),
                    });
                    console.log(`[Time Capsule] Commit detected during Claude session: ${event.sha}`);
                  }
                }
              }
            }
          });
          session.dataHandlerSetup = true;
        }

        // Time Capsule: Forward create request to bridge for git storage
        if (process.env.NEXT_PUBLIC_TIME_CAPSULES === 'true') {
          socket.on('time_capsule:create', (data) => {
            const bridge = bridgeManager?.findAnyConnectedBridge?.();
            if (bridge?.socket?.connected) {
              bridge.socket.emit('time_capsule:create', data);
              console.log(`[Time Capsule] Forwarded to bridge for git storage: ${data.commitSha}`);
            } else {
              console.log(`[Time Capsule] No bridge connected, capsule saved to DB only`);
            }
          });
        }

        // Clean up socket reference when it disconnects
        socket.on('disconnect', () => {
          // 🔧 FIX (Oct 24, 2025): Use sessionId from closure (always available)
          // socketToSession.get() can return undefined if socket wasn't properly registered
          const disconnectSessionId = sessionId; // Use closure variable (guaranteed to exist)

          // 🔧 FIX (Dec 15, 2025): Clean up sessionId → socket mapping
          terminalSessionSockets.delete(disconnectSessionId);
          console.log(`📍 Removed terminal session mapping: ${disconnectSessionId}`);

          if (session.connectedSockets) {
            session.connectedSockets.delete(socket);
            
            // 🔧 FIX (Oct 24, 2025): Grace period before killing PTY
            // Allows Timeline ↔ IDE navigation (2-3s) while cleaning up actual close/refresh (30s)
            if (session.connectedSockets.size === 0) {
              console.log(`⏱️ Last socket disconnected for session ${disconnectSessionId} - starting 30s grace period`);
              
              // Start cleanup timer (30 seconds)
              const cleanupTimer = setTimeout(() => {
                // Kill PTY only if still no connections after grace period
                if (session.connectedSockets && session.connectedSockets.size === 0) {
                  console.log(`🎯 Grace period expired for session ${disconnectSessionId} - killing PTY`);
                  try {
                    // 🔒 CRITICAL FIX (Oct 28, 2025): Save terminal history to file BEFORE cleanup
                    // This allows restoration even after PTY is killed and memory buffer is cleared
                    if (terminalHistoryBuffers.has(disconnectSessionId)) {
                      const historyBuffer = terminalHistoryBuffers.get(disconnectSessionId);
                      const historyText = historyBuffer.join('');
                      
                      // Save to data/terminal-history/ directory
                      const fs = require('fs');
                      const historyDir = path.join(__dirname, 'data', 'terminal-history');
                      if (!fs.existsSync(historyDir)) {
                        fs.mkdirSync(historyDir, { recursive: true });
                      }
                      
                      const historyFile = path.join(historyDir, `${disconnectSessionId}.txt`);
                      fs.writeFileSync(historyFile, historyText, 'utf8');
                      console.log(`💾 Saved terminal history to file: ${historyFile} (${historyText.length} chars)`);
                      
                      // Now clean up memory buffer
                      terminalHistoryBuffers.delete(disconnectSessionId);
                      console.log(`🗑️ Cleaned up history buffer from memory for session ${disconnectSessionId}`);
                    }
                    
                    session.pty.kill();
                    terminalSessions.delete(disconnectSessionId);
                    sessionCleanupTimers.delete(disconnectSessionId);
                    
                    console.log(`✅ PTY killed and session cleaned up: ${disconnectSessionId}`);
                  } catch (error) {
                    console.error(`❌ Error killing PTY for session ${disconnectSessionId}:`, error);
                  }
                } else {
                  console.log(`♻️ Session ${disconnectSessionId} reconnected during grace period - cleanup cancelled`);
                  sessionCleanupTimers.delete(disconnectSessionId);
                }
              }, 300000); // 5 minute grace period (enough for Timeline browsing and testing)
              
              sessionCleanupTimers.set(disconnectSessionId, cleanupTimer);
            }
          }
          
          // Clean up command buffer for this session
          if (disconnectSessionId && commandBuffers.has(disconnectSessionId)) {
            commandBuffers.delete(disconnectSessionId);
            if (process.env.NODE_ENV === 'production') {
              console.log(`[Memory] Cleaned up command buffer for session: ${disconnectSessionId}`);
            }
          }
          
          // End session in token integration for usage tracking
          if (terminalTokenIntegration && disconnectSessionId) {
            terminalTokenIntegration.endSession(disconnectSessionId);
          }
          
          // Clean up socket-to-session mapping
          socketToSession.delete(socket.id);
        });
        
        // Track socket-to-session relationship for cleanup
        socketToSession.set(socket.id, sessionId);
        
        // Register session with token integration for usage tracking
        if (terminalTokenIntegration) {
          terminalTokenIntegration.registerSession(sessionId, sessionId);
        }
        
        socket.emit('terminal:created', { 
          id: sessionId,  // Client expects 'id', not 'sessionId'
          sessionId,      // Keep for backwards compatibility
          pid: session.pty.pid 
        });
        
        // REMOVED: // REMOVED: // REMOVED: console.log(`[Terminal] Session created for socket ${socket.id}: ${sessionId}`);
      } catch (error) {
        console.error('[Terminal] Error creating session:', error);
        socket.emit('terminal:error', { 
          message: error.message || 'Failed to create terminal session' 
        });
      }
    });
    
    /**
     * Intercepts claude commands and injects --model flag and --dangerously-skip-permissions
     * @param {string} command - The command string (e.g., "claude fix bug")
     * @param {string} selectedModel - Model ID from useModelStore
     * @param {boolean} skipPermissions - Whether to inject --dangerously-skip-permissions flag
     * @returns {string} Modified command with flags injected (or original if not applicable)
     */
    function interceptClaudeCommand(command, selectedModel, skipPermissions = false) {
      // 0. Strip ANSI escape codes (arrow keys, etc.) before checking
      // eslint-disable-next-line no-control-regex
      const cleanCommand = command ? command.replace(/\x1b\[[^m]*m?/g, '').replace(/\[[A-Z]/g, '') : '';
      
      // 1. Check if command starts with 'claude'
      if (!cleanCommand || !cleanCommand.trim().startsWith('claude')) {
        return command;  // Not a claude command
      }
      
      // 2. Check if --model flag already exists
      if (cleanCommand.includes('--model')) {
        return command;  // Already has model flag - don't duplicate
      }
      
      // 3. Map our internal model IDs to Claude CLI aliases
      // Claude CLI accepts simple aliases: 'sonnet', 'opus', 'haiku'
      // IMPORTANT: GLM models should NOT get --model flag (Z.AI backend handles routing)
      
      console.log(`🔍 interceptClaudeCommand: selectedModel="${selectedModel}", command="${cleanCommand.trim()}"`);
      
      if (selectedModel && selectedModel.startsWith('glm-')) {
        console.log(`✅ GLM model detected (${selectedModel}) - skipping model injection (using Z.AI backend)`);
        return command;  // Don't inject model flag for GLM - let Z.AI backend handle it
      }
      
      let modelAlias = 'sonnet';  // Default to sonnet
      
      if (selectedModel) {
        // 🔧 FIX (Oct 24, 2025): Use full model ID for Sonnet 4.5
        // Claude CLI's 'sonnet' alias defaults to Sonnet 4, not 4.5
        // Must use exact model ID to get correct version
        if (selectedModel.includes('sonnet-4-5') || selectedModel.includes('4.5')) {
          modelAlias = 'claude-sonnet-4-5-20250929';  // Use exact model ID
          console.log(`✅ Detected Sonnet 4.5, using full model ID: ${modelAlias}`);
        } else if (selectedModel.includes('haiku')) {
          modelAlias = 'haiku';
        } else if (selectedModel.includes('opus')) {
          modelAlias = 'opus';
        } else if (selectedModel.includes('sonnet')) {
          modelAlias = 'sonnet';  // Generic sonnet (will default to Sonnet 4)
        }
      }
      
      // 4. Extract: "claude" + args (use clean command without escape codes)
      // IMPORTANT: Command may already have eternal memory's --append-system-prompt flag
      const trimmedCommand = cleanCommand.trim();
      const parts = trimmedCommand.split(/\s+/);  // Split on whitespace
      const claudeCmd = parts[0];  // "claude"
      const restOfCommand = parts.slice(1).join(' ');  // Everything after "claude"
      
      // 5. Build injected command with flags
      // Flag order: claude --dangerously-skip-permissions --model X --append-system-prompt "..." query
      let flags = [];

      // Add skip permissions flag if enabled (must come before --model)
      if (skipPermissions) {
        // Check if flag already exists to prevent duplication
        if (!cleanCommand.includes('--dangerously-skip-permissions')) {
          flags.push('--dangerously-skip-permissions');
          console.log(`🔓 Skip permissions enabled - injecting flag`);
        }
      }

      // Add model flag
      flags.push(`--model ${modelAlias}`);

      const flagsStr = flags.join(' ');
      const injectedCommand = restOfCommand
        ? `${claudeCmd} ${flagsStr} ${restOfCommand}`
        : `${claudeCmd} ${flagsStr}`;

      console.log(`🎯 Command injection: "${trimmedCommand}" → "${injectedCommand}" (model: ${modelAlias}, skipPermissions: ${skipPermissions})`);
      return injectedCommand;
    }
    
    // 🧠 ETERNAL MEMORY: Helper function to inject context into claude commands
    // This works for BOTH local development and production
    async function injectEternalMemoryContext(command, sessionId, socket) {
      // Only process claude commands
      if (!command || !command.trim().toLowerCase().startsWith('claude')) {
        return command;
      }

      // NEW (Dec 10, 2025): Don't inject context for interactive commands
      // Interactive sessions: bare "claude", "claude chat", "claude --help"
      // These need to pass through UNMODIFIED so the bridge detects them as interactive
      // The bridge's needsInteractiveMode() only matches exact strings
      const trimmed = command.trim();
      const isInteractiveCommand =
        trimmed === 'claude' ||
        trimmed === 'claude chat' ||
        /^claude\s+--?h(elp)?$/.test(trimmed);

      if (isInteractiveCommand) {
        // For interactive sessions, show context message but don't modify command
        if (eternalMemoryLoader) {
          try {
            const eternalContext = await eternalMemoryLoader.loadLastSessionContext();
            if (eternalContext.hasContext) {
              const contextMessage = eternalMemoryLoader.createContextLoadedMessage(eternalContext);
              socket.emit('terminal:data', {
                id: sessionId,
                data: contextMessage
              });
            }
          } catch (error) {
            // Ignore errors for interactive sessions - don't break the flow
          }
        }
        console.log('[Eternal Memory] Interactive command detected - returning unmodified');
        return command;  // Return UNMODIFIED command for interactive sessions
      }

      if (!eternalMemoryLoader) {
        return command; // Eternal memory not enabled
      }
      
      try {
        const eternalContext = await eternalMemoryLoader.loadLastSessionContext();
        
        if (eternalContext.hasContext) {
          // SAFETY: Log context size before injection
          const contextSize = eternalContext.contextPrompt?.length || 0;
          const estimatedTokens = Math.ceil(contextSize / 4);
          console.log(`[Eternal Memory] Context size: ${contextSize} chars (~${estimatedTokens} tokens)`);
          
          // SAFETY: Skip if context is unreasonably large (>10K chars)
          if (contextSize > 10000) {
            console.error(`[Eternal Memory] Context too large (${contextSize} chars) - SKIPPING to prevent crash`);
            socket.emit('terminal:data', {
              id: sessionId,
              data: '\r\n⚠️  Previous session context too large - continuing without memory\r\n'
            });
            return command;
          }
          
          // Show user that context was loaded
          const contextMessage = eternalMemoryLoader.createContextLoadedMessage(eternalContext);
          socket.emit('terminal:data', {
            id: sessionId,
            data: contextMessage
          });
          
          // CORRECT METHOD: Inject context using --append-system-prompt flag
          const { injectContextIntoClaudeCommand } = require('./lib/eternal-memory-formatter.ts');
          const commandWithContext = injectContextIntoClaudeCommand(command, eternalContext.contextPrompt);
          
          console.log('[Eternal Memory] Context injected via --append-system-prompt flag');
          console.log(`[Eternal Memory] Final command: ${commandWithContext.substring(0, 150)}...`);
          return commandWithContext;
        } else if (eternalContext.error) {
          console.log(`[Eternal Memory] ${eternalContext.error}`);
        }
      } catch (error) {
        console.error('[Eternal Memory] Failed to load context:', error);
        // Continue without context - don't break the flow
      }
      
      return command; // Return original command if no context available
    }
    
    // Handle terminal input with Conductor command detection
    socket.on('terminal:input', async ({ id, data, selectedClaudeModel, skipPermissions }) => {
      // 🛡️ SANITIZATION (Feb 1, 2026): Filter focus events that corrupt simple CLI inputs
      // Tools like readline (used by bridge-cli) treat \x1b[I and \x1b[O as literal input
      // This causes "invalid code" errors when users click the terminal before typing
      if (data === '\x1b[I' || data === '\x1b[O') {
        return;
      }

      const sessionId = id || currentSessionId;
      
      // 🔍 DEBUG: Log session lookup
      console.log('[SESSION-LOOKUP] Received terminal:input');
      console.log('[SESSION-LOOKUP] sessionId:', sessionId);
      console.log('[SESSION-LOOKUP] terminalSessions.size:', terminalSessions.size);
      
      // Conductor slash commands removed - multi-Claude tabs handle this differently
      
      const session = terminalSessions.get(sessionId);
      console.log('[SESSION-LOOKUP] session found:', !!session);

      // 🎭 INTERACTIVE CLAUDE SESSION CHECK (Dec 10, 2025)
      // If there's an active interactive Claude session, route ALL input to the bridge
      // This enables the Claude welcome screen and interactive conversation
      const interactiveSession = interactiveClaudeSessions.get(sessionId);
      if (interactiveSession && bridgeManager) {
        console.log(`[INTERACTIVE] Routing input to Claude PTY session: ${interactiveSession.commandId}`);

        // Find the bridge socket
        const bridge = bridgeManager.getBridge?.(interactiveSession.bridgeId);
        if (bridge?.socket?.connected) {
          // Route input directly to the interactive Claude session via bridge
          bridge.socket.emit('claude:input', {
            sessionId,
            commandId: interactiveSession.commandId,
            input: data
          });
          return; // Don't send to local PTY
        } else {
          console.warn('[INTERACTIVE] Bridge socket disconnected, cleaning up stale session');
          interactiveClaudeSessions.delete(sessionId);
          // Fall through to normal PTY processing
        }
      }

      if (session) {
        // 🔧 FIX (Nov 19, 2025): Buffer ALL input immediately for AI Team extraction
        // CRITICAL: Multi-line pastes (like test prompts) were being lost because
        // only "completed commands" were buffered (line 1708). This caused AI Team
        // quality gate to find empty buffer and block spawning with score: 0.
        // NOW: Buffer every keystroke and paste chunk so terminal history is complete.
        
        // 🔍 DEBUG: Log EVERY input event to trace why buffering doesn't execute
        console.log('[BUFFER-TRACE] terminal:input event received');
        console.log('[BUFFER-TRACE] sessionId:', sessionId);
        console.log('[BUFFER-TRACE] data length:', data?.length);
        console.log('[BUFFER-TRACE] data preview:', JSON.stringify(data?.substring(0, 50)));
        
        if (data && data.length > 0) {
          // Strip ANSI codes and bracketed paste markers for clean storage
          const cleanData = data
            .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '') // ANSI escape sequences
            .replace(/\x1b\[[0-9;]*~/g, '')        // CSI sequences with tilde
            .replace(/\x1b\[200~/g, '')            // Bracketed paste start (ESC[200~)
            .replace(/\x1b\[201~/g, '')            // Bracketed paste end (ESC[201~)
            .replace(/\[200~/g, '')                // Bracketed paste start (bare)
            .replace(/\[201~/g, '');               // Bracketed paste end (bare)
          
          // Filter out pure control characters (but keep Enter, which becomes part of text)
          const isNotJustControlChars = cleanData.replace(/[\r\n]/g, '').length > 0;
          const isNotFocusCode = !data.includes('\x1b[I') && !data.includes('\x1b[O');
          
          // 🔍 DEBUG: Log what we're filtering
          if (cleanData.length > 5 && !cleanData.includes('\x1b')) {
            console.log('[BUFFER-DEBUG] Raw data length:', data.length, 'Clean:', cleanData.substring(0, 80));
            console.log('[BUFFER-DEBUG] Filters - notJustControl:', isNotJustControlChars, 'notFocus:', isNotFocusCode);
          }
          
          if (isNotJustControlChars && isNotFocusCode) {
            bufferTerminalData(sessionId, 'terminal_input', cleanData);
            if (cleanData.length > 10) {
              console.log('[BUFFER-DEBUG] ✅ Buffered as terminal_input:', cleanData.substring(0, 80));
            }
          }
        }
        
        // Build up command buffer BEFORE writing to terminal
        if (!commandBuffers.has(sessionId)) {
          commandBuffers.set(sessionId, '');
        }
        
        let buffer = commandBuffers.get(sessionId);
        
        // Check if Enter is being pressed (command complete)
        if (data.includes('\r') || data.includes('\n')) {
          // If data includes the command and enter (like "/design\r"), extract the command
          let command = buffer.trim();
          if (command === '' && data.length > 1) {
            // Command came with Enter in single input, extract it
            command = data.replace(/[\r\n]/g, '').trim();
          }
          const commandLower = command.toLowerCase();
          console.log('[Terminal] Command completed:', commandLower);
          
          // 🔧 FIX (Nov 17, 2025): Add completed command to buffer for AI Team extraction
          // terminalDataBuffers was only capturing individual keystrokes (\r), not assembled commands
          // This ensures requirement extraction sees the full user input for AI Team spawning
          bufferTerminalData(sessionId, 'terminal_input', commandLower);
          
          // 🚀 Claude Code session detection and management
          if (detectClaudeCodeSessionStart(command)) {
            startClaudeCodeSession(sessionId);
          } else if (detectClaudeCodeSessionEnd(command)) {
            endClaudeCodeSession(sessionId);
          }
          
          // Track command with token integration for Claude usage monitoring
          if (terminalTokenIntegration && command.length > 0) {
            terminalTokenIntegration.onCommandInput(sessionId, command);
          }
          
          // 🔇 DISABLED (Feb 1, 2025): Server-side contextual memory triggering
          // This was causing typing lag after 3+ questions due to API spam
          // Frontend already handles contextual memory with proper 2-second debounce
          // Root cause: Server sending commands every 3s + frontend debounce = overlapping API calls
          /*
          if (command.length > 0 && !commandLower.startsWith('$') && !commandLower.startsWith('#')) {
            // Clear existing timer for this session
            if (memoryDebounceTimers.has(sessionId)) {
              clearTimeout(memoryDebounceTimers.get(sessionId));
              console.log('⏱️ [SERVER] Clearing previous memory debounce timer for session:', sessionId);
            }
            
            console.log('⏱️ [SERVER] Scheduling memory update (3s delay) for command:', commandLower);
            
            // Set new timer - only emit after 3 seconds of inactivity
            const timer = setTimeout(() => {
              console.log('🧠 [SERVER] Debounce complete - sending command to frontend for contextual memory:', commandLower);
              session.connectedSockets.forEach(connectedSocket => {
                if (connectedSocket.connected) {
                  connectedSocket.emit('terminal:command', { 
                    id: sessionId, 
                    command: commandLower 
                  });
                }
              });
              memoryDebounceTimers.delete(sessionId);
            }, 3000); // 3 second delay
            
            memoryDebounceTimers.set(sessionId, timer);
          }
          */
          
          // ALWAYS intercept claude commands, even if bridgeManager fails to load
          // This prevents "claude: command not found" errors on the server
          // FIXED (Dec 10, 2025): Removed NODE_ENV check entirely - it broke production!
          // Now routes to bridge whenever bridge is connected, regardless of environment
          // Local development with bridge connected will route through bridge
          // Local development without bridge will show help message

          if (command === 'claude' || command.startsWith('claude ')) {
            // FIXED (Dec 16, 2025): Removed NODE_ENV check that was bypassing bridge in development
            // The Dec 10, 2025 fix documented in comments above was never actually applied to code
            // Now properly routes through bridge when connected, shows help when not
            // Environment does NOT matter - only bridge availability matters
            console.log('[Terminal] Claude command intercepted, bridgeManager:', !!bridgeManager);

            // Check if bridgeManager exists and if a bridge is connected
            if (!bridgeManager) {
              console.log('[Terminal] BridgeManager not available - showing help message');
              // Jump straight to help message
            } else {
              // Get user ID from socket or session (simplified for now)
              const userId = session.userId || 'default';
              let bridgeStatus = bridgeManager.getBridgeStatus?.(userId);

              // ALPHA FIX (Dec 3, 2025): If no bridge for this userId, try to find ANY connected bridge
              // This is needed because terminal sessions have userId='default' but bridges register with JWT userId
              if (!bridgeStatus?.connected && bridgeManager.findAnyConnectedBridge) {
                const anyBridge = bridgeManager.findAnyConnectedBridge();
                if (anyBridge) {
                  console.log(`[Terminal] Fallback: Using bridge ${anyBridge.id} (registered for user ${anyBridge.userId})`);
                  bridgeStatus = { connected: true, bridges: [anyBridge] };
                }
              }

              if (bridgeStatus?.connected) {
              // Bridge is connected! Route command through bridge
              console.log('[Terminal] Routing claude command through bridge');
              
              // Clear bash's input buffer
              const backspaces = '\b'.repeat(buffer.length);
              session.write(backspaces);
              
              // Clear the line visually
              socket.emit('terminal:data', {
                id: sessionId,
                data: '\r\x1b[K'
              });
              
              // Show command execution indicator
              socket.emit('terminal:data', {
                id: sessionId,
                data: `\r\n🤖 Executing: ${buffer.trim()}\r\n`
              });
              
              // 🧠 ETERNAL MEMORY: Inject previous session context (unified function)
              let commandToExecute = await injectEternalMemoryContext(buffer.trim(), sessionId, socket);
              
              // Execute command through bridge (with eternal memory context if available)
              // FIX (Jan 27, 2026): Get terminal dimensions from PTY for proper Claude Code rendering
              const terminalCols = session?.pty?.cols || 120;
              const terminalRows = session?.pty?.rows || 30;

              const commandRequest = {
                sessionId,
                commandId: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                command: commandToExecute, // May include eternal memory context
                context: {
                  // FIX (Feb 2026): Send '~' so bridge uses user's home dir, not Render's cwd
                  workingDirectory: '~',
                  currentFile: null,
                  selection: null,
                  selectedClaudeModel: selectedClaudeModel || 'claude-4-sonnet-20250510',
                  cols: terminalCols,
                  rows: terminalRows
                },
                timestamp: new Date()
              };
              
              // Track token usage for Claude commands
              (async () => {
                try {
                  const { tokenTracker } = require('./services/token-tracker');
                  await tokenTracker.trackCommand(buffer.trim(), sessionId);
                  console.log(`📊 Tracked tokens for command: ${buffer.trim().substring(0, 50)}...`);
                } catch (error) {
                  console.error('Failed to track tokens:', error);
                }
              })();
              
              // FIXED (Dec 10, 2025): Await command result before returning
              // This ensures we catch errors and provide immediate feedback
              try {
                const result = await bridgeManager.executeCommand(userId, commandRequest);
                if (!result.success) {
                  console.error(`[Bridge] Command execution failed for ${sessionId}:`, result.error);
                  socket.emit('terminal:data', {
                    id: sessionId,
                    data: `\r\n❌ Execution Error: ${result.error}\r\n`
                  });
                }
              } catch (error) {
                socket.emit('terminal:data', {
                  id: sessionId,
                  data: `\r\n❌ Bridge error: ${error.message}\r\n`
                });
              }

              // Clear command buffer and exit early
              commandBuffers.set(sessionId, '');
              return;
              }
            }

            // FIX (Jan 2026): Show specific error instead of generic help box
            // Differentiate between "no bridgeManager" and "no bridge connected"
            console.log('[Terminal] No bridge connected, showing actionable error');

            // CRITICAL: Clear bash's input buffer by sending backspaces
            const backspaces = '\b'.repeat(buffer.length);
            session.write(backspaces);

            // Clear the line visually in the terminal display
            socket.emit('terminal:data', {
              id: sessionId,
              data: '\r\x1b[K'
            });

            // Show specific actionable error
            const errorMessage = !bridgeManager
              ? '\r\n❌ Bridge system not initialized (server error).\r\n' +
                '   Please restart the Coder1 server and try again.\r\n\r\n'
              : '\r\n❌ No bridge connected.\r\n\r\n' +
                '   Your bridge CLI is not connected to this IDE session.\r\n' +
                '   Please check:\r\n' +
                '   1. Is coder1-bridge still running on your machine?\r\n' +
                '   2. Did the connection time out? (re-run: coder1-bridge start)\r\n' +
                '   3. Check the Status Bar for bridge connection status\r\n\r\n';

            socket.emit('terminal:data', {
              id: sessionId,
              data: errorMessage
            });

            // Show a clean prompt after the error message
            socket.emit('terminal:data', {
              id: sessionId,
              data: 'coder1:coder1-ide-next$ '
            });

            // Clear the command buffer and exit early
            commandBuffers.set(sessionId, '');
            return;
          }

          // Intercept slash commands before they reach the shell
          if (command.startsWith('/') && command.length > 1) {
            console.log('[Terminal] Slash command intercepted:', command);
            const slashCommand = command.substring(1).toLowerCase(); // Remove leading slash
            
            // Check if we're in a Claude Code session
            const inClaudeSession = isInClaudeCodeSession(sessionId);
            console.log(`[Terminal] In Claude Code session: ${inClaudeSession}`);
            
            if (inClaudeSession) {
              // 🚀 CLAUDE CODE SESSION: Route slash command as formatted prompt through bridge
              console.log('[Terminal] Routing slash command to Claude Code via bridge:', slashCommand);
              
              // Create Claude-formatted prompt for the slash command
              const claudePrompt = createClaudePromptForSlashCommand(slashCommand);
              
              // Clear bash's input buffer
              const backspaces = '\b'.repeat(buffer.length);
              session.write(backspaces);
              
              // Clear the line visually
              socket.emit('terminal:data', {
                id: sessionId,
                data: '\r\x1b[K'
              });
              
              // Show processing message
              socket.emit('terminal:data', {
                id: sessionId,
                data: `\r\n🎯 Processing /${slashCommand} command...\r\n`
              });
              
              // Route through bridge to Claude Code
              await routeSlashCommandToClaudeCode(sessionId, slashCommand, claudePrompt, socket, session);
              
              // Clear command buffer and exit early
              commandBuffers.set(sessionId, '');
              return;
            }
            
            // 🔧 BASH SESSION: Original slash command processing
            // Clear bash's input buffer
            const backspaces = '\b'.repeat(buffer.length);
            session.write(backspaces);
            
            // Clear the line visually
            socket.emit('terminal:data', {
              id: sessionId,
              data: '\r\x1b[K'
            });
            
            // Process slash command for bash session
            let response = '';
            let claudePrompt = null;
            
            // Map slash commands to Claude prompts or local actions
            switch(slashCommand) {
              // Feature Implementation
              case 'implement':
                claudePrompt = 'Help me implement a new feature. First, ask me what feature I want to build, then guide me through the implementation with architectural planning and best practices.';
                break;
              case 'design':
                claudePrompt = 'Help me with UI/UX design. Ask me what interface or component I need to design, then provide mockup suggestions and implementation guidance.';
                break;
              
              // Build & Test
              case 'build':
                claudePrompt = 'Help me with building and compilation. Analyze my project structure and provide the appropriate build commands, handle any build errors, and optimize the build process.';
                break;
              case 'test':
                claudePrompt = 'Generate comprehensive tests for my code. Analyze the current codebase and create unit tests, integration tests, and suggest testing strategies.';
                break;
              case 'deploy':
                claudePrompt = 'Guide me through deploying to production. Check my deployment configuration, suggest best practices, and help with any deployment issues.';
                break;
              case 'clean':
                response = 'Cleaning build files...\r\n';
                // Could add actual clean logic here
                socket.emit('terminal:data', {
                  id: sessionId, 
                  data: response + 'Build files cleaned successfully.\r\n'
                });
                break;
              
              // Code Analysis & Debugging
              case 'analyze':
                claudePrompt = 'Perform a deep analysis of my codebase. Review the architecture, identify potential issues, suggest improvements, and provide a comprehensive audit report.';
                break;
              case 'troubleshoot':
                claudePrompt = 'Help me debug a complex issue. Ask me about the problem, analyze error messages, review relevant code, and guide me to a solution.';
                break;
              case 'explain':
                claudePrompt = 'Explain this code in detail. I will show you code and you should provide clear explanations of what it does, how it works, and document it thoroughly.';
                break;
              
              // Quality Assurance
              case 'improve':
                claudePrompt = 'Analyze my code for optimization opportunities. Review performance, suggest refactoring, improve code quality, and modernize patterns.';
                break;
              case 'cleanup':
                claudePrompt = 'Help me clean up and standardize my code. Fix formatting issues, remove dead code, improve naming conventions, and ensure consistency.';
                break;
              
              // Project Management
              case 'document':
                claudePrompt = 'Generate comprehensive documentation for my project. Create README files, API documentation, inline comments, and user guides.';
                break;
              case 'git':
                claudePrompt = 'Help with Git workflow. Assist with commits, branching strategies, merge conflicts, and repository management.';
                break;
              case 'estimate':
                claudePrompt = 'Help me estimate this project. Analyze requirements, break down tasks, estimate time and resources, and create a project timeline.';
                break;
              case 'task':
                claudePrompt = 'Help me manage tasks and track progress. Create a task list, prioritize work, track dependencies, and monitor completion.';
                break;
              case 'index':
                claudePrompt = 'Index and analyze my codebase structure. Create a searchable index of functions, classes, dependencies, and provide codebase insights.';
                break;
              case 'load':
                claudePrompt = 'Load and analyze specific files or contexts. Help me understand code relationships and dependencies in my project.';
                break;
              case 'spawn':
                claudePrompt = 'Help me spawn a multi-agent task force. Coordinate multiple AI agents to work on different aspects of my project simultaneously.';
                break;
              
              // Git & Version Control
              case 'commit':
                claudePrompt = 'Help me create a git commit. Review my changes, suggest a clear commit message, and ensure proper git hygiene.';
                break;
              case 'push':
                claudePrompt = 'Help me push changes to the repository. Check for conflicts, review changes, and ensure safe deployment.';
                break;
              case 'pull':
                claudePrompt = 'Help me pull the latest changes. Handle merge conflicts, review incoming changes, and update my local repository safely.';
                break;
              
              // Development
              case 'help':
                response = `\r\n╔═══════════════════════════════════════════════════════════════════╗\r\n`;
                response += `║                    📚 Available Slash Commands                      ║\r\n`;
                response += `╠═══════════════════════════════════════════════════════════════════╣\r\n`;
                response += `║ Feature Implementation:                                             ║\r\n`;
                response += `║   /implement - Plan and implement new features                     ║\r\n`;
                response += `║   /design    - UI/UX design and mockups                           ║\r\n`;
                response += `║                                                                     ║\r\n`;
                response += `║ Build & Test:                                                      ║\r\n`;
                response += `║   /build     - Compilation and bundling                           ║\r\n`;
                response += `║   /test      - Generate and run tests                             ║\r\n`;
                response += `║   /deploy    - Deploy to production                               ║\r\n`;
                response += `║                                                                     ║\r\n`;
                response += `║ Code Analysis:                                                     ║\r\n`;
                response += `║   /analyze   - Deep codebase analysis                             ║\r\n`;
                response += `║   /troubleshoot - Debug complex issues                            ║\r\n`;
                response += `║   /explain   - Code explanation and docs                          ║\r\n`;
                response += `║                                                                     ║\r\n`;
                response += `║ Type 'claude' for AI assistance with any command                  ║\r\n`;
                response += `╚═══════════════════════════════════════════════════════════════════╝\r\n\r\n`;
                socket.emit('terminal:data', {
                  id: sessionId,
                  data: response
                });
                break;
                
              case 'clear':
                // Send clear screen sequence
                socket.emit('terminal:data', {
                  id: sessionId,
                  data: '\x1b[2J\x1b[H'
                });
                break;
                
              case 'status':
                response = '📊 Project Status: Active\r\n';
                response += `Session ID: ${sessionId}\r\n`;
                response += `Terminal: Connected ✓\r\n`;
                socket.emit('terminal:data', {
                  id: sessionId,
                  data: response
                });
                break;
                
              default:
                response = `❌ Unknown command: /${slashCommand}\r\n`;
                response += `Type /help to see available commands.\r\n`;
                socket.emit('terminal:data', {
                  id: sessionId,
                  data: response
                });
            }
            
            // If we have a Claude prompt, route it through the bridge
            if (claudePrompt) {
              console.log('[Terminal] Routing slash command to Claude:', slashCommand);
              
              // Check if bridge is available
              if (bridgeManager) {
                const userId = session.userId || 'default';
                let bridgeStatus = bridgeManager.getBridgeStatus?.(userId);

                // ALPHA FIX (Dec 3, 2025): Fallback to ANY connected bridge
                if (!bridgeStatus?.connected && bridgeManager.findAnyConnectedBridge) {
                  const anyBridge = bridgeManager.findAnyConnectedBridge();
                  if (anyBridge) {
                    bridgeStatus = { connected: true, bridges: [anyBridge] };
                  }
                }

                if (bridgeStatus?.connected) {
                  // Send to Claude through bridge
                  socket.emit('terminal:data', {
                    id: sessionId,
                    data: `\r\n🤖 Processing /${slashCommand} with Claude...\r\n`
                  });
                  
                  // Route through bridge
                  try {
                    const result = await bridgeManager.sendToClaude(userId, claudePrompt, {
                      sessionId,
                      command: slashCommand
                    });
                    
                    if (result && result.response) {
                      socket.emit('terminal:data', {
                        id: sessionId,
                        data: `\r\n${result.response}\r\n`
                      });
                    }
                  } catch (error) {
                    console.error('[Terminal] Bridge error:', error);
                    socket.emit('terminal:data', {
                      id: sessionId,
                      data: `\r\n❌ Error: Could not process command. Bridge error.\r\n`
                    });
                  }
                } else {
                  // Bridge not connected, show helpful message
                  socket.emit('terminal:data', {
                    id: sessionId,
                    data: `\r\n⚠️  Claude Bridge not connected.\r\n`
                  });
                  socket.emit('terminal:data', {
                    id: sessionId,
                    data: `To use /${slashCommand}, please:\r\n`
                  });
                  socket.emit('terminal:data', {
                    id: sessionId,
                    data: `1. Click "🌉 Connect Bridge" in the status bar\r\n`
                  });
                  socket.emit('terminal:data', {
                    id: sessionId,
                    data: `2. Follow the connection instructions\r\n\r\n`
                  });
                }
              } else {
                // No bridge manager available
                socket.emit('terminal:data', {
                  id: sessionId,
                  data: `\r\n💡 /${slashCommand}: ${claudePrompt.substring(0, 100)}...\r\n`
                });
                socket.emit('terminal:data', {
                  id: sessionId,
                  data: `\r\n(Claude integration pending - showing prompt preview)\r\n\r\n`
                });
              }
            }
            
            // Show prompt after response
            socket.emit('terminal:data', {
              id: sessionId,
              data: 'coder1:coder1-ide-next$ '
            });
            
            // Clear command buffer and exit early
            commandBuffers.set(sessionId, '');
            return;
          }
          
          // 🧠 SILENT CONTEXT INJECTION (Oct 27, 2025 FIX)
          // OLD BUG: Command replacement (backspace/clear/rewrite) broke WebSocket message channel
          // NEW FIX: Inject flags silently, let terminal echo handle display naturally
          let displayCommand = buffer.trim(); // What user typed
          let executionCommand = displayCommand; // What actually runs (with injected flags)
          let needsInjection = false;
          
          if (displayCommand.toLowerCase().startsWith('claude')) {
            console.log('🧠 [Eternal Memory] Detected claude command, injecting context silently...');
            needsInjection = true;
            
            // Inject eternal memory context into execution command (silent - user doesn't see this)
            executionCommand = await injectEternalMemoryContext(displayCommand, sessionId, socket);
            
            console.log('✅ [Eternal Memory] Context injected into execution command');
          }
          
          // 🎯 MODEL & FLAGS INJECTION: Add model flag and skip permissions to execution command (also silent)
          if (needsInjection) {
            executionCommand = interceptClaudeCommand(executionCommand, selectedClaudeModel, skipPermissions);
          }
          
          console.log(`🔍 [SILENT INJECTION] Display: "${displayCommand}"`);
          console.log(`🔍 [SILENT INJECTION] Execution: "${executionCommand}"`);
          
          // ✅ EXECUTE COMMAND
          // Eternal memory message already sent via Socket.IO in injectEternalMemoryContext()
          // For claude commands: clear PTY input buffer, then execute with flags
          try {
            if (needsInjection) {
              // CRITICAL: Clear PTY input buffer to prevent "claudeclaude" concatenation
              // User typed "claude" which is still in PTY buffer, must clear it first
              const backspaces = '\b'.repeat(buffer.length);
              session.write(backspaces);
              
              // Execute the FULL command with eternal memory + model flags
              // The full command will be visible (transparent to user which model/context is used)
              session.write(executionCommand + '\r');
              console.log(`✅ [CLAUDE-CMD] Executed with eternal memory injection`);
            } else {
              // Normal command execution
              session.write(data);
            }
          } catch (error) {
            console.error(`❌ [CLAUDE-CMD] Error executing command:`, error);
            console.error(`❌ [CLAUDE-CMD] Error stack:`, error.stack);
          }
          
          // Clear buffer after command
          commandBuffers.set(sessionId, '');
        }
        
        // 🔧 FIX (Oct 24, 2025): ANSI filter - MUST be outside if/else for proper scope
        // Filter ANSI escape codes from both command buffer and context capture
        // ⚠️ CRITICAL: Do NOT filter bracketed paste mode ([200~...[201~)
        const isBracketedPaste = data.includes('[200~') || data.includes('[201~');
        const isAnsiEscapeCode = !isBracketedPaste && (
                                 data === '\x1b' ||      // ESC character
                                 data === '\x1bO' ||     // ESC+O (SS3)
                                 data === '\x1bI' ||     // ESC+I (Focus)
                                 data.startsWith('\x1b[') || // CSI sequences (FIXED: use startsWith)
                                 data === '[O' ||        // Bracketed codes (fallback)
                                 data === '[I');         // Focus codes (fallback)
        
        // For non-Enter keys, build buffer AND send to PTY
        if (!(data.includes('\r') || data.includes('\n'))) {
          // Debug logging to verify filter is executing
          if (data.includes('[') || data.includes('\x1b')) {
            console.log(`🔍 [ANSI-CHECK] data="${data}" (${data.length} bytes) isAnsi=${isAnsiEscapeCode} isBracketedPaste=${isBracketedPaste}`);
          }
          
          if (!isAnsiEscapeCode) {
            // 🔧 FIX (Oct 24, 2025): Strip bracketed paste markers before buffering
            let cleanData = data;
            if (isBracketedPaste) {
              cleanData = data.replace(/\[200~/g, '').replace(/\[201~/g, '');
              console.log(`🧹 [BRACKETED-PASTE] Stripped paste markers: "${data}" → "${cleanData}"`);
            }
            
            // 🔙 BACKSPACE SUPPORT (Feb 2, 2026): Handle deletion to keep buffer in sync with PTY
            if (cleanData === '\x7f' || cleanData === '\b') {
              buffer = buffer.slice(0, -1);
            } else {
              buffer += cleanData;
            }
            
            commandBuffers.set(sessionId, buffer);
          } else {
            console.log(`🔧 [FILTER] Blocked ANSI escape code from command buffer: "${data}"`);
          }
          
          // Send to PTY for normal command processing
          session.write(data);
        }
        
        // 🔒 Buffer user input for context capture (Oct 24, 2025)
        // CRITICAL: Apply same ANSI filter to prevent focus codes from polluting memory system
        if (!isAnsiEscapeCode) {
          // 🔧 FIX (Oct 24, 2025): Strip bracketed paste markers before context capture
          let cleanData = data;
          if (isBracketedPaste) {
            cleanData = data.replace(/\[200~/g, '').replace(/\[201~/g, '');
          }
          bufferTerminalData(sessionId, 'terminal_input', cleanData);
        }
      } else {
        // FIXED (Dec 10, 2025): Provide visible feedback when session not found
        // Previously only logged a warning - user saw nothing
        console.warn(`[Terminal] Session not found: ${sessionId}`);
        socket.emit('terminal:error', {
          message: 'Terminal session not found'
        });
        // Send visible error message to terminal UI
        socket.emit('terminal:data', {
          id: sessionId,
          data: '\r\n❌ Terminal session not found. Please refresh the page.\r\n'
        });
      }
    });
    
    // Handle terminal resize
    socket.on('terminal:resize', ({ id, cols, rows }) => {
      const sessionId = id || currentSessionId;

      // 🎭 INTERACTIVE CLAUDE SESSION CHECK (Dec 10, 2025)
      // If there's an active interactive Claude session, forward resize to the bridge
      const interactiveSession = interactiveClaudeSessions.get(sessionId);
      if (interactiveSession && bridgeManager) {
        const bridge = bridgeManager.getBridge?.(interactiveSession.bridgeId);
        if (bridge?.socket) {
          bridge.socket.emit('claude:resize', {
            sessionId,
            commandId: interactiveSession.commandId,
            cols,
            rows
          });
        }
      }

      // Also resize local session (if exists)
      const session = terminalSessions.get(sessionId);
      if (session) {
        session.resize(cols, rows);
        // REMOVED: // REMOVED: // REMOVED: console.log(`[Terminal] Resized session ${id} to ${cols}x${rows}`);
      }
    });
    
    // Handle terminal destruction
    socket.on('terminal:destroy', ({ id }) => {
      const sessionId = id || currentSessionId;
      const session = terminalSessions.get(sessionId);
      if (session) {
        session.destroy();
        terminalSessions.delete(sessionId);
        
        // 🎯 Clean up terminal history buffer
        if (terminalHistoryBuffers.has(sessionId)) {
          terminalHistoryBuffers.delete(sessionId);
        }
        
        // 🚀 PERFORMANCE FIX: Clear any pending memory debounce timers
        if (memoryDebounceTimers.has(sessionId)) {
          clearTimeout(memoryDebounceTimers.get(sessionId));
          memoryDebounceTimers.delete(sessionId);
        }
        
        socket.emit('terminal:destroyed', { id: sessionId });
      }
    });
    
    // Agent Terminal Handlers (Phase 2: Interactive Agent Terminals)
    if (agentTerminalManager) {
      // Create agent terminal session
      socket.on('agent:terminal:create', (payload) => {
        const { agentId, teamId, role } = payload;
        // Extract trace context for distributed tracing
        const traceCtx = extractTraceFromPayload(payload);
        const traceId = traceCtx?.traceId || generateServerTraceId();

        try {
          logWithTrace(traceId, 'info', `🤖 Creating agent terminal: ${agentId} (${role})`);
          // Pass traceId to the agent terminal manager
          const session = agentTerminalManager.createAgentTerminalSession(agentId, teamId, role, traceId);
          socket.emit('agent:terminal:created', {
            agentId,
            teamId,
            role,
            traceId,
            isInteractive: session.isInteractive
          });
        } catch (error) {
          logWithTrace(traceId, 'error', `❌ Failed to create agent terminal: ${error.message}`);
          socket.emit('agent:terminal:error', {
            agentId,
            traceId,
            message: error.message
          });
        }
      });
      
      // Connect to existing agent terminal
      socket.on('agent:terminal:connect', ({ agentId }) => {
        console.log(`🔌 [DEBUG] Received agent:terminal:connect for agentId: ${agentId}`);
        try {
          const connected = agentTerminalManager.connectSocket(agentId, socket);
          console.log(`🔌 [DEBUG] connectSocket result: ${connected}`);
          if (connected) {
            console.log(`✅ [DEBUG] Emitting agent:terminal:connected for ${agentId}`);
            socket.emit('agent:terminal:connected', { agentId });
          } else {
            console.log(`❌ [DEBUG] Session not found for ${agentId}, emitting error`);
            socket.emit('agent:terminal:error', { 
              agentId,
              message: 'Agent terminal session not found' 
            });
          }
        } catch (error) {
          console.error(`❌ Failed to connect to agent terminal: ${error.message}`);
          socket.emit('agent:terminal:error', { 
            agentId,
            message: error.message 
          });
        }
      });
      
      // Handle agent terminal input (Phase 2: currently read-only)
      socket.on('agent:terminal:input', ({ agentId, data }) => {
        try {
          agentTerminalManager.handleAgentInput(agentId, data);
        } catch (error) {
          console.error(`❌ Failed to handle agent input: ${error.message}`);
          socket.emit('agent:terminal:error', { 
            agentId,
            message: error.message 
          });
        }
      });
      
      // Clean up agent terminal
      socket.on('agent:terminal:destroy', ({ agentId }) => {
        try {
          agentTerminalManager.cleanupSession(agentId);
          socket.emit('agent:terminal:destroyed', { agentId });
        } catch (error) {
          console.error(`❌ Failed to destroy agent terminal: ${error.message}`);
        }
      });
    }
    
    // Enhanced tmux handlers
    if (tmuxService) {
      // Create sandbox
      socket.on('tmux:create-sandbox', async (data) => {
        try {
          const { userId, projectId, baseFrom, maxCpu, maxMemory } = data;
          const sandbox = await tmuxService.createSandbox({
            userId: userId || 'default',
            projectId: projectId || 'default',
            baseFrom,
            maxCpu,
            maxMemory
          });
          
          socket.emit('tmux:sandbox-created', sandbox);
          // REMOVED: // REMOVED: // REMOVED: console.log(`[Tmux] Sandbox created: ${sandbox.id}`);
        } catch (error) {
          console.error('[Tmux] Error creating sandbox:', error);
          socket.emit('tmux:error', { 
            message: error.message || 'Failed to create sandbox' 
          });
        }
      });
      
      // List sandboxes
      socket.on('tmux:list-sandboxes', async (data) => {
        try {
          const { userId } = data;
          const sandboxes = tmuxService.getUserSandboxes(userId || 'default');
          socket.emit('tmux:sandboxes-listed', sandboxes);
        } catch (error) {
          console.error('[Tmux] Error listing sandboxes:', error);
          socket.emit('tmux:error', { 
            message: error.message || 'Failed to list sandboxes' 
          });
        }
      });
      
      // Connect to sandbox
      socket.on('tmux:connect-sandbox', async (data) => {
        try {
          const { sandboxId } = data;
          const connection = await tmuxService.connectToSandbox(sandboxId);
          socket.emit('tmux:sandbox-connected', connection);
          // REMOVED: // REMOVED: // REMOVED: console.log(`[Tmux] Connected to sandbox: ${sandboxId}`);
        } catch (error) {
          console.error('[Tmux] Error connecting to sandbox:', error);
          socket.emit('tmux:error', { 
            message: error.message || 'Failed to connect to sandbox' 
          });
        }
      });
      
      // Stop sandbox
      socket.on('tmux:stop-sandbox', async (data) => {
        try {
          const { sandboxId } = data;
          await tmuxService.stopSandbox(sandboxId);
          socket.emit('tmux:sandbox-stopped', { id: sandboxId });
          // REMOVED: // REMOVED: // REMOVED: console.log(`[Tmux] Sandbox stopped: ${sandboxId}`);
        } catch (error) {
          console.error('[Tmux] Error stopping sandbox:', error);
          socket.emit('tmux:error', { 
            message: error.message || 'Failed to stop sandbox' 
          });
        }
      });
    }
    
    // Team Status Handlers for Conductor System
    socket.on('team:status:request', () => {
      if (agentTerminalManager) {
        const stats = agentTerminalManager.getStats();

        const agents = stats.sessions.map(session => ({
          agentId: session.agentId,
          role: session.role,
          status: session.bufferSize > 0 ? 'working' : 'idle',
          bufferSize: session.bufferSize
        }));

        socket.emit('team:status:update', { agents });
      } else {
        socket.emit('team:status:update', { agents: [] });
      }
    });

    // Johnny5 / Moltbot handlers for autonomous agent dashboard
    socket.on('johnny5:status', () => {
      if (moltbotBridge) {
        socket.emit('johnny5:status', moltbotBridge.getStatus());
      } else {
        socket.emit('johnny5:status', { connected: false, error: 'Moltbot Bridge not loaded' });
      }
    });

    socket.on('johnny5:join-session', (sessionId) => {
      socket.join(`johnny5:${sessionId}`);
      console.log(`Socket ${socket.id} joined johnny5 session: ${sessionId}`);
    });

    socket.on('johnny5:leave-session', (sessionId) => {
      socket.leave(`johnny5:${sessionId}`);
      console.log(`Socket ${socket.id} left johnny5 session: ${sessionId}`);
    });

    // Johnny5 → Claude Code task delegation
    socket.on('johnny5:delegate-task', async ({ sessionId, task }) => {
      // Auth check: require authenticated socket with terminal permission
      if (socket.authenticated === false && !socket.userId) {
        socket.emit('johnny5:delegate-result', {
          success: false,
          error: 'Authentication required for task delegation',
          sessionId
        });
        console.warn(`[Johnny5→Claude] Rejected unauthenticated delegate-task from socket ${socket.id}`);
        return;
      }
      if (socket.permissions && !socket.permissions.includes('terminal')) {
        socket.emit('johnny5:delegate-result', {
          success: false,
          error: 'Terminal permission required for task delegation',
          sessionId
        });
        console.warn(`[Johnny5→Claude] Rejected delegate-task: missing terminal permission for socket ${socket.id}`);
        return;
      }

      console.log(`[Johnny5→Claude] Delegating task to terminal ${sessionId}: ${task.substring(0, 100)}`);

      // Check if the terminal session exists
      const terminalSession = terminalSessions.get(sessionId);
      if (!terminalSession) {
        socket.emit('johnny5:delegate-result', {
          success: false,
          error: 'No active terminal session found',
          sessionId
        });
        return;
      }

      // Check if Claude is in interactive mode for this session
      const isInteractive = interactiveClaudeSessions.has(sessionId);

      if (isInteractive) {
        // Send the task directly to Claude Code's interactive session
        const taskInput = task + '\n';
        if (terminalSession.pty) {
          terminalSession.pty.write(taskInput);
          console.log(`[Johnny5→Claude] Task sent to interactive Claude session`);
          socket.emit('johnny5:delegate-result', { success: true, sessionId, method: 'interactive' });
        } else {
          socket.emit('johnny5:delegate-result', { success: false, error: 'PTY not available', sessionId });
        }
      } else {
        // Claude is not running - start a claude command with the task
        const claudeCommand = `claude "${task.replace(/"/g, '\\"')}"\n`;
        if (terminalSession.pty) {
          terminalSession.pty.write(claudeCommand);
          console.log(`[Johnny5→Claude] Started new Claude session with task`);
          socket.emit('johnny5:delegate-result', { success: true, sessionId, method: 'new-session' });
        } else {
          socket.emit('johnny5:delegate-result', { success: false, error: 'PTY not available', sessionId });
        }
      }
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
      // REMOVED: // REMOVED: // REMOVED: console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      
      // Clean up command buffer for this socket's session
      const sessionId = socketToSession.get(socket.id);
      if (sessionId && commandBuffers.has(sessionId)) {
        commandBuffers.delete(sessionId);
        if (process.env.NODE_ENV === 'production') {
          console.log(`[Memory] Cleaned up command buffer for session: ${sessionId} (socket: ${socket.id})`);
        }
      }
      
      // Clean up socket-to-session mapping
      socketToSession.delete(socket.id);

      // Clean up collaborative editing on disconnect
      if (socket._collabSession) {
        const { fileId } = socket._collabSession;
        const userId = socket._teamPresence?.userId || socket.id;
        socket.to(`collab:${fileId}`).emit('collab:user-left', { userId });
        if (collabDocs.has(fileId)) {
          const doc = collabDocs.get(fileId);
          doc.userCount = Math.max(0, doc.userCount - 1);
          if (doc.userCount <= 0 && !doc.cleanupTimer) {
            doc.cleanupTimer = setTimeout(() => {
              const current = collabDocs.get(fileId);
              if (current && current.userCount <= 0) {
                collabDocs.delete(fileId);
                console.log(`[COLLAB] Cleaned up on disconnect: ${fileId}`);
              }
            }, 5 * 60 * 1000);
          }
        }
      }

      // Clean up team presence on disconnect
      if (socket._teamPresence) {
        const { teamId, userId } = socket._teamPresence;
        const members = teamPresence.get(teamId);
        if (members && members.has(userId)) {
          const entry = members.get(userId);
          entry.sockets.delete(socket.id);
          if (entry.sockets.size === 0) members.delete(userId);
        }
        broadcastPresence(teamId);
      }

      // Note: We keep terminal session alive for reconnection
      // Sessions are only destroyed explicitly or on timeout
    });
  });
  
  // Enhanced session cleanup with queue system to prevent memory cascades
  const cleanupQueue = [];
  const MAX_SESSIONS = 10; // Limit total sessions
  const CLEANUP_BATCH_SIZE = 2; // Process 2 cleanups at a time
  const SESSION_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours - covers full work sessions including breaks
  const activeCleanups = new Set(); // Track active cleanup operations
  
  // Process cleanup queue gradually to prevent cascades
  setInterval(() => {
    // Process queued cleanups
    if (cleanupQueue.length > 0 && activeCleanups.size < CLEANUP_BATCH_SIZE) {
      const batch = cleanupQueue.splice(0, CLEANUP_BATCH_SIZE - activeCleanups.size);
      batch.forEach(sessionId => {
        if (!activeCleanups.has(sessionId)) {
          activeCleanups.add(sessionId);
          
          const session = terminalSessions.get(sessionId);
          if (session) {
            try {
              session.destroy();
              terminalSessions.delete(sessionId);
              sessionMetadata.delete(sessionId);
              
              // 🎯 Clean up terminal history buffer
              if (terminalHistoryBuffers.has(sessionId)) {
                terminalHistoryBuffers.delete(sessionId);
              }
              
              // 🚀 PERFORMANCE FIX: Clear any pending memory debounce timers
              if (memoryDebounceTimers.has(sessionId)) {
                clearTimeout(memoryDebounceTimers.get(sessionId));
                memoryDebounceTimers.delete(sessionId);
              }
              
              console.log(`♻️ Session cleaned up: ${sessionId}`);
            } catch (error) {
              console.error(`⚠️ Error cleaning session ${sessionId}:`, error.message);
            }
          }
          
          // Remove from active cleanups after a delay
          setTimeout(() => {
            activeCleanups.delete(sessionId);
          }, 1000);
        }
      });
    }
    
    // Check for sessions that need cleanup
    const now = Date.now();
    
    // First, enforce maximum session limit
    if (terminalSessions.size > MAX_SESSIONS) {
      const sortedSessions = Array.from(terminalSessions.entries())
        .sort((a, b) => a[1].lastActivity.getTime() - b[1].lastActivity.getTime());
      
      const sessionsToRemove = sortedSessions.slice(0, terminalSessions.size - MAX_SESSIONS);
      sessionsToRemove.forEach(([id]) => {
        if (!cleanupQueue.includes(id) && !activeCleanups.has(id)) {
          cleanupQueue.push(id);
          console.log(`🧹 Queueing session for cleanup (max limit): ${id}`);
        }
      });
    }
    
    // Then check for timeout sessions
    for (const [id, session] of terminalSessions.entries()) {
      if (now - session.lastActivity.getTime() > SESSION_TIMEOUT) {
        if (!cleanupQueue.includes(id) && !activeCleanups.has(id)) {
          cleanupQueue.push(id);
          console.log(`⏰ Queueing session for cleanup (timeout): ${id}`);
        }
      }
    }
    
    // Log memory status if sessions are accumulating
    if (terminalSessions.size > 5 || cleanupQueue.length > 3) {
      console.log(`📊 Session status: Active: ${terminalSessions.size}, Queued for cleanup: ${cleanupQueue.length}`);
    }
  }, 10 * 1000); // Check every 10 seconds (more frequent for better control)
  
  // Start memory optimizer monitoring
  memoryOptimizer.startMonitoring();
  
  // Set up memory optimizer event handlers
  memoryOptimizer.on('cleanup-start', ({ level, usage }) => {
    console.log(`🧹 Memory cleanup started (${level}): ${usage.heapUsedMB}MB / 400MB`);
    
    if (level === 'panic') {
      // In panic mode, stop accepting new terminal sessions
      io.sockets.emit('system:memory-pressure', {
        level: 'critical',
        message: 'System under heavy load. New sessions temporarily disabled.'
      });
    }
  });
  
  memoryOptimizer.on('cleanup-end', ({ level, usage }) => {
    console.log(`✅ Memory cleanup complete (${level}): ${usage.heapUsedMB}MB / 400MB`);
    
    if (level === 'panic' && usage.heapUsedMB < 300) {
      io.sockets.emit('system:memory-recovered', {
        message: 'System resources recovered. Normal operation resumed.'
      });
    }
  });
  
  memoryOptimizer.on('request-restart', () => {
    console.error('💀 Memory critical - initiating graceful restart');
    
    // Notify all clients
    io.sockets.emit('system:restart-imminent', {
      message: 'Server will restart in 30 seconds due to memory pressure.'
    });
    
    // Start graceful shutdown
    setTimeout(() => {
      gracefulShutdown('memory-critical');
    }, 30000);
  });
  
  memoryOptimizer.on('memory-stats', (stats) => {
    // Emit memory stats to connected clients for monitoring
    if (stats.percentage > 75) {
      io.sockets.emit('system:memory-stats', stats);
    }
  });
  
  // Graceful shutdown handling - DUPLICATE REMOVED (using async version below line 2982)
  
  // Unhandled error handling
  process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    gracefulShutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't crash on unhandled promise rejections, just log them
  });
  
  // Initialize Skills System (async)
  (async () => {
    if (process.env.ENABLE_SKILLS_SYSTEM === 'true') {
      try {
        const { initializeSkillsService } = require('./lib/skills-service.ts');
        await initializeSkillsService();
        skillsService = true; // Mark as initialized
        console.log('✅ Skills System initialized successfully');
        
        // Setup performance monitoring (log every 1 hour)
        setInterval(() => {
          try {
            const { logSkillsPerformance } = require('./lib/skills-integration-utils');
            logSkillsPerformance();
          } catch (error) {
            console.error('⚠️  Skills performance logging failed:', error.message);
          }
        }, 3600000); // 1 hour
        
      } catch (error) {
        console.error('⚠️  Skills System initialization failed:', error.message);
        console.log('   Continuing with legacy implementations');
      }
    }
  })();
  
  // Start server
  console.log('[DEBUG] Calling server.listen() on port', port);
  server.listen(port, (err) => {
    if (err) throw err;
    console.log('[DEBUG] server.listen() callback fired');
    console.log('[DEBUG] Server request listeners at start:', server.listenerCount('request'));

    if (isAlphaMode) {
      console.log('╔══════════════════════════════════════════════════╗');
      console.log('║          Coder1 IDE - Alpha Deployment           ║');
      console.log('╚══════════════════════════════════════════════════╝');
      console.log();
      console.log(`🚀 Server: http://${hostname}:${port}`);
      console.log(`📊 Mode: ${deploymentMode} (Alpha)`);
      console.log(`💾 Memory Limit: 400MB`);
      console.log(`👥 Max Users: ${maxAlphaUsers}`);
      console.log(`🔒 Invite Code: ${alphaInviteCode ? '✓ Set' : '⚠️ Not Set'}`);
      console.log();
      console.log('Features:');
      console.log('✅ Memory Optimizer Active');
      console.log('✅ Health Monitoring at /api/health');
      console.log('✅ Session Persistence');
      console.log(WebSocketEventBridge ? '✅ Claude CLI Puppeteer Ready' : '⚠️ CLI Puppeteer Unavailable');
      console.log();
      console.log(`Alpha Access URL: http://localhost:${port}/ide?invite=${alphaInviteCode || 'YOUR_CODE'}`);
    } else {
      console.log('🚀 Coder1 IDE - Unified Server Started');
      console.log('=====================================');
      console.log(`📍 Server: http://${hostname}:${port}`);
      console.log(`🔌 Socket.IO: ws://${hostname}:${port}`);
      console.log(`💻 Terminal: Integrated with PTY`);
      console.log(`🏠 Environment: ${dev ? 'Development' : 'Production'}`);
      console.log();
      console.log(`IDE Interface: http://localhost:${port}/ide`);
    }
    console.log('');

    // Initialize Johnny5 Cron Service for proactive features
    try {
      const { getCronService } = require('./services/johnny5/cron-service.ts');
      const cronService = getCronService({
        storePath: path.join(__dirname, 'data', 'johnny5', 'cron-jobs.json'),
        onJobRun: async (job) => {
          console.log(`[Johnny5 Cron] Executing job: ${job.name} (${job.payload.action || 'custom'})`);

          // Handle different job actions
          switch (job.payload.action) {
            case 'morning_brief':
              try {
                const { generateMorningBrief } = require('./services/johnny5/morning-brief-generator.ts');
                const brief = await generateMorningBrief(new Date());
                console.log(`[Johnny5 Cron] Morning brief generated: ${brief.id}`);

                // Notify connected clients via Socket.IO
                io.emit('johnny5:morning-brief', {
                  type: 'morning_brief_ready',
                  briefId: brief.id,
                  summary: brief.summary,
                  timestamp: new Date().toISOString(),
                });
              } catch (error) {
                console.error('[Johnny5 Cron] Morning brief generation failed:', error.message);
              }
              break;

            case 'trend_check':
              try {
                const { trendMonitor } = require('./services/johnny5/trend-monitor.ts');
                const alerts = await trendMonitor.refresh();
                const highPriorityAlerts = alerts.filter(a => a.relevance === 'high' && !a.dismissed);

                if (highPriorityAlerts.length > 0) {
                  io.emit('johnny5:trends', {
                    type: 'new_high_priority_trends',
                    count: highPriorityAlerts.length,
                    alerts: highPriorityAlerts.slice(0, 3),
                    timestamp: new Date().toISOString(),
                  });
                }
                // Wire high-priority trends to Opportunity Engine
                if (highPriorityAlerts.length > 0) {
                  try {
                    const { opportunityEngine } = require('./services/johnny5/opportunity-engine.ts');
                    for (const alert of highPriorityAlerts) {
                      await opportunityEngine.ingest({
                        source: 'trend',
                        type: 'high_relevance_trend',
                        data: { title: alert.title, description: alert.description, url: alert.url, source: alert.source },
                        timestamp: new Date(),
                      });
                    }
                  } catch (oeError) {
                    console.error('[Johnny5 Cron] Opportunity engine ingest failed:', oeError.message);
                  }
                }

                console.log(`[Johnny5 Cron] Trend check complete: ${alerts.length} alerts (${highPriorityAlerts.length} high priority)`);
              } catch (error) {
                console.error('[Johnny5 Cron] Trend check failed:', error.message);
              }
              break;

            default:
              console.log(`[Johnny5 Cron] Custom job executed: ${job.name}`);
          }
        },
        onNotify: (message, job) => {
          // Send notification to connected clients
          io.emit('johnny5:notification', {
            type: 'cron_notification',
            message,
            jobId: job.id,
            jobName: job.name,
            action: job.payload.action,
            timestamp: new Date().toISOString(),
          });
          console.log(`[Johnny5 Cron] Notification sent: ${message}`);
        },
      });

      // Initialize and create default jobs
      cronService.initialize().then(async () => {
        await cronService.createDefaultJobs('system');
        await cronService.start();

        const jobs = cronService.getJobs();
        console.log('✅ Johnny5 Cron Service started');
        console.log(`   Active jobs: ${jobs.filter(j => j.enabled).length}/${jobs.length}`);
        jobs.forEach(job => {
          console.log(`   - ${job.name} (${job.enabled ? 'enabled' : 'disabled'})`);
        });
      }).catch(error => {
        console.error('❌ Johnny5 Cron Service initialization failed:', error.message);
      });

    } catch (error) {
      console.warn('⚠️ Johnny5 Cron Service not available:', error.message);
    }

    // ========================================================================
    // Initialize Johnny5 Heartbeat Service (Living Files)
    // ========================================================================
    // TEMPORARILY DISABLED: Triggers sqlite-vec blocking issue
    console.log('⚠️  [Johnny5] Heartbeat Service DISABLED - sqlite-vec blocking issue needs fix');
    /*
    if (process.env.JOHNNY5_LIVING_FILES === 'true') {
      try {
        const { getHeartbeatService } = require('./services/johnny5/heartbeat-service.ts');
        const heartbeat = getHeartbeatService({
          pulseIntervalMs: 30000,    // 30s pulse
          deepCheckIntervalMs: 300000, // 5min deep check
          onPulse: (status) => {
            // Emit heartbeat pulse to all connected clients
            io.emit('johnny5:heartbeat', {
              type: 'pulse',
              isAlive: status.isAlive,
              health: status.health,
              userPresence: status.userPresence,
              timestamp: new Date().toISOString(),
            });
          },
          onOpportunity: async (event) => {
            // Feed heartbeat opportunities to the Opportunity Engine
            try {
              const { opportunityEngine } = require('./services/johnny5/opportunity-engine.ts');
              await opportunityEngine.ingest({
                source: 'heartbeat',
                type: event.type,
                data: event.data,
                timestamp: new Date(),
              });
            } catch (oeErr) {
              console.warn('[Heartbeat] Opportunity engine not available:', oeErr.message);
            }
          },
        });

        heartbeat.start();
        console.log('💓 Johnny5 Heartbeat Service started (living files enabled)');

        // Track user presence — update on a simple interval checking connected count
        setInterval(() => {
          const connectedCount = io.engine?.clientsCount || 0;
          heartbeat.updateUserPresence(connectedCount > 0, connectedCount);
        }, 10000); // Check every 10s

      } catch (heartbeatError) {
        console.warn('⚠️ Johnny5 Heartbeat Service not available:', heartbeatError.message);
      }
    }
    */

    // ========================================================================
    // Initialize Johnny5 Proactive Services
    // ========================================================================
    // TEMPORARILY DISABLED: Opportunity Engine triggers sqlite-vec blocking issue
    console.log('⚠️  [Johnny5] Proactive Services DISABLED - sqlite-vec blocking issue needs fix');
    /*
    try {
      const { loadConfig } = require('./lib/johnny5-config.ts');
      const config = loadConfig();

      // Config validation
      const warnings = [];
      if (config.integrations.telegram?.enabled && !config.integrations.telegram?.botToken) {
        warnings.push('Telegram enabled but botToken missing');
      }
      if (config.integrations.telegram?.enabled && !config.integrations.telegram?.chatId) {
        warnings.push('Telegram enabled but chatId missing');
      }
      if (!['low', 'medium', 'high'].includes(config.proactivityLevel)) {
        warnings.push(`Invalid proactivityLevel: ${config.proactivityLevel}`);
      }
      warnings.forEach(w => console.warn(`⚠️ [Johnny5 Config] ${w}`));

      // Start Opportunity Engine (give it access to Socket.IO)
      const { opportunityEngine } = require('./services/johnny5/opportunity-engine.ts');
      opportunityEngine.setIO(io);
      console.log('✅ Johnny5 Opportunity Engine initialized');

      // Start Telegram Bot (if configured)
      if (config.integrations.telegram?.enabled) {
        const { telegramBot } = require('./services/johnny5/telegram-bot.ts');
        telegramBot.start().then(connected => {
          if (connected) {
            console.log('✅ Johnny5 Telegram Bot connected');
          } else {
            console.warn('⚠️ Johnny5 Telegram Bot failed to connect');
          }
        }).catch(error => {
          console.error('❌ Johnny5 Telegram Bot error:', error.message);
        });
      }

      console.log(`   Proactivity level: ${config.proactivityLevel}`);
      console.log(`   Telegram: ${config.integrations.telegram?.enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.warn('⚠️ Johnny5 Proactive Services not available:', error.message);
    }
    */

    // Initialize Memory Exporter for Claude Skills
    if (memoryExporter) {
      memoryExporter.initialize().then(() => {
        console.log('✅ Memory Exporter initialized');
        console.log(`   Export directory: ${memoryExporter.getStats().exportDir}`);

        // Auto-export every 30 seconds
        setInterval(() => {
          memoryExporter.exportAll().catch(error => {
            console.error('❌ [MemoryExporter] Auto-export failed:', error.message);
          });
        }, 30000);

        console.log('   Auto-export: Every 30 seconds');
      }).catch(error => {
        console.error('❌ Memory Exporter initialization failed:', error);
      });
    }

    // ========================================================================
    // Initialize Johnny5 Memory Sources (CRITICAL for memory recall)
    // ========================================================================
    // TEMPORARILY DISABLED: Causes server to hang during sqlite-vec initialization
    // TODO: Fix blocking database operations in johnny5-db.ts
    console.log('⚠️  [Johnny5 Memory] DISABLED - sqlite-vec blocking issue needs fix');
    /*
    // DEFERRED: Run after event loop tick to avoid blocking server startup
    setImmediate(() => {
      try {
        // Clear ManusLive cache to ensure fresh reads
        try {
          const { clearManusLiveCache } = require('./lib/manuslive-memory.ts');
          clearManusLiveCache();
          console.log('[Johnny5] ManusLive cache cleared');
        } catch (cacheError) {
          console.warn('[Johnny5] Could not clear ManusLive cache:', cacheError.message);
        }

        const { initializeMemorySources, cleanupMemorySources } = require('./services/memory/sources/index.ts');

        console.log('[Johnny5 Memory] Starting initialization...');

        initializeMemorySources({
          indexManusLive: true,
          indexSessions: true,
          sessionLimit: 50,
          startWatcher: true,
          onProgress: (msg) => console.log(`[Johnny5 Memory] ${msg}`),
        }).then((result) => {
          console.log('═══════════════════════════════════════════════════════════');
          console.log('✅ Johnny5 Memory Sources Initialized');
          console.log(`   ManusLive chunks: ${result.manusLive?.chunks || 0}`);
          console.log(`   Session chunks: ${result.sessions?.chunks || 0}`);
          console.log(`   File watcher: ${result.watcherStarted ? 'RUNNING' : 'STOPPED'}`);
          console.log(`   TOTAL chunks indexed: ${result.totalChunks}`);
          console.log('═══════════════════════════════════════════════════════════');

          // Log warning if no data indexed
          if (result.totalChunks === 0) {
            console.warn('⚠️  WARNING: No memory chunks indexed!');
            console.warn('   - Check if ManusLive files exist at ~/.manuslive/workspace/');
            console.warn('   - Check if sessions exist in johnny5.db');
          }
        }).catch((error) => {
          console.error('═══════════════════════════════════════════════════════════');
          console.error('❌ Johnny5 Memory Initialization FAILED');
          console.error('   Error:', error.message);
          console.error('   Memory recall will NOT work until this is fixed!');
          console.error('═══════════════════════════════════════════════════════════');
        });

        // Cleanup on shutdown
        process.on('SIGTERM', () => {
          console.log('[Johnny5 Memory] Cleaning up...');
          cleanupMemorySources();
        });

      } catch (error) {
        console.error('❌ Johnny5 Memory Sources module failed to load:', error.message);
      }
    });
    */
  });

// Helper functions for context capture integration
const initializeContextSession = async (terminalSessionId) => {
  try {
    const response = await fetch(`http://localhost:${port}/api/context/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath: '/Users/michaelkraft/autonomous_vibe_interface',
        sessionId: terminalSessionId
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      contextSessions.set(terminalSessionId, data.sessionId);
      // REMOVED: // REMOVED: // REMOVED: console.log(`[Context] Linked terminal session ${terminalSessionId} to context session`);
      return data.sessionId;
    }
  } catch (error) {
    console.warn(`[Context] Failed to initialize context session:`, error.message);
  }
  return null;
};

const bufferTerminalData = (sessionId, type, content) => {
  if (!terminalDataBuffers.has(sessionId)) {
    terminalDataBuffers.set(sessionId, []);
  }

  const buffer = terminalDataBuffers.get(sessionId);
  buffer.push({
    timestamp: Date.now(),
    type,
    content,
    sessionId
  });

  // Track activity for memory flush scheduling
  markTerminalActivity();

  // Check for early flush on terminal output (Claude response detection)
  if (type === 'terminal_output') {
    triggerEarlyFlushIfNeeded(sessionId, content);
  }
  
  // 🔧 FIX (Nov 19, 2025): Increased buffer size and smart rotation
  // Keep buffer size manageable (last 500 chunks, but prioritize terminal_input)
  if (buffer.length > 500) {
    // Count terminal_input chunks
    const inputChunks = buffer.filter(chunk => chunk.type === 'terminal_input').length;
    
    // If we have lots of input, rotate normally
    if (inputChunks > 100) {
      buffer.splice(0, buffer.length - 500);
    } else {
      // Otherwise, remove terminal_output chunks first to preserve input
      const outputIndices = [];
      for (let i = 0; i < buffer.length; i++) {
        if (buffer[i].type === 'terminal_output') {
          outputIndices.push(i);
        }
      }
      
      // Remove oldest output chunks until we're under limit
      const toRemove = buffer.length - 500;
      if (outputIndices.length >= toRemove) {
        for (let i = toRemove - 1; i >= 0; i--) {
          buffer.splice(outputIndices[i], 1);
        }
      } else {
        // If not enough output chunks, fall back to normal rotation
        buffer.splice(0, buffer.length - 500);
      }
    }
  }
};

// 🔧 RE-ENABLED: Contextual memory with non-blocking flush (Dec 4, 2025)
// Previous issue: await in for-loop blocked event loop causing terminal freeze
// Fix: Fire-and-forget pattern with batch limits and activity checks
let isFlushingContext = false;

setInterval(() => {
  // Skip if another flush is running
  if (isFlushingContext) {
    return;
  }

  // Skip if no terminal activity in last 2 minutes (user likely idle)
  const idleTime = Date.now() - lastTerminalActivity;
  if (idleTime > 120000) {
    return;
  }

  isFlushingContext = true;

  // Process each session without awaiting (fire-and-forget)
  const flushPromises = [];
  for (const [sessionId] of terminalDataBuffers) {
    const buffer = terminalDataBuffers.get(sessionId);
    // Only flush if buffer has meaningful data (>5 chunks, reduced from 10 for faster capture)
    if (buffer && buffer.length > 5) {
      // Fire and forget - don't await
      flushPromises.push(
        flushContextData(sessionId).catch(err => {
          console.warn(`[Context] Flush failed for ${sessionId}:`, err.message);
        })
      );
    }
  }

  // Reset flag after all flushes complete (but don't block interval)
  if (flushPromises.length > 0) {
    Promise.all(flushPromises).finally(() => {
      isFlushingContext = false;
    });
  } else {
    isFlushingContext = false;
  }
}, 60000); // Flush every 60 seconds (was 30s)
  
  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`[Server] ${signal} received, shutting down gracefully...`);
    
    // Force exit after 2 seconds if cleanup hangs (common with open sockets)
    setTimeout(() => {
      console.error('[Shutdown] ⚠️  Force exiting after timeout');
      process.exit(0);
    }, 2000).unref(); // unref so this timer doesn't prevent exit itself

    try {
      // 1. Stop all AI Team agents first (kills Claude CLI processes)
      if (claudePuppeteer && typeof claudePuppeteer.emergencyStopAll === 'function') {
        console.log('[Shutdown] Stopping all AI agents...');
        await claudePuppeteer.emergencyStopAll();
        console.log('[Shutdown] ✅ All AI agents stopped');
      }
      
      // 2. Clean up all terminal sessions
      console.log('[Shutdown] Cleaning up terminal sessions...');
      for (const [id, session] of terminalSessions.entries()) {
        session.destroy();
      }
      terminalSessions.clear();
      console.log('[Shutdown] ✅ Terminal sessions cleaned');
      
      // 3. Close Socket.IO (promisified-ish)
      if (io) {
        io.close(() => console.log('[Shutdown] ✅ Socket.IO closed'));
      }
      
      // 4. Close HTTP server
      if (server) {
        server.close(() => {
          console.log('[Shutdown] ✅ HTTP server closed');
          process.exit(0);
        });
        
        // Also force close connections immediately 
        server.closeAllConnections && server.closeAllConnections();
      } else {
        process.exit(0);
      }
    } catch (error) {
      console.error('[Shutdown] Error during cleanup:', error);
      process.exit(1);
    }
  };
  
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
});

// Export for potential testing
module.exports = { terminalSessions, getOrCreateSession };