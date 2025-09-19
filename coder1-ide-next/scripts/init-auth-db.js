#!/usr/bin/env node

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Create database
const dbPath = path.join(__dirname, '../data/auth.db');
console.log('Creating auth database at:', dbPath);

const db = new Database(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON');

// Read and execute schema
const schemaPath = path.join(__dirname, '../db/auth-schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');

// Split by semicolons and execute each statement
const statements = schema
  .split(';')
  .filter(stmt => stmt.trim())
  .map(stmt => stmt.trim() + ';');

console.log(`Executing ${statements.length} SQL statements...`);

try {
  for (const statement of statements) {
    if (statement.includes('CREATE')) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      db.exec(statement);
    }
  }
  
  console.log('✅ Auth database initialized successfully');
  
  // Verify tables were created
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Created tables:', tables.map(t => t.name).join(', '));
  
} catch (error) {
  console.error('❌ Error initializing database:', error);
  process.exit(1);
}

db.close();
console.log('Database connection closed');