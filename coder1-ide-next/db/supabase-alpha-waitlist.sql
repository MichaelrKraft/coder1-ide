-- Alpha Waitlist Table for Supabase
-- Run this once in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/xeomjefoxeqfjidzwhpv/sql/new

CREATE TABLE IF NOT EXISTS alpha_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  reddit_username TEXT,
  signup_date TIMESTAMPTZ DEFAULT NOW(),
  invite_sent BOOLEAN DEFAULT FALSE,
  invite_sent_date TIMESTAMPTZ,
  invite_code TEXT,
  source TEXT DEFAULT 'website',
  notes TEXT,
  ip_address TEXT,
  user_agent TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alpha_waitlist_email ON alpha_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_alpha_waitlist_signup_date ON alpha_waitlist(signup_date DESC);
CREATE INDEX IF NOT EXISTS idx_alpha_waitlist_invite_sent ON alpha_waitlist(invite_sent);
