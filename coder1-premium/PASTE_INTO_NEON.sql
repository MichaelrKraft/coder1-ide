-- ============================================================================
-- COPY AND PASTE THIS INTO NEON'S SQL EDITOR
-- ============================================================================
-- Go to: https://console.neon.tech/app/projects
-- Click your project: fancy-term-58809061
-- Click "SQL Editor" in the left sidebar
-- Paste this entire file and click "Run"
-- ============================================================================

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'pro',
  status VARCHAR(50) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'usd',
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_created_at ON subscriptions(created_at);

-- Verify table was created
SELECT 'Table created successfully!' as result;
SELECT COUNT(*) as row_count FROM subscriptions;
