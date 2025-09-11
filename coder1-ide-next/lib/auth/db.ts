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
  } catch (error) {
    logger?.error('Error initializing auth database schema:', error);
    // Don't throw - allow app to continue even if auth setup fails
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