/**
 * Browser Session Manager - Phase 2: Web-Native Context System
 * 
 * Implements intelligent browser session detection and mapping to context sessions.
 * This solves the memory exhaustion issue by creating context sessions only when 
 * AI features are actually needed (lazy initialization).
 * 
 * Three-Tier Session System:
 * 1. User Session (localStorage) - Persistent across browser restarts
 * 2. Browser Session (sessionStorage) - Per tab/window, survives page reloads
 * 3. Context Session - Only when AI features used (claude command, etc.)
 */

interface BrowserSessionInfo {
  browserSessionId: string;
  userSessionId: string;
  tabId: string;
  createdAt: number;
  lastActivity: number;
  contextSessionId?: string;
  isNewSession: boolean;
  isNewUser: boolean;
}

interface SessionStorageData {
  browserSessionId: string;
  tabId: string;
  createdAt: number;
  contextSessionId?: string;
}

interface LocalStorageData {
  userSessionId: string;
  createdAt: number;
  lastAccess: number;
  totalSessions: number;
}

class BrowserSessionManager {
  private static instance: BrowserSessionManager;
  private initialized = false;

  // Storage keys
  private readonly SESSION_KEY = 'coder1_browser_session';
  private readonly USER_KEY = 'coder1_user_session';
  private readonly CONTEXT_MAPPING_KEY = 'coder1_context_mapping';

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): BrowserSessionManager {
    if (!BrowserSessionManager.instance) {
      BrowserSessionManager.instance = new BrowserSessionManager();
    }
    return BrowserSessionManager.instance;
  }

  /**
   * Initialize browser session detection
   * Called once when IDE loads - does NOT create context sessions automatically
   */
  initialize(): BrowserSessionInfo {
    if (typeof window === 'undefined') {
      throw new Error('BrowserSessionManager can only be used in browser environment');
    }

    this.initialized = true;
    
    // Get or create user session (persistent)
    const userSession = this.getOrCreateUserSession();
    
    // Get or create browser session (per tab)
    const browserSession = this.getOrCreateBrowserSession();
    
    // Determine if this is a new session/user
    const isNewSession = !sessionStorage.getItem(this.SESSION_KEY);
    const isNewUser = userSession.totalSessions === 1;
    
    const sessionInfo: BrowserSessionInfo = {
      browserSessionId: browserSession.browserSessionId,
      userSessionId: userSession.userSessionId,
      tabId: browserSession.tabId,
      createdAt: browserSession.createdAt,
      lastActivity: Date.now(),
      contextSessionId: browserSession.contextSessionId,
      isNewSession,
      isNewUser
    };

    // Update last activity
    this.updateLastActivity();

    console.log(`🌐 Browser session initialized:`, {
      isNewUser: sessionInfo.isNewUser ? 'Yes' : 'No',
      isNewSession: sessionInfo.isNewSession ? 'Yes (new tab/reload)' : 'No (existing tab)',
      userSessionId: sessionInfo.userSessionId.substring(0, 8) + '...',
      browserSessionId: sessionInfo.browserSessionId.substring(0, 8) + '...',
      totalUserSessions: userSession.totalSessions
    });

    return sessionInfo;
  }

  /**
   * Get current session info without creating new sessions
   */
  getCurrentSession(): BrowserSessionInfo | null {
    if (!this.initialized || typeof window === 'undefined') {
      return null;
    }

    const sessionData = sessionStorage.getItem(this.SESSION_KEY);
    const userData = localStorage.getItem(this.USER_KEY);

    if (!sessionData || !userData) {
      return null;
    }

    const session: SessionStorageData = JSON.parse(sessionData);
    const user: LocalStorageData = JSON.parse(userData);

    return {
      browserSessionId: session.browserSessionId,
      userSessionId: user.userSessionId,
      tabId: session.tabId,
      createdAt: session.createdAt,
      lastActivity: user.lastAccess,
      contextSessionId: session.contextSessionId,
      isNewSession: false,
      isNewUser: false
    };
  }

  /**
   * LAZY CONTEXT ACTIVATION: Create context session only when AI features are needed
   * This is the key to preventing memory exhaustion - context sessions are created
   * on-demand when users actually use AI features like "claude" command
   */
  async activateContextSession(projectPath?: string): Promise<string> {
    const currentSession = this.getCurrentSession();
    if (!currentSession) {
      throw new Error('No browser session found. Initialize first.');
    }

    // If already has context session, return it
    if (currentSession.contextSessionId) {
      console.log(`🧠 Using existing context session: ${currentSession.contextSessionId.substring(0, 8)}...`);
      return currentSession.contextSessionId;
    }

    // Create new context session via API
    const response = await fetch('/api/context/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath: projectPath || '/Users/michaelkraft/autonomous_vibe_interface',
        browserSessionId: currentSession.browserSessionId,
        userSessionId: currentSession.userSessionId,
        autoStart: true
      })
    });

    if (!response.ok) {
      throw new Error(`Context activation failed: ${response.status}`);
    }

    const data = await response.json();
    const contextSessionId = data.stats?.currentSession || `session_${Date.now()}_browser`;

    // Store context session mapping
    this.linkContextSession(contextSessionId);

    console.log(`🧠 Context session activated: ${contextSessionId.substring(0, 8)}... for browser session ${currentSession.browserSessionId.substring(0, 8)}...`);

    return contextSessionId;
  }

  /**
   * Check if context session is active
   */
  hasActiveContext(): boolean {
    const session = this.getCurrentSession();
    return !!(session?.contextSessionId);
  }

  /**
   * Deactivate context session (cleanup)
   */
  deactivateContextSession(): void {
    if (typeof window === 'undefined') return;

    const sessionData = sessionStorage.getItem(this.SESSION_KEY);
    if (sessionData) {
      const session: SessionStorageData = JSON.parse(sessionData);
      delete session.contextSessionId;
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      
      console.log('🧠 Context session deactivated for current browser session');
    }
  }

  /**
   * Get session analytics for debugging
   */
  getSessionAnalytics() {
    const current = this.getCurrentSession();
    const userData = localStorage.getItem(this.USER_KEY);
    const user: LocalStorageData | null = userData ? JSON.parse(userData) : null;

    return {
      current,
      userStats: user ? {
        totalSessions: user.totalSessions,
        userAge: Math.round((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)), // days
        lastAccess: new Date(user.lastAccess).toISOString()
      } : null,
      contextActive: this.hasActiveContext(),
      browserSupport: {
        sessionStorage: typeof sessionStorage !== 'undefined',
        localStorage: typeof localStorage !== 'undefined'
      }
    };
  }

  // Private helper methods

  private getOrCreateUserSession(): LocalStorageData {
    const existing = localStorage.getItem(this.USER_KEY);
    
    if (existing) {
      const userData: LocalStorageData = JSON.parse(existing);
      // Update access time and session count
      userData.lastAccess = Date.now();
      userData.totalSessions += 1;
      localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
      return userData;
    }

    // Create new user session
    const newUser: LocalStorageData = {
      userSessionId: `user_${Date.now()}_${this.generateId()}`,
      createdAt: Date.now(),
      lastAccess: Date.now(),
      totalSessions: 1
    };
    
    localStorage.setItem(this.USER_KEY, JSON.stringify(newUser));
    return newUser;
  }

  private getOrCreateBrowserSession(): SessionStorageData {
    const existing = sessionStorage.getItem(this.SESSION_KEY);
    
    if (existing) {
      return JSON.parse(existing);
    }

    // Create new browser session
    const newSession: SessionStorageData = {
      browserSessionId: `browser_${Date.now()}_${this.generateId()}`,
      tabId: `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now()
    };
    
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(newSession));
    return newSession;
  }

  private linkContextSession(contextSessionId: string): void {
    const sessionData = sessionStorage.getItem(this.SESSION_KEY);
    if (sessionData) {
      const session: SessionStorageData = JSON.parse(sessionData);
      session.contextSessionId = contextSessionId;
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    }
  }

  private updateLastActivity(): void {
    const userData = localStorage.getItem(this.USER_KEY);
    if (userData) {
      const user: LocalStorageData = JSON.parse(userData);
      user.lastAccess = Date.now();
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Cleanup old sessions (to be called periodically)
   */
  static cleanup(): void {
    // This could be enhanced to clean up old localStorage entries
    // For now, browsers handle storage limits automatically
  }
}

// Export singleton instance
export const browserSessionManager = BrowserSessionManager.getInstance();
export default browserSessionManager;