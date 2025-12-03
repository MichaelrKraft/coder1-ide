const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../db/context-memory.db');
const db = new Database(dbPath);

console.log('🔧 Migrating context database...');
console.log(`📁 Database: ${dbPath}`);

try {
  // Check if columns exist
  const tableInfo = db.prepare("PRAGMA table_info(context_sessions)").all();
  const columnNames = tableInfo.map(col => col.name);
  
  console.log(`📊 Current columns: ${columnNames.join(', ')}`);
  
  // Add missing columns
  let changes = 0;
  
  if (!columnNames.includes('api_calls')) {
    db.prepare('ALTER TABLE context_sessions ADD COLUMN api_calls INTEGER DEFAULT 0').run();
    console.log('✅ Added api_calls column');
    changes++;
  } else {
    console.log('⏭️  api_calls column already exists');
  }
  
  if (!columnNames.includes('cli_calls')) {
    db.prepare('ALTER TABLE context_sessions ADD COLUMN cli_calls INTEGER DEFAULT 0').run();
    console.log('✅ Added cli_calls column');
    changes++;
  } else {
    console.log('⏭️  cli_calls column already exists');
  }
  
  if (!columnNames.includes('quality_score')) {
    db.prepare('ALTER TABLE context_sessions ADD COLUMN quality_score REAL DEFAULT 0').run();
    console.log('✅ Added quality_score column');
    changes++;
  } else {
    console.log('⏭️  quality_score column already exists');
  }
  
  if (changes > 0) {
    console.log(`\n🎉 Migration complete! ${changes} column(s) added.`);
  } else {
    console.log('\n✨ Database already up to date!');
  }
  
  // Verify the changes
  const updatedTableInfo = db.prepare("PRAGMA table_info(context_sessions)").all();
  const updatedColumnNames = updatedTableInfo.map(col => col.name);
  console.log(`\n📊 Final columns: ${updatedColumnNames.join(', ')}`);
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
  console.log('\n🔒 Database connection closed');
}
