-- Coder1 Premium Database Schema
-- PostgreSQL Schema for Subscriptions and Billing

-- Drop existing table if exists (careful in production!)
-- DROP TABLE IF EXISTS subscriptions;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  
  -- User identification
  user_id VARCHAR(255) UNIQUE NOT NULL,
  
  -- Stripe identifiers
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  
  -- Subscription details
  plan VARCHAR(50) NOT NULL DEFAULT 'pro',
  status VARCHAR(50) NOT NULL,
  amount INTEGER NOT NULL,  -- Amount in cents (900 = $9.00)
  currency VARCHAR(10) NOT NULL DEFAULT 'usd',
  
  -- Billing periods
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  
  -- Cancellation tracking
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_created_at ON subscriptions(created_at);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Sample queries for testing

-- Check all subscriptions
-- SELECT * FROM subscriptions ORDER BY created_at DESC;

-- Check active trials
-- SELECT * FROM subscriptions WHERE status = 'trialing' ORDER BY current_period_end;

-- Check active paid subscriptions
-- SELECT * FROM subscriptions WHERE status = 'active' ORDER BY current_period_end;

-- Check canceled subscriptions
-- SELECT * FROM subscriptions WHERE cancel_at_period_end = TRUE;
