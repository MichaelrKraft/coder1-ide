/**
 * SessionManager Service
 * 
 * Handles automatic backup and recovery of critical IDE state to prevent data loss
 * from accidental navigation or browser crashes.
 */

export interface TerminalSessionData {
  terminalHistory: string;
  terminalCommands: string[];
  isConnected: boolean;
  sessionId: string | null;
  lastCommand: string;
}

export interface AIModesState {
  isSupervisionOn: boolean;
  isParallelAgents: boolean;
  isInfiniteLoop: boolean;
  isTaskDelegationActive: boolean;
  isClaudeCodeActive: boolean;
  claudeSessions: Record<string, string>;
  infiniteSessionId: string | null;
}

export interface IDESessionData {
  timestamp: number;
  version: string;
  terminal: TerminalSessionData;
  aiModes: AIModesState;
  activeView: 'explorer' | 'terminal' | 'preview';
  openFiles: string[];
  activeFile: string | null;
  commandHistory: string[];
  terminalBuffer: string;
}

export class SessionManager {
  private static readonly STORAGE_KEY = 'coder1-ide-session';
  private static readonly BACKUP_KEY = 'coder1-ide-session-backup';
  private static readonly VERSION = '1.0.0';
  private static readonly AUTO_SAVE_INTERVAL = 10000; // 10 seconds
  
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private isAutoSaveEnabled: boolean = false;

  constructor() {
    console.log('💾 SessionManager initialized');
  }

  /**
   * Start automatic session backup
   */
  startAutoSave(): void {
    if (this.isAutoSaveEnabled) return;
    
    this.isAutoSaveEnabled = true;
    console.log('💾 Auto-save enabled (every 10 seconds)');
    
    this.autoSaveTimer = setInterval(() => {
      this.saveCurrentSession();
    }, SessionManager.AUTO_SAVE_INTERVAL);
  }

  /**
   * Stop automatic session backup
   */
  stopAutoSave(): void {
    if (!this.isAutoSaveEnabled) return;
    
    this.isAutoSaveEnabled = false;
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    console.log('💾 Auto-save disabled');
  }

  /**
   * Save current session data to localStorage
   */
  saveCurrentSession(): void {
    try {
      const sessionData = this.collectCurrentSessionData();
      
      // Save current session
      localStorage.setItem(SessionManager.STORAGE_KEY, JSON.stringify(sessionData));
      
      // Keep a backup of the previous session
      const existing = localStorage.getItem(SessionManager.STORAGE_KEY);
      if (existing) {
        localStorage.setItem(SessionManager.BACKUP_KEY, existing);
      }
      
      console.log('💾 Session saved automatically');
    } catch (error) {
      console.error('💾 Failed to save session:', error);
    }
  }

  /**
   * Restore session data from localStorage
   */
  restoreSession(): IDESessionData | null {
    try {
      const saved = localStorage.getItem(SessionManager.STORAGE_KEY);
      if (!saved) {
        console.log('💾 No saved session found');
        return null;
      }

      const sessionData: IDESessionData = JSON.parse(saved);
      
      // Check if session is recent (within last 24 hours)
      const ageHours = (Date.now() - sessionData.timestamp) / (1000 * 60 * 60);
      if (ageHours > 24) {
        console.log('💾 Saved session is too old, ignoring');
        this.clearSession();
        return null;
      }

      console.log(`💾 Session restored (${Math.round(ageHours * 60)} minutes old)`);
      return sessionData;
    } catch (error) {
      console.error('💾 Failed to restore session:', error);
      return null;
    }
  }

  /**
   * Check if a recent session exists
   */
  hasRecentSession(): boolean {
    try {
      const saved = localStorage.getItem(SessionManager.STORAGE_KEY);
      if (!saved) return false;

      const sessionData: IDESessionData = JSON.parse(saved);
      const ageHours = (Date.now() - sessionData.timestamp) / (1000 * 60 * 60);
      
      return ageHours <= 24;
    } catch {
      return false;
    }
  }

  /**
   * Get session age in minutes
   */
  getSessionAge(): number {
    try {
      const saved = localStorage.getItem(SessionManager.STORAGE_KEY);
      if (!saved) return -1;

      const sessionData: IDESessionData = JSON.parse(saved);
      return Math.round((Date.now() - sessionData.timestamp) / (1000 * 60));
    } catch {
      return -1;
    }
  }

  /**
   * Clear saved session data
   */
  clearSession(): void {
    localStorage.removeItem(SessionManager.STORAGE_KEY);
    localStorage.removeItem(SessionManager.BACKUP_KEY);
    console.log('💾 Session data cleared');
  }

  /**
   * Collect current session data from DOM and global state
   */
  private collectCurrentSessionData(): IDESessionData {
    // Get terminal state from global references
    const terminalData = this.getTerminalState();
    const aiModes = this.getAIModeState();
    
    return {
      timestamp: Date.now(),
      version: SessionManager.VERSION,
      terminal: terminalData,
      aiModes: aiModes,
      activeView: this.getCurrentView(),
      openFiles: this.getOpenFiles(),
      activeFile: this.getActiveFile(),
      commandHistory: this.getCommandHistory(),
      terminalBuffer: this.getTerminalBuffer()
    };
  }

  /**
   * Extract terminal state from global window object and DOM
   */
  private getTerminalState(): TerminalSessionData {
    const windowAny = window as any;
    
    return {
      terminalHistory: this.getTerminalHistory(),
      terminalCommands: windowAny.terminalCommands || [],
      isConnected: windowAny.isTerminalConnected || false,
      sessionId: windowAny.currentTerminalSessionId || null,
      lastCommand: windowAny.currentCommandBuffer || ''
    };
  }

  /**
   * Extract AI modes state from global references
   */
  private getAIModeState(): AIModesState {
    const windowAny = window as any;
    
    return {
      isSupervisionOn: windowAny.isSupervisionOn || false,
      isParallelAgents: windowAny.isParallelAgents || false,
      isInfiniteLoop: windowAny.isInfiniteLoop || false,
      isTaskDelegationActive: windowAny.isTaskDelegationActive || false,
      isClaudeCodeActive: windowAny.isClaudeCodeActive || false,
      claudeSessions: this.convertMapToRecord(windowAny.claudeSessions),
      infiniteSessionId: windowAny.infiniteSessionId || null
    };
  }

  /**
   * Get current active view
   */
  private getCurrentView(): 'explorer' | 'terminal' | 'preview' {
    // Try to detect from DOM or return default
    const activePanel = document.querySelector('.panel.active');
    if (activePanel?.classList.contains('explorer')) return 'explorer';
    if (activePanel?.classList.contains('preview')) return 'preview';
    return 'terminal'; // Default
  }

  /**
   * Get list of open files
   */
  private getOpenFiles(): string[] {
    const tabs = document.querySelectorAll('.file-tab');
    return Array.from(tabs).map(tab => tab.textContent || '').filter(Boolean);
  }

  /**
   * Get currently active file
   */
  private getActiveFile(): string | null {
    const activeTab = document.querySelector('.file-tab.active');
    return activeTab?.textContent || null;
  }

  /**
   * Get command history from terminal
   */
  private getCommandHistory(): string[] {
    const windowAny = window as any;
    return windowAny.commandHistory || [];
  }

  /**
   * Get terminal buffer content
   */
  private getTerminalBuffer(): string {
    const windowAny = window as any;
    return windowAny.terminalBuffer || '';
  }

  /**
   * Get terminal history from xterm instance
   */
  private getTerminalHistory(): string {
    try {
      const windowAny = window as any;
      const terminal = windowAny.xtermInstance;
      
      if (terminal && terminal.buffer) {
        const buffer = terminal.buffer.active;
        let content = '';
        
        const lines = Math.min(buffer.length, 100); // Last 100 lines
        for (let i = Math.max(0, buffer.length - lines); i < buffer.length; i++) {
          const line = buffer.getLine(i);
          if (line) {
            content += line.translateToString(true) + '\n';
          }
        }
        
        return content.trim();
      }
    } catch (error) {
      console.warn('💾 Could not extract terminal history:', error);
    }
    
    return '';
  }

  /**
   * Convert Map to plain object for serialization
   */
  private convertMapToRecord(map: Map<string, string> | undefined): Record<string, string> {
    if (!map || !(map instanceof Map)) return {};
    
    const record: Record<string, string> = {};
    map.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }

  /**
   * Export session data for manual backup
   */
  exportSession(): string {
    const sessionData = this.collectCurrentSessionData();
    return JSON.stringify(sessionData, null, 2);
  }

  /**
   * Import session data from manual backup
   */
  importSession(jsonData: string): boolean {
    try {
      const sessionData: IDESessionData = JSON.parse(jsonData);
      localStorage.setItem(SessionManager.STORAGE_KEY, JSON.stringify(sessionData));
      console.log('💾 Session imported successfully');
      return true;
    } catch (error) {
      console.error('💾 Failed to import session:', error);
      return false;
    }
  }
}

// Singleton instance
export const sessionManager = new SessionManager();