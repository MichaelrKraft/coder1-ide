-- Alpha Waitlist Database Schema
-- Simple table for collecting alpha signup emails before full user registration

CREATE TABLE IF NOT EXISTS alpha_waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  reddit_username TEXT,
  signup_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  invite_sent BOOLEAN DEFAULT 0,
  invite_sent_date DATETIME,
  invite_code TEXT,
  source TEXT DEFAULT 'website', -- 'website', 'reddit', 'referral', etc.
  notes TEXT,
  ip_address TEXT,
  user_agent TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_alpha_waitlist_email ON alpha_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_alpha_waitlist_signup_date ON alpha_waitlist(signup_date);
CREATE INDEX IF NOT EXISTS idx_alpha_waitlist_invite_sent ON alpha_waitlist(invite_sent);
CREATE INDEX IF NOT EXISTS idx_alpha_waitlist_reddit_username ON alpha_waitlist(reddit_username);
