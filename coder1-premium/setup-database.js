/**
 * Database Setup Script
 * Creates subscriptions table in Neon PostgreSQL
 */

const { Pool } = require('pg');
require('dotenv').config();

const schema = `
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
  amount INTEGER NOT NULL,
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_created_at ON subscriptions(created_at);
`;

async function setupDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔌 Connecting to Neon PostgreSQL...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected successfully!');
    
    // Create schema
    console.log('📝 Creating subscriptions table...');
    await pool.query(schema);
    console.log('✅ Table created successfully!');
    
    // Verify table
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n✅ Subscriptions table structure:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
