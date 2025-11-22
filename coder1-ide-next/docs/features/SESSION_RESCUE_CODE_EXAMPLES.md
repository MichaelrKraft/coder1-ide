# Session Rescue - Code Examples & Implementation Guide

**For Developers Implementing Session Rescue**

This document contains ready-to-use code snippets and implementation examples. Copy and adapt as needed.

---

## Table of Contents

1. [Core Service Structure](#core-service-structure)
2. [Recovery File Interface](#recovery-file-interface)
3. [State Collection](#state-collection)
4. [Save Recovery Point](#save-recovery-point)
5. [Find Recoverable Session](#find-recoverable-session)
6. [Restore Session](#restore-session)
7. [Auto-Save Manager](#auto-save-manager)
8. [React Components](#react-components)
9. [API Routes](#api-routes)
10. [Utility Functions](#utility-functions)

---

## Core Service Structure

### services/LocalRecoveryService.ts

```typescript
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { RecoveryFile, RecoveryState, SaveReason, HealthCheck } from '@/types/recovery';

export class LocalRecoveryService {
  private recoveryDir: string;
  private maxAutoSaves: number;
  private maxAgeDays: number;
  
  constructor() {
    this.recoveryDir = path.join(os.homedir(), '.coder1', 'recovery');
    this.maxAutoSaves = parseInt(process.env.SESSION_RESCUE_MAX_AUTO_SAVES || '10');
    this.maxAgeDays = parseInt(process.env.SESSION_RESCUE_MAX_AGE_DAYS || '7');
  }
  
  async initialize(): Promise<void> {
    // Create directory structure
    const dirs = ['sessions', 'snapshots', 'emergency'].map(
      dir => path.join(this.recoveryDir, dir)
    );
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    }
    
    console.log('[Recovery] Initialized:', this.recoveryDir);
  }
  
  async saveRecoveryPoint(type: SaveReason, name?: string): Promise<string> {
    // Implementation in next section
  }
  
  async findRecoverableSession(): Promise<RecoveryFile | null> {
    // Implementation in next section
  }
  
  async restoreSession(sessionId: string): Promise<void> {
    // Implementation in next section
  }
  
  // ... other methods
}

// Singleton export
export const recoveryService = new LocalRecoveryService();
```

---

## Recovery File Interface

### types/recovery.ts

```typescript
export type SaveReason = "auto" | "manual" | "crash" | "periodic" | "event";

export interface RecoveryFile {
  meta: {
    sessionId: string;
    timestamp: number;
    projectPath: string;
    projectName: string;
    machineId: string;
    coder1Version: string;
    recoveryVersion: string;
    saveReason: SaveReason;
    name?: string;
    tags?: string[];
  };
  
  state: RecoveryState;
  health: HealthCheck;
  stats: RecoveryStats;
}

export interface RecoveryState {
  openFiles: OpenFileState[];
  terminals: TerminalState[];
  claudeBridge: ClaudeBridgeState;
  git: GitState;
  layout: LayoutState;
}

export interface OpenFileState {
  absolutePath: string;
  relativeToProject: string;
  content: string;
  isDirty: boolean;
  language: string;
  cursorPosition: { line: number; column: number };
  scrollTop: number;
  selections: Array<{
    start: { line: number; column: number };
    end: { line: number; column: number };
  }>;
}

export interface TerminalState {
  id: string;
  cwd: string;
  history: string;
  lastCommand: string;
  exitCode?: number;
  env?: Record<string, string>;
}

export interface ClaudeBridgeState {
  isConnected: boolean;
  bridgeVersion: string;
  pairingCode?: string;
  lastActivity: number;
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    fileContext?: string[];
    toolUse?: any;
  }>;
  activeTask?: {
    description: string;
    startedAt: number;
    filesInvolved: string[];
    commandsRun: string[];
    status: "in_progress" | "completed" | "failed";
  };
}

export interface GitState {
  branch: string;
  hasUncommitted: boolean;
  uncommittedFiles: string[];
  lastCommit: string;
  remoteUrl?: string;
}

export interface LayoutState {
  leftPanelWidth: number;
  rightPanelWidth: number;
  terminalHeight: number;
  activeLeftTab: string;
  activeRightTab: string;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
}

export interface HealthCheck {
  recoveryScore: number;
  canFullyRestore: boolean;
  warnings: string[];
  filesVerified: boolean;
  gitStateSynced: boolean;
}

export interface RecoveryStats {
  fileCount: number;
  dirtyFileCount: number;
  totalFileSize: number;
  terminalCommandCount: number;
  conversationMessageCount: number;
  compressionRatio: number;
}
```

---

## State Collection

### lib/recovery-state-collector.ts

```typescript
import { useIDEStore } from '@/stores/useIDEStore';
import { RecoveryState, OpenFileState, TerminalState } from '@/types/recovery';
import { processCheckpointDataForRestore } from '@/lib/checkpoint-utils';

export async function collectRecoveryState(): Promise<RecoveryState> {
  const store = useIDEStore.getState();
  
  // Collect open files
  const openFiles: OpenFileState[] = await collectOpenFiles(store);
  
  // Collect terminal state
  const terminals: TerminalState[] = await collectTerminals(store);
  
  // Collect Claude Bridge state
  const claudeBridge = await collectClaudeBridgeState();
  
  // Collect git state
  const git = await collectGitState();
  
  // Collect layout
  const layout = collectLayoutState(store);
  
  return {
    openFiles,
    terminals,
    claudeBridge,
    git,
    layout
  };
}

async function collectOpenFiles(store: any): Promise<OpenFileState[]> {
  const { openFiles, activeFile } = store;
  const files: OpenFileState[] = [];
  
  for (const fileInfo of openFiles) {
    const editor = store.editorInstances.get(fileInfo.path);
    if (!editor) continue;
    
    const model = editor.getModel();
    if (!model) continue;
    
    files.push({
      absolutePath: fileInfo.absolutePath,
      relativeToProject: fileInfo.path,
      content: model.getValue(),
      isDirty: fileInfo.isDirty || false,
      language: model.getLanguageId(),
      cursorPosition: {
        line: editor.getPosition()?.lineNumber || 1,
        column: editor.getPosition()?.column || 1
      },
      scrollTop: editor.getScrollTop(),
      selections: editor.getSelections()?.map(sel => ({
        start: { 
          line: sel.startLineNumber, 
          column: sel.startColumn 
        },
        end: { 
          line: sel.endLineNumber, 
          column: sel.endColumn 
        }
      })) || []
    });
  }
  
  return files;
}

async function collectTerminals(store: any): Promise<TerminalState[]> {
  // Get terminal instances from store
  const terminals = store.terminalSessions || [];
  const result: TerminalState[] = [];
  
  for (const terminal of terminals) {
    // Get terminal history
    const history = terminal.history || '';
    
    // Filter using existing checkpoint system
    const filtered = await processCheckpointDataForRestore({
      terminalHistory: history
    });
    
    result.push({
      id: terminal.id,
      cwd: terminal.cwd || process.cwd(),
      history: filtered.terminalHistory,
      lastCommand: extractLastCommand(filtered.terminalHistory),
      exitCode: terminal.lastExitCode
    });
  }
  
  return result;
}

async function collectClaudeBridgeState() {
  // Get Claude Bridge status
  const response = await fetch('/api/bridge/status');
  const status = await response.json();
  
  return {
    isConnected: status.connected || false,
    bridgeVersion: status.version || '1.0.0',
    lastActivity: Date.now(),
    conversationHistory: status.conversationHistory || [],
    activeTask: status.activeTask
  };
}

async function collectGitState() {
  try {
    // Use existing git utilities or execute git commands
    const { execSync } = require('child_process');
    const cwd = process.cwd();
    
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd })
      .toString()
      .trim();
    
    const uncommittedFiles = execSync('git diff --name-only', { cwd })
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);
    
    const lastCommit = execSync('git rev-parse HEAD', { cwd })
      .toString()
      .trim();
    
    return {
      branch,
      hasUncommitted: uncommittedFiles.length > 0,
      uncommittedFiles,
      lastCommit
    };
  } catch (error) {
    // Not a git repo or git not available
    return {
      branch: 'unknown',
      hasUncommitted: false,
      uncommittedFiles: [],
      lastCommit: ''
    };
  }
}

function collectLayoutState(store: any) {
  return {
    leftPanelWidth: store.leftPanelWidth || 250,
    rightPanelWidth: store.rightPanelWidth || 300,
    terminalHeight: store.terminalHeight || 300,
    activeLeftTab: store.activeLeftTab || 'files',
    activeRightTab: store.activeRightTab || 'none',
    leftPanelCollapsed: store.leftPanelCollapsed || false,
    rightPanelCollapsed: store.rightPanelCollapsed || false
  };
}

function extractLastCommand(history: string): string {
  const lines = history.split('\n').filter(Boolean);
  // Find last line that looks like a command (not output)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('$') || line.startsWith('❯')) {
      return line.replace(/^[$❯]\s*/, '');
    }
  }
  return '';
}
```

---

## Save Recovery Point

### services/LocalRecoveryService.ts (continued)

```typescript
async saveRecoveryPoint(
  type: SaveReason = 'auto',
  name?: string,
  tags?: string[]
): Promise<string> {
  const startTime = Date.now();
  
  try {
    // Collect current state
    const state = await collectRecoveryState();
    
    // Perform health check
    const health = await this.performHealthCheck(state);
    
    // Calculate stats
    const stats = this.calculateStats(state);
    
    // Create recovery file
    const recoveryFile: RecoveryFile = {
      meta: {
        sessionId: this.generateSessionId(),
        timestamp: Date.now(),
        projectPath: process.cwd(),
        projectName: path.basename(process.cwd()),
        machineId: await this.getMachineId(),
        coder1Version: process.env.CODER1_VERSION || '1.0.0',
        recoveryVersion: '1.0.0',
        saveReason: type,
        name,
        tags
      },
      state,
      health,
      stats
    };
    
    // Determine subdirectory
    const subdir = type === 'manual' ? 'snapshots' :
                   type === 'crash' ? 'emergency' : 'sessions';
    
    // Write to file
    const filename = `session_${Date.now()}_${this.randomId()}.json`;
    const filepath = path.join(this.recoveryDir, subdir, filename);
    
    await fs.writeFile(
      filepath,
      JSON.stringify(recoveryFile, null, 2),
      { encoding: 'utf-8', mode: 0o600 }
    );
    
    // Prune old auto-saves
    if (type === 'auto') {
      await this.pruneOldAutoSaves();
    }
    
    const duration = Date.now() - startTime;
    console.log(`[Recovery] Saved ${type}: ${recoveryFile.meta.sessionId} (${duration}ms)`);
    
    return recoveryFile.meta.sessionId;
    
  } catch (error) {
    console.error('[Recovery] Save failed:', error);
    throw error;
  }
}

private async performHealthCheck(state: RecoveryState): Promise<HealthCheck> {
  let score = 0;
  const warnings: string[] = [];
  
  // File verification (40 points)
  let filesExist = 0;
  for (const file of state.openFiles) {
    try {
      await fs.access(file.absolutePath);
      filesExist++;
    } catch {
      warnings.push(`File missing: ${file.relativeToProject}`);
    }
  }
  
  if (state.openFiles.length > 0) {
    score += (filesExist / state.openFiles.length) * 30;
    
    // Bonus for dirty files
    const dirtyCount = state.openFiles.filter(f => f.isDirty).length;
    score += Math.min(10, dirtyCount * 2);
  }
  
  // Terminal history (20 points)
  if (state.terminals.length > 0) {
    score += 10;
    const commandCount = state.terminals.reduce(
      (sum, t) => sum + t.history.split('\n').length,
      0
    );
    score += Math.min(10, commandCount / 10);
  }
  
  // Claude context (20 points)
  if (state.claudeBridge.conversationHistory.length > 0) {
    score += 10;
    score += Math.min(
      10,
      state.claudeBridge.conversationHistory.length / 3
    );
  }
  
  // Git state sync (10 points)
  const gitSynced = await this.verifyGitState(state.git);
  if (gitSynced) {
    score += 10;
  } else {
    warnings.push('Git state may have changed');
  }
  
  // Recency (10 points)
  score += 10; // Always give full points since it's a new save
  
  return {
    recoveryScore: Math.min(100, Math.round(score)),
    canFullyRestore: score >= 80,
    warnings,
    filesVerified: filesExist === state.openFiles.length,
    gitStateSynced: gitSynced
  };
}

private calculateStats(state: RecoveryState): RecoveryStats {
  return {
    fileCount: state.openFiles.length,
    dirtyFileCount: state.openFiles.filter(f => f.isDirty).length,
    totalFileSize: state.openFiles.reduce(
      (sum, f) => sum + f.content.length,
      0
    ),
    terminalCommandCount: state.terminals.reduce(
      (sum, t) => sum + t.history.split('\n').length,
      0
    ),
    conversationMessageCount: state.claudeBridge.conversationHistory.length,
    compressionRatio: 1.0 // No compression in MVP
  };
}

private generateSessionId(): string {
  const timestamp = Date.now();
  const random = this.randomId();
  return `session_${timestamp}_${random}`;
}

private randomId(): string {
  return crypto.randomBytes(4).toString('hex');
}

private async getMachineId(): Promise<string> {
  // Create consistent machine ID from hostname + user
  const { hostname } = os;
  const user = os.userInfo().username;
  const data = `${hostname()}-${user}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

private async pruneOldAutoSaves(): Promise<void> {
  const sessionsDir = path.join(this.recoveryDir, 'sessions');
  const files = await fs.readdir(sessionsDir);
  
  // Load all recovery files
  const recoveries: Array<{ file: string; data: RecoveryFile }> = [];
  
  for (const file of files) {
    try {
      const filepath = path.join(sessionsDir, file);
      const content = await fs.readFile(filepath, 'utf-8');
      const data = JSON.parse(content);
      recoveries.push({ file, data });
    } catch (error) {
      // Skip corrupted files
      console.warn(`[Recovery] Corrupted file: ${file}`);
    }
  }
  
  // Sort by timestamp (newest first)
  recoveries.sort((a, b) => b.data.meta.timestamp - a.data.meta.timestamp);
  
  // Keep only maxAutoSaves
  const toDelete = recoveries.slice(this.maxAutoSaves);
  
  for (const { file } of toDelete) {
    try {
      await fs.unlink(path.join(sessionsDir, file));
      console.log(`[Recovery] Pruned old save: ${file}`);
    } catch (error) {
      console.error(`[Recovery] Failed to delete ${file}:`, error);
    }
  }
}
```

---

## Find Recoverable Session

### services/LocalRecoveryService.ts (continued)

```typescript
async findRecoverableSession(): Promise<RecoveryFile | null> {
  // Check if last exit was clean
  const lastExitFile = path.join(this.recoveryDir, 'last_exit.json');
  
  try {
    const lastExit = JSON.parse(await fs.readFile(lastExitFile, 'utf-8'));
    
    if (lastExit.wasClean && Date.now() - lastExit.timestamp < 60000) {
      // Clean exit within last minute - no recovery needed
      console.log('[Recovery] Last exit was clean');
      return null;
    }
  } catch {
    // No last exit file - possible crash
    console.log('[Recovery] No clean exit marker found');
  }
  
  // Look for recent auto-saves
  const sessionsDir = path.join(this.recoveryDir, 'sessions');
  
  try {
    const files = await fs.readdir(sessionsDir);
    const candidates: RecoveryFile[] = [];
    
    for (const file of files) {
      try {
        const filepath = path.join(sessionsDir, file);
        const content = await fs.readFile(filepath, 'utf-8');
        const recovery: RecoveryFile = JSON.parse(content);
        
        // Filter by score and age
        const age = Date.now() - recovery.meta.timestamp;
        const maxAge = 30 * 60 * 1000; // 30 minutes
        
        if (recovery.health.recoveryScore >= 60 && age < maxAge) {
          candidates.push(recovery);
        }
      } catch (error) {
        console.warn(`[Recovery] Failed to load ${file}:`, error);
      }
    }
    
    if (candidates.length === 0) {
      return null;
    }
    
    // Sort by timestamp (newest first)
    candidates.sort((a, b) => b.meta.timestamp - a.meta.timestamp);
    
    // Return best candidate
    const best = candidates[0];
    console.log(`[Recovery] Found candidate: ${best.meta.sessionId} (score: ${best.health.recoveryScore})`);
    
    return best;
    
  } catch (error) {
    console.error('[Recovery] Error finding recoverable session:', error);
    return null;
  }
}

async markCleanExit(): Promise<void> {
  const lastExitFile = path.join(this.recoveryDir, 'last_exit.json');
  
  await fs.writeFile(
    lastExitFile,
    JSON.stringify({
      wasClean: true,
      timestamp: Date.now()
    }),
    'utf-8'
  );
  
  console.log('[Recovery] Marked clean exit');
}
```

---

## Restore Session

### services/LocalRecoveryService.ts (continued)

```typescript
async restoreSession(sessionId: string): Promise<void> {
  console.log(`[Recovery] Restoring session: ${sessionId}`);
  
  // Find recovery file
  const recovery = await this.loadRecoveryFile(sessionId);
  if (!recovery) {
    throw new Error(`Recovery file not found: ${sessionId}`);
  }
  
  // Verify project path
  try {
    await fs.access(recovery.meta.projectPath);
  } catch {
    throw new Error(
      `Project path no longer exists: ${recovery.meta.projectPath}`
    );
  }
  
  // Restore in phases
  await this.restoreFiles(recovery.state.openFiles);
  await this.restoreTerminals(recovery.state.terminals);
  await this.restoreLayout(recovery.state.layout);
  
  // Optional: Restore Claude Bridge
  if (recovery.state.claudeBridge.isConnected) {
    await this.restoreClaudeBridge(recovery.state.claudeBridge);
  }
  
  console.log('[Recovery] Session restored successfully');
}

private async restoreFiles(files: OpenFileState[]): Promise<void> {
  const store = useIDEStore.getState();
  
  for (const file of files) {
    try {
      // Verify file still exists
      await fs.access(file.absolutePath);
      
      // Open in editor
      await store.openFile(file.relativeToProject);
      
      // Set content (including unsaved changes)
      const editor = store.editorInstances.get(file.relativeToProject);
      if (!editor) continue;
      
      const model = editor.getModel();
      if (!model) continue;
      
      model.setValue(file.content);
      
      // Restore cursor position
      editor.setPosition({
        lineNumber: file.cursorPosition.line,
        column: file.cursorPosition.column
      });
      
      // Restore scroll position
      editor.setScrollTop(file.scrollTop);
      
      // Restore selections
      if (file.selections.length > 0) {
        const selections = file.selections.map(sel => ({
          startLineNumber: sel.start.line,
          startColumn: sel.start.column,
          endLineNumber: sel.end.line,
          endColumn: sel.end.column
        }));
        editor.setSelections(selections);
      }
      
      // Mark as dirty if it was
      if (file.isDirty) {
        store.markFileDirty(file.relativeToProject);
      }
      
      console.log(`[Recovery] Restored file: ${file.relativeToProject}`);
      
    } catch (error) {
      console.warn(`[Recovery] Failed to restore ${file.relativeToProject}:`, error);
    }
  }
}

private async restoreTerminals(terminals: TerminalState[]): Promise<void> {
  const store = useIDEStore.getState();
  
  for (const terminal of terminals) {
    // Note: In MVP, we can't restore live PTY state
    // Just display the history
    
    store.addTerminalHistory(terminal.id, terminal.history);
    store.setTerminalCwd(terminal.id, terminal.cwd);
    
    console.log(`[Recovery] Restored terminal: ${terminal.id}`);
  }
}

private async restoreLayout(layout: LayoutState): Promise<void> {
  const store = useIDEStore.getState();
  
  store.setLeftPanelWidth(layout.leftPanelWidth);
  store.setRightPanelWidth(layout.rightPanelWidth);
  store.setTerminalHeight(layout.terminalHeight);
  store.setActiveLeftTab(layout.activeLeftTab);
  store.setActiveRightTab(layout.activeRightTab);
  store.setLeftPanelCollapsed(layout.leftPanelCollapsed);
  store.setRightPanelCollapsed(layout.rightPanelCollapsed);
  
  console.log('[Recovery] Restored layout');
}

private async restoreClaudeBridge(bridge: ClaudeBridgeState): Promise<void> {
  // Try to restore conversation context
  // Implementation depends on your bridge architecture
  
  console.log('[Recovery] Attempting to restore Claude Bridge context');
  
  try {
    const response = await fetch('/api/bridge/restore-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationHistory: bridge.conversationHistory,
        activeTask: bridge.activeTask
      })
    });
    
    if (response.ok) {
      console.log('[Recovery] Claude Bridge context restored');
    } else {
      console.warn('[Recovery] Failed to restore Claude Bridge context');
    }
  } catch (error) {
    console.error('[Recovery] Error restoring Claude Bridge:', error);
  }
}

private async loadRecoveryFile(sessionId: string): Promise<RecoveryFile | null> {
  // Check all directories
  const subdirs = ['sessions', 'snapshots', 'emergency'];
  
  for (const subdir of subdirs) {
    const dir = path.join(this.recoveryDir, subdir);
    
    try {
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const filepath = path.join(dir, file);
        const content = await fs.readFile(filepath, 'utf-8');
        const recovery: RecoveryFile = JSON.parse(content);
        
        if (recovery.meta.sessionId === sessionId) {
          return recovery;
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  return null;
}
```

---

## Auto-Save Manager

### services/AutoSaveManager.ts

```typescript
import { recoveryService } from './LocalRecoveryService';
import { EventEmitter } from 'events';

export class AutoSaveManager extends EventEmitter {
  private intervalId?: NodeJS.Timeout;
  private lastSave = 0;
  private minInterval = 60 * 1000; // 1 minute minimum
  private saveInterval = 5 * 60 * 1000; // 5 minutes
  
  async start(): Promise<void> {
    console.log('[AutoSave] Starting manager');
    
    // Periodic save
    this.intervalId = setInterval(() => {
      this.triggerSave('periodic');
    }, this.saveInterval);
    
    // Emergency saves on crashes
    process.on('SIGTERM', () => this.emergencySave());
    process.on('SIGINT', () => this.emergencySave());
    process.on('uncaughtException', () => this.emergencySave());
    process.on('unhandledRejection', () => this.emergencySave());
    
    // Watch for events (implement based on your event system)
    this.watchForEvents();
  }
  
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    console.log('[AutoSave] Stopped manager');
  }
  
  private async triggerSave(reason: string): Promise<void> {
    const now = Date.now();
    
    // Rate limiting
    if (now - this.lastSave < this.minInterval) {
      return;
    }
    
    try {
      const sessionId = await recoveryService.saveRecoveryPoint('auto');
      this.lastSave = now;
      
      this.emit('save:complete', { sessionId, reason });
      console.log(`[AutoSave] Saved (${reason})`);
      
    } catch (error) {
      this.emit('save:error', error);
      console.error('[AutoSave] Save failed:', error);
    }
  }
  
  private async emergencySave(): Promise<void> {
    console.log('[AutoSave] Emergency save triggered');
    
    try {
      await recoveryService.saveRecoveryPoint('crash');
      console.log('[AutoSave] Emergency save completed');
    } catch (error) {
      console.error('[AutoSave] Emergency save failed:', error);
    }
  }
  
  private watchForEvents(): void {
    // Implement based on your event system
    // Examples:
    
    // File save events
    global.eventBus?.on('file:saved', () => {
      this.triggerSave('file-saved');
    });
    
    // Claude response events
    global.eventBus?.on('claude:response:complete', () => {
      this.triggerSave('claude-complete');
    });
    
    // Terminal command events
    global.eventBus?.on('terminal:command:complete', () => {
      this.triggerSave('terminal-command');
    });
  }
}

// Singleton export
export const autoSaveManager = new AutoSaveManager();
```

---

## React Components

### components/recovery/RecoveryModal.tsx

```typescript
'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  CircularProgress,
  Alert,
  Accordion,
  AccordionItem
} from '@nextui-org/react';
import { RecoveryFile } from '@/types/recovery';

export function RecoveryModal() {
  const [recovery, setRecovery] = useState<RecoveryFile | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  
  useEffect(() => {
    checkForRecovery();
  }, []);
  
  async function checkForRecovery() {
    try {
      const response = await fetch('/api/recovery/check');
      const data = await response.json();
      
      if (data.hasRecovery) {
        setRecovery(data.recovery);
      }
    } catch (error) {
      console.error('[Recovery] Check failed:', error);
    }
  }
  
  async function handleRecover() {
    if (!recovery) return;
    
    setIsRestoring(true);
    
    try {
      const response = await fetch(
        `/api/recovery/restore/${recovery.meta.sessionId}`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        // Success - close modal
        setRecovery(null);
        
        // Show success toast
        alert('Session restored successfully!');
      } else {
        throw new Error('Recovery failed');
      }
    } catch (error) {
      console.error('[Recovery] Restore failed:', error);
      alert('Failed to restore session. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  }
  
  async function handleStartFresh() {
    setRecovery(null);
  }
  
  if (!recovery) return null;
  
  const age = formatTimeAgo(recovery.meta.timestamp);
  const score = recovery.health.recoveryScore;
  const scoreColor = score >= 90 ? 'success' : 
                     score >= 70 ? 'warning' : 'danger';
  
  return (
    <Modal 
      isOpen 
      isDismissable={false}
      backdrop="blur"
      size="2xl"
    >
      <ModalContent>
        <ModalHeader>
          <h2>🛟 Session Recovery Available</h2>
        </ModalHeader>
        
        <ModalBody>
          <Alert color="warning" variant="flat">
            Your last session ended unexpectedly {age}
          </Alert>
          
          <div className="flex items-center justify-center gap-4 py-4">
            <CircularProgress
              value={score}
              color={scoreColor}
              size="lg"
              showValueLabel
            />
            <div>
              <p className="text-sm text-gray-500">Recovery Confidence</p>
              <p className="text-2xl font-bold">{score}/100</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="font-semibold">Will restore:</p>
            <ul className="space-y-1 pl-4">
              <li>✅ {recovery.stats.fileCount} open files 
                ({recovery.stats.dirtyFileCount} with unsaved changes)</li>
              <li>✅ Terminal history ({recovery.stats.terminalCommandCount} commands)</li>
              {recovery.stats.conversationMessageCount > 0 && (
                <li>✅ Claude conversation ({recovery.stats.conversationMessageCount} messages)</li>
              )}
              <li>✅ Workspace layout and cursor positions</li>
            </ul>
          </div>
          
          {recovery.health.warnings.length > 0 && (
            <Accordion>
              <AccordionItem title={`⚠️ ${recovery.health.warnings.length} Warning(s)`}>
                <ul className="space-y-1 text-sm">
                  {recovery.health.warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </AccordionItem>
            </Accordion>
          )}
        </ModalBody>
        
        <ModalFooter>
          <Button
            color="primary"
            size="lg"
            onClick={handleRecover}
            isLoading={isRestoring}
          >
            Recover Session
          </Button>
          <Button
            variant="flat"
            onClick={handleStartFresh}
            disabled={isRestoring}
          >
            Start Fresh
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
```

---

## API Routes

### app/api/recovery/check/route.ts

```typescript
import { NextResponse } from 'next/server';
import { recoveryService } from '@/services/LocalRecoveryService';

export async function GET() {
  try {
    // Feature flag check
    if (process.env.ENABLE_SESSION_RESCUE !== 'true') {
      return NextResponse.json({ hasRecovery: false });
    }
    
    // Find recoverable session
    const recovery = await recoveryService.findRecoverableSession();
    
    if (recovery) {
      return NextResponse.json({
        hasRecovery: true,
        recovery
      });
    } else {
      return NextResponse.json({ hasRecovery: false });
    }
    
  } catch (error) {
    console.error('[API] Recovery check error:', error);
    return NextResponse.json(
      { error: 'Failed to check for recovery' },
      { status: 500 }
    );
  }
}
```

### app/api/recovery/restore/[sessionId]/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { recoveryService } from '@/services/LocalRecoveryService';

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Feature flag check
    if (process.env.ENABLE_SESSION_RESCUE !== 'true') {
      return NextResponse.json(
        { error: 'Session Rescue is disabled' },
        { status: 403 }
      );
    }
    
    const { sessionId } = params;
    
    // Restore session
    await recoveryService.restoreSession(sessionId);
    
    return NextResponse.json({
      success: true,
      message: 'Session restored successfully'
    });
    
  } catch (error) {
    console.error('[API] Restore error:', error);
    return NextResponse.json(
      { error: 'Failed to restore session', details: String(error) },
      { status: 500 }
    );
  }
}
```

---

## Utility Functions

### lib/recovery-utils.ts

```typescript
export function isRecoveryEnabled(): boolean {
  return process.env.ENABLE_SESSION_RESCUE === 'true';
}

export function getRecoveryDir(): string {
  return process.env.SESSION_RESCUE_DIR || 
         path.join(os.homedir(), '.coder1', 'recovery');
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
}

export function getScoreColor(score: number): string {
  if (score >= 90) return 'success';
  if (score >= 70) return 'warning';
  return 'danger';
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  if (score >= 60) return 'Moderate';
  return 'Poor';
}
```

---

## Server Integration

### server.js (or app/layout.tsx)

```typescript
// Initialize recovery service on startup
import { recoveryService } from '@/services/LocalRecoveryService';
import { autoSaveManager } from '@/services/AutoSaveManager';

async function initializeRecovery() {
  if (process.env.ENABLE_SESSION_RESCUE !== 'true') {
    console.log('[Recovery] Feature disabled');
    return;
  }
  
  try {
    // Initialize recovery service
    await recoveryService.initialize();
    
    // Check for recoverable sessions
    const recovery = await recoveryService.findRecoverableSession();
    if (recovery) {
      console.log('╔══════════════════════════════════════════╗');
      console.log('║   🛟 RECOVERY AVAILABLE                  ║');
      console.log('╚══════════════════════════════════════════╝');
      console.log(`Session from: ${new Date(recovery.meta.timestamp).toLocaleString()}`);
      console.log(`Recovery Score: ${recovery.health.recoveryScore}/100`);
      console.log('Visit http://localhost:3001/ide to recover');
    }
    
    // Start auto-save manager
    await autoSaveManager.start();
    
    // Mark clean exit on shutdown
    process.on('beforeExit', async () => {
      await recoveryService.markCleanExit();
    });
    
  } catch (error) {
    console.error('[Recovery] Initialization failed:', error);
  }
}

// Call during startup
initializeRecovery();
```

---

## Testing Helpers

### tests/recovery-test-utils.ts

```typescript
export function createMockRecoveryFile(): RecoveryFile {
  return {
    meta: {
      sessionId: 'session_123456_test',
      timestamp: Date.now(),
      projectPath: '/test/project',
      projectName: 'test-project',
      machineId: 'test-machine',
      coder1Version: '1.0.0',
      recoveryVersion: '1.0.0',
      saveReason: 'auto'
    },
    state: {
      openFiles: [
        {
          absolutePath: '/test/project/src/app.ts',
          relativeToProject: 'src/app.ts',
          content: 'console.log("test");',
          isDirty: true,
          language: 'typescript',
          cursorPosition: { line: 1, column: 1 },
          scrollTop: 0,
          selections: []
        }
      ],
      terminals: [],
      claudeBridge: {
        isConnected: false,
        bridgeVersion: '1.0.0',
        lastActivity: Date.now(),
        conversationHistory: []
      },
      git: {
        branch: 'main',
        hasUncommitted: false,
        uncommittedFiles: [],
        lastCommit: 'abc123'
      },
      layout: {
        leftPanelWidth: 250,
        rightPanelWidth: 300,
        terminalHeight: 300,
        activeLeftTab: 'files',
        activeRightTab: 'none',
        leftPanelCollapsed: false,
        rightPanelCollapsed: false
      }
    },
    health: {
      recoveryScore: 85,
      canFullyRestore: true,
      warnings: [],
      filesVerified: true,
      gitStateSynced: true
    },
    stats: {
      fileCount: 1,
      dirtyFileCount: 1,
      totalFileSize: 100,
      terminalCommandCount: 0,
      conversationMessageCount: 0,
      compressionRatio: 1.0
    }
  };
}
```

---

## Environment Variables

### .env.local.example

```bash
# Session Rescue Feature
ENABLE_SESSION_RESCUE=false

# Storage Configuration
SESSION_RESCUE_DIR=~/.coder1/recovery
SESSION_RESCUE_MAX_AUTO_SAVES=10
SESSION_RESCUE_MAX_AGE_DAYS=7

# Behavior
SESSION_RESCUE_AUTO_SAVE_INTERVAL=300000
SESSION_RESCUE_MIN_SCORE=60
SESSION_RESCUE_ENABLE_COMPRESSION=false

# Debug
SESSION_RESCUE_DEBUG=false
```

---

**All code is ready to copy-paste and adapt. Start implementation when alpha is stable!**

---

*Code Examples Version: 1.0.0*  
*Last Updated: January 2025*  
*Ready for Implementation*
