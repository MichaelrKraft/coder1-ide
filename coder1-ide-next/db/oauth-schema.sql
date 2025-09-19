-- OAuth provider accounts table
-- Links OAuth providers (Google, GitHub, etc.) to user accounts
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'google', 'github', etc.
  provider_account_id TEXT NOT NULL, -- ID from the OAuth provider
  access_token TEXT,
  refresh_token TEXT,
  expires_at DATETIME,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(provider, provider_account_id)
);

-- Alter users table to make password optional for OAuth users
-- (This is handled in the application layer since SQLite doesn't support ALTER COLUMN)

-- Index for OAuth lookups
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_provider_account ON oauth_accounts(provider, provider_account_id);