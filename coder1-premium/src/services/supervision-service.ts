/**
 * Supervision Service - AI Supervision Implementation
 * Real-time code guidance and error prevention using Claude Code CLI
 * 
 * ZERO API COSTS - Uses Claude Code CLI instead of paid Anthropic API
 */

import { spawn } from 'child_process';
import { Pool } from 'pg';
import { logger } from '../utils/logger';

interface SupervisionSession {
  userId: string;
  sessionId: string;
  active: boolean;
  startedAt: Date;
  lastCheckAt: Date | null;
  checksPerformed: number;
}

interface CodeAnalysis {
  guidance: string;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    line?: number;
    suggestion?: string;
  }>;
  suggestions: string[];
  timestamp: Date;
}

class SupervisionService {
  private pool: Pool;
  private activeSessions: Map<string, SupervisionSession>;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.activeSessions = new Map();

    this.pool.on('error', (err) => {
      logger.error('Unexpected database pool error', err);
    });

    // Verify Claude Code CLI is available
    this.verifyCLI();
  }

  /**
   * Verify Claude Code CLI is installed and authenticated
   */
  private async verifyCLI(): Promise<void> {
    try {
      const result = await this.executeCLI('claude --version', 5000);
      logger.info(`✅ Claude Code CLI available: ${result.trim()}`);
    } catch (error) {
      logger.warn('⚠️ Claude Code CLI not available - supervision analysis will be limited');
    }
  }

  /**
   * Initialize database tables
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS supervision_sessions (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          session_id VARCHAR(255) NOT NULL UNIQUE,
          active BOOLEAN DEFAULT true,
          started_at TIMESTAMP DEFAULT NOW(),
          ended_at TIMESTAMP,
          checks_performed INTEGER DEFAULT 0,
          issues_found INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_supervision_user_id ON supervision_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_supervision_session_id ON supervision_sessions(session_id);
        CREATE INDEX IF NOT EXISTS idx_supervision_active ON supervision_sessions(active);

        CREATE TABLE IF NOT EXISTS supervision_checks (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(255) NOT NULL,
          code_snippet TEXT,
          analysis JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_checks_session_id ON supervision_checks(session_id);
      `);

      logger.info('Supervision service database tables initialized');
    } finally {
      client.release();
    }
  }

  /**
   * Enable AI supervision for a session
   */
  async enable(userId: string, sessionId: string): Promise<void> {
    const session: SupervisionSession = {
      userId,
      sessionId,
      active: true,
      startedAt: new Date(),
      lastCheckAt: null,
      checksPerformed: 0,
    };

    this.activeSessions.set(sessionId, session);

    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO supervision_sessions (user_id, session_id, active)
         VALUES ($1, $2, true)
         ON CONFLICT (session_id)
         DO UPDATE SET active = true, started_at = NOW()`,
        [userId, sessionId]
      );

      logger.info(`Supervision enabled for user ${userId}, session ${sessionId}`);
    } finally {
      client.release();
    }
  }

  /**
   * Disable AI supervision
   */
  async disable(userId: string, sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.active = false;
      this.activeSessions.delete(sessionId);
    }

    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE supervision_sessions
         SET active = false, ended_at = NOW()
         WHERE user_id = $1 AND session_id = $2`,
        [userId, sessionId]
      );

      logger.info(`Supervision disabled for user ${userId}, session ${sessionId}`);
    } finally {
      client.release();
    }
  }

  /**
   * Analyze code for issues and provide guidance using Claude Code CLI
   */
  async analyze(code: string, context?: any): Promise<CodeAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(code, context);

      // Execute Claude Code CLI with the analysis prompt
      const response = await this.executeCLI(`claude "${prompt.replace(/"/g, '\\"')}"`, 30000);
      
      const analysis = this.parseAnalysisResponse(response);

      return {
        ...analysis,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error analyzing code with Claude Code CLI', error);
      return {
        guidance: 'Analysis temporarily unavailable - ensure Claude Code CLI is installed and authenticated',
        issues: [],
        suggestions: [],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Execute Claude Code CLI command
   */
  private async executeCLI(command: string, timeout: number = 30000): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', command], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('CLI command timeout'));
      }, timeout);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`CLI command failed: ${stderr || stdout}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Get supervision status for a session
   */
  async getStatus(userId: string, sessionId: string): Promise<{
    active: boolean;
    status: string;
    lastCheck: Date | null;
    checksPerformed: number;
    issuesFound: number;
  }> {
    const inMemorySession = this.activeSessions.get(sessionId);
    if (inMemorySession && inMemorySession.active) {
      return {
        active: true,
        status: 'active',
        lastCheck: inMemorySession.lastCheckAt,
        checksPerformed: inMemorySession.checksPerformed,
        issuesFound: 0,
      };
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT active, checks_performed, issues_found, started_at
         FROM supervision_sessions
         WHERE user_id = $1 AND session_id = $2
         ORDER BY started_at DESC
         LIMIT 1`,
        [userId, sessionId]
      );

      if (result.rows.length === 0) {
        return {
          active: false,
          status: 'inactive',
          lastCheck: null,
          checksPerformed: 0,
          issuesFound: 0,
        };
      }

      const row = result.rows[0];
      return {
        active: row.active,
        status: row.active ? 'active' : 'inactive',
        lastCheck: row.started_at,
        checksPerformed: row.checks_performed,
        issuesFound: row.issues_found,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Record a supervision check
   */
  private async recordCheck(sessionId: string, code: string, analysis: CodeAnalysis): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastCheckAt = new Date();
      session.checksPerformed++;
    }

    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO supervision_checks (session_id, code_snippet, analysis)
         VALUES ($1, $2, $3)`,
        [sessionId, code, JSON.stringify(analysis)]
      );

      await client.query(
        `UPDATE supervision_sessions
         SET checks_performed = checks_performed + 1,
             issues_found = issues_found + $2
         WHERE session_id = $1`,
        [sessionId, analysis.issues.length]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Build analysis prompt for Claude
   */
  private buildAnalysisPrompt(code: string, context?: any): string {
    let prompt = `You are an AI code supervisor. Analyze the following code and provide:
1. Brief guidance on code quality and best practices
2. Any issues found (errors, warnings, or suggestions)
3. Specific suggestions for improvement

Code to analyze:
\`\`\`
${code}
\`\`\`
`;

    if (context) {
      prompt += `\n\nAdditional context:\n${JSON.stringify(context, null, 2)}`;
    }

    prompt += `\n\nProvide your analysis in the following format:
GUIDANCE: [Your brief guidance]
ISSUES: [List any issues, one per line with severity (ERROR/WARNING/INFO) and message]
SUGGESTIONS: [List specific suggestions, one per line]`;

    return prompt;
  }

  /**
   * Parse Claude's analysis response
   */
  private parseAnalysisResponse(response: string): Omit<CodeAnalysis, 'timestamp'> {
    const guidanceMatch = response.match(/GUIDANCE:\s*(.+?)(?=\nISSUES:|$)/s);
    const issuesMatch = response.match(/ISSUES:\s*(.+?)(?=\nSUGGESTIONS:|$)/s);
    const suggestionsMatch = response.match(/SUGGESTIONS:\s*(.+?)$/s);

    const guidance = guidanceMatch ? guidanceMatch[1].trim() : 'No specific guidance provided';
    
    const issues = [];
    if (issuesMatch) {
      const issueLines = issuesMatch[1].trim().split('\n');
      for (const line of issueLines) {
        const match = line.match(/^\s*\*?\s*(ERROR|WARNING|INFO):\s*(.+)$/);
        if (match) {
          issues.push({
            severity: match[1].toLowerCase() as 'error' | 'warning' | 'info',
            message: match[2].trim(),
          });
        }
      }
    }

    const suggestions = [];
    if (suggestionsMatch) {
      const suggestionLines = suggestionsMatch[1].trim().split('\n');
      for (const line of suggestionLines) {
        const cleaned = line.replace(/^\s*\*?\s*/, '').trim();
        if (cleaned) {
          suggestions.push(cleaned);
        }
      }
    }

    return { guidance, issues, suggestions };
  }

  /**
   * Get supervision statistics for a user
   */
  async getStats(userId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    totalChecks: number;
    totalIssues: number;
  }> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT
           COUNT(*) as total_sessions,
           SUM(CASE WHEN active THEN 1 ELSE 0 END) as active_sessions,
           SUM(checks_performed) as total_checks,
           SUM(issues_found) as total_issues
         FROM supervision_sessions
         WHERE user_id = $1`,
        [userId]
      );

      const row = result.rows[0];
      return {
        totalSessions: parseInt(row.total_sessions) || 0,
        activeSessions: parseInt(row.active_sessions) || 0,
        totalChecks: parseInt(row.total_checks) || 0,
        totalIssues: parseInt(row.total_issues) || 0,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Supervision service database pool closed');
  }
}

export const supervisionService = new SupervisionService();
