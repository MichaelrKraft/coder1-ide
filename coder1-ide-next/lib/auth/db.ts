import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';

// Database singleton instance
let db: Database.Database | null = null;

export function getAuthDatabase(): Database.Database {
  if (!db) {
    // Create database in data directory (separate from main app data)
    const dbPath = path.join(process.cwd(), 'data', 'auth.db');
    
    db = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
    });

    // Enable foreign keys
    db.exec('PRAGMA foreign_keys = ON');
    
    // Initialize schema if needed
    initializeSchema();
  }
  
  return db;
}

function initializeSchema() {
  if (!db) throw new Error('Database not initialized');
  
  try {
    // Check if users table exists
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    ).get();
    
    if (!tableExists) {
      // Read and execute main schema
      const schemaPath = path.join(process.cwd(), 'db', 'auth-schema.sql');
      const schema = readFileSync(schemaPath, 'utf-8');
      
      // Split by semicolons and execute each statement
      const statements = schema
        .split(';')
        .filter(stmt => stmt.trim())
        .map(stmt => stmt.trim() + ';');
      
      for (const statement of statements) {
        db.exec(statement);
      }
      
      // REMOVED: // REMOVED: console.log('✅ Auth database schema initialized');
    }
    
    // Always try to create OAuth tables (they have IF NOT EXISTS)
    try {
      const oauthSchemaPath = path.join(process.cwd(), 'db', 'oauth-schema.sql');
      const oauthSchema = readFileSync(oauthSchemaPath, 'utf-8');

      const oauthStatements = oauthSchema
        .split(';')
        .filter(stmt => stmt.trim())
        .map(stmt => stmt.trim() + ';');

      for (const statement of oauthStatements) {
        db.exec(statement);
      }
    } catch (err) {
      // OAuth schema is optional
    }

    // Migrate: Add Johnny5 tier tracking columns if they don't exist
    migrateJohnny5TierColumns();
  } catch (error) {
    logger?.error('Error initializing auth database schema:', error);
    // Don't throw - allow app to continue even if auth setup fails
  }
}

function migrateJohnny5TierColumns() {
  if (!db) return;

  // Check if columns exist by trying to query them
  try {
    db.prepare('SELECT claude_subscription_tier FROM users LIMIT 1').get();
  } catch {
    // Column doesn't exist, add it
    db.exec("ALTER TABLE users ADD COLUMN claude_subscription_tier TEXT DEFAULT 'free'");
  }

  try {
    db.prepare('SELECT coder1_pro_active FROM users LIMIT 1').get();
  } catch {
    db.exec("ALTER TABLE users ADD COLUMN coder1_pro_active BOOLEAN DEFAULT 0");
  }

  try {
    db.prepare('SELECT johnny5_message_count FROM users LIMIT 1').get();
  } catch {
    db.exec("ALTER TABLE users ADD COLUMN johnny5_message_count INTEGER DEFAULT 0");
  }

  try {
    db.prepare('SELECT message_count_reset_at FROM users LIMIT 1').get();
  } catch {
    db.exec("ALTER TABLE users ADD COLUMN message_count_reset_at DATETIME DEFAULT CURRENT_TIMESTAMP");
  }
}

// User operations
export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  subscription_tier: 'free' | 'pro' | 'team';
  subscription_status: 'active' | 'cancelled' | 'past_due';
  stripe_customer_id?: string;
  email_verified: boolean;
  // Johnny5 tier tracking
  claude_subscription_tier: 'free' | 'pro' | 'max';
  coder1_pro_active: boolean;
  johnny5_message_count: number;
  message_count_reset_at: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface CreateUserInput {
  email: string;
  username: string;
  password_hash: string;
}

export function createUser(input: CreateUserInput): User {
  const db = getAuthDatabase();
  
  const stmt = db.prepare(`
    INSERT INTO users (email, username, password_hash)
    VALUES (?, ?, ?)
    RETURNING *
  `);
  
  return stmt.get(input.email, input.username, input.password_hash) as User;
}

export function getUserByEmail(email: string): User | undefined {
  const db = getAuthDatabase();
  
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email) as User | undefined;
}

export function getUserByUsername(username: string): User | undefined {
  const db = getAuthDatabase();
  
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username) as User | undefined;
}

export function getUserById(id: string): User | undefined {
  const db = getAuthDatabase();
  
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as User | undefined;
}

export function updateLastLogin(userId: string): void {
  const db = getAuthDatabase();
  
  const stmt = db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(userId);
}

// Session operations
export interface AuthSession {
  id: string;
  user_id: string;
  token: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
  last_used: string;
  user_agent?: string;
  ip_address?: string;
}

export interface CreateSessionInput {
  user_id: string;
  token: string;
  refresh_token: string;
  expires_at: Date;
  user_agent?: string;
  ip_address?: string;
}

export function createSession(input: CreateSessionInput): AuthSession {
  const db = getAuthDatabase();
  
  const stmt = db.prepare(`
    INSERT INTO auth_sessions (user_id, token, refresh_token, expires_at, user_agent, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
    RETURNING *
  `);
  
  return stmt.get(
    input.user_id,
    input.token,
    input.refresh_token,
    input.expires_at.toISOString(),
    input.user_agent,
    input.ip_address
  ) as AuthSession;
}

export function getSessionByToken(token: string): AuthSession | undefined {
  const db = getAuthDatabase();
  
  const stmt = db.prepare('SELECT * FROM auth_sessions WHERE token = ?');
  return stmt.get(token) as AuthSession | undefined;
}

export function deleteSession(token: string): void {
  const db = getAuthDatabase();
  
  const stmt = db.prepare('DELETE FROM auth_sessions WHERE token = ?');
  stmt.run(token);
}

export function deleteUserSessions(userId: string): void {
  const db = getAuthDatabase();
  
  const stmt = db.prepare('DELETE FROM auth_sessions WHERE user_id = ?');
  stmt.run(userId);
}

// Project operations
export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  files_data?: string;
  thumbnail?: string;
  is_public: boolean;
  last_opened?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectInput {
  user_id: string;
  name: string;
  description?: string;
  files_data?: string;
}

export function createProject(input: CreateProjectInput): Project {
  const db = getAuthDatabase();
  
  const stmt = db.prepare(`
    INSERT INTO projects (user_id, name, description, files_data)
    VALUES (?, ?, ?, ?)
    RETURNING *
  `);
  
  return stmt.get(
    input.user_id,
    input.name,
    input.description,
    input.files_data
  ) as Project;
}

export function getUserProjects(userId: string): Project[] {
  const db = getAuthDatabase();
  
  const stmt = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY last_opened DESC, created_at DESC');
  return stmt.all(userId) as Project[];
}

export function getProjectById(id: string, userId: string): Project | undefined {
  const db = getAuthDatabase();
  
  const stmt = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?');
  return stmt.get(id, userId) as Project | undefined;
}

export function updateProject(id: string, userId: string, updates: Partial<Project>): void {
  const db = getAuthDatabase();
  
  const fields = Object.keys(updates)
    .filter(key => key !== 'id' && key !== 'user_id')
    .map(key => `${key} = ?`);
  
  if (fields.length === 0) return;
  
  const values = Object.values(updates);
  values.push(id, userId);
  
  const stmt = db.prepare(`
    UPDATE projects 
    SET ${fields.join(', ')}
    WHERE id = ? AND user_id = ?
  `);
  
  stmt.run(...values);
}

export function deleteProject(id: string, userId: string): void {
  const db = getAuthDatabase();
  
  const stmt = db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?');
  stmt.run(id, userId);
}

// Usage tracking
export interface UsageMetric {
  id: string;
  user_id: string;
  action_type: string;
  action_details?: string;
  timestamp: string;
}

export function trackUsage(userId: string, actionType: string, details?: any): void {
  const db = getAuthDatabase();
  
  const stmt = db.prepare(`
    INSERT INTO usage_metrics (user_id, action_type, action_details)
    VALUES (?, ?, ?)
  `);
  
  stmt.run(userId, actionType, details ? JSON.stringify(details) : null);
}

export function getUserUsageCount(userId: string, actionType: string, since: Date): number {
  const db = getAuthDatabase();
  
  const stmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM usage_metrics 
    WHERE user_id = ? AND action_type = ? AND timestamp >= ?
  `);
  
  const result = stmt.get(userId, actionType, since.toISOString()) as { count: number };
  return result.count;
}

// OAuth operations
export interface OAuthAccount {
  id: string;
  user_id: string;
  provider: string;
  provider_account_id: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
  created_at: string;
  updated_at: string;
}

export function findOrCreateOAuthUser(
  provider: string,
  providerId: string,
  email: string,
  name: string
): User {
  const db = getAuthDatabase();
  
  // Check if OAuth account exists
  const existingOAuth = db.prepare(`
    SELECT u.* FROM users u
    JOIN oauth_accounts oa ON u.id = oa.user_id
    WHERE oa.provider = ? AND oa.provider_account_id = ?
  `).get(provider, providerId) as User | undefined;
  
  if (existingOAuth) {
    updateLastLogin(existingOAuth.id);
    return existingOAuth;
  }
  
  // Check if user exists with same email
  const existingUser = getUserByEmail(email);
  
  if (existingUser) {
    // Link OAuth account to existing user
    linkOAuthAccount({
      user_id: existingUser.id,
      provider,
      provider_account_id: providerId,
    });
    updateLastLogin(existingUser.id);
    return existingUser;
  }
  
  // Create new user with OAuth
  const username = email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 5);
  const newUser = db.prepare(`
    INSERT INTO users (email, username, password_hash, email_verified)
    VALUES (?, ?, ?, ?)
    RETURNING *
  `).get(
    email,
    username,
    'oauth_no_password_' + Math.random().toString(36), // Placeholder for OAuth users
    1 // OAuth emails are pre-verified
  ) as User;
  
  // Link OAuth account
  linkOAuthAccount({
    user_id: newUser.id,
    provider,
    provider_account_id: providerId,
  });
  
  return newUser;
}

export function linkOAuthAccount(account: {
  user_id: string;
  provider: string;
  provider_account_id: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: Date;
  scope?: string;
  id_token?: string;
}): void {
  const db = getAuthDatabase();
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO oauth_accounts (
      user_id, provider, provider_account_id, 
      access_token, refresh_token, expires_at, scope, id_token
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    account.user_id,
    account.provider,
    account.provider_account_id,
    account.access_token,
    account.refresh_token,
    account.expires_at?.toISOString(),
    account.scope,
    account.id_token
  );
}

// ===========================================
// Johnny5 Tier Management
// ===========================================

export interface Johnny5Quota {
  messageCount: number;
  limit: number;
  tierType: 'gemini_trial' | 'claude_trial' | 'pro_unlimited';
  remaining: number;
  resetDate: string;
  isProSubscriber: boolean;
}

const GEMINI_TRIAL_LIMIT = parseInt(process.env.JOHNNY5_GEMINI_LIMIT || '50', 10);
const CLAUDE_TRIAL_LIMIT = parseInt(process.env.JOHNNY5_CLAUDE_TRIAL_LIMIT || '100', 10);

/**
 * Get the user's current Johnny5 quota status
 */
export function getJohnny5Quota(userId: string): Johnny5Quota | null {
  const db = getAuthDatabase();

  const user = db.prepare(`
    SELECT claude_subscription_tier, coder1_pro_active, johnny5_message_count, message_count_reset_at
    FROM users WHERE id = ?
  `).get(userId) as {
    claude_subscription_tier: string;
    coder1_pro_active: number;
    johnny5_message_count: number;
    message_count_reset_at: string;
  } | undefined;

  if (!user) return null;

  // Check if we need to reset the counter (monthly reset)
  const resetDate = new Date(user.message_count_reset_at);
  const now = new Date();
  const monthDiff = (now.getFullYear() - resetDate.getFullYear()) * 12 + (now.getMonth() - resetDate.getMonth());

  if (monthDiff >= 1) {
    // Reset the counter for the new month
    resetJohnny5MessageCount(userId);
    user.johnny5_message_count = 0;
  }

  const isProSubscriber = user.coder1_pro_active === 1;
  const hasClaudeSubscription = user.claude_subscription_tier === 'pro' || user.claude_subscription_tier === 'max';

  // Determine tier type and limit
  let tierType: 'gemini_trial' | 'claude_trial' | 'pro_unlimited';
  let limit: number;

  if (isProSubscriber) {
    tierType = 'pro_unlimited';
    limit = Infinity;
  } else if (hasClaudeSubscription) {
    tierType = 'claude_trial';
    limit = CLAUDE_TRIAL_LIMIT;
  } else {
    tierType = 'gemini_trial';
    limit = GEMINI_TRIAL_LIMIT;
  }

  // Calculate next reset date (1st of next month)
  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    messageCount: user.johnny5_message_count,
    limit,
    tierType,
    remaining: Math.max(0, limit - user.johnny5_message_count),
    resetDate: nextReset.toISOString(),
    isProSubscriber,
  };
}

/**
 * Increment the user's Johnny5 message count
 */
export function incrementJohnny5MessageCount(userId: string): number {
  const db = getAuthDatabase();

  const result = db.prepare(`
    UPDATE users
    SET johnny5_message_count = johnny5_message_count + 1
    WHERE id = ?
    RETURNING johnny5_message_count
  `).get(userId) as { johnny5_message_count: number } | undefined;

  return result?.johnny5_message_count || 0;
}

/**
 * Reset the user's message count (called monthly or manually)
 */
export function resetJohnny5MessageCount(userId: string): void {
  const db = getAuthDatabase();

  db.prepare(`
    UPDATE users
    SET johnny5_message_count = 0, message_count_reset_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(userId);
}

/**
 * Update user's Claude subscription tier (detected from Bridge connection)
 */
export function updateClaudeSubscriptionTier(userId: string, tier: 'free' | 'pro' | 'max'): void {
  const db = getAuthDatabase();

  db.prepare(`
    UPDATE users SET claude_subscription_tier = ? WHERE id = ?
  `).run(tier, userId);
}

/**
 * Activate Coder1 Pro subscription for user
 */
export function activateCoder1Pro(userId: string): void {
  const db = getAuthDatabase();

  db.prepare(`
    UPDATE users SET coder1_pro_active = 1 WHERE id = ?
  `).run(userId);
}

/**
 * Deactivate Coder1 Pro subscription for user
 */
export function deactivateCoder1Pro(userId: string): void {
  const db = getAuthDatabase();

  db.prepare(`
    UPDATE users SET coder1_pro_active = 0 WHERE id = ?
  `).run(userId);
}

/**
 * Get user by Stripe customer ID (for webhook handling)
 */
export function getUserByStripeCustomerId(stripeCustomerId: string): User | undefined {
  const db = getAuthDatabase();

  const stmt = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?');
  return stmt.get(stripeCustomerId) as User | undefined;
}