import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

interface RouteParams {
  params: Promise<{
    sessionId: string;
    checkpointId: string;
  }> | {
    sessionId: string;
    checkpointId: string;
  };
}

// Get database connection using dynamic import to avoid webpack bundling issues
const getDatabase = async () => {
  const Database = (await import('better-sqlite3')).default;
  const dbPath = path.join(process.cwd(), 'db', 'context-memory.db');
  return new Database(dbPath);
};

export async function POST(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const params = await Promise.resolve(context.params);
    const { sessionId, checkpointId } = params;
    
    console.log('🔄 Restore checkpoint request:', { sessionId, checkpointId });
    
    // 🔄 DUAL-READ: Try database first, fallback to JSON file
    let checkpointData: any = null;
    let source = 'unknown';
    
    // Try database first
    try {
      const db = await getDatabase();
      const row = db.prepare(`
        SELECT * FROM checkpoints WHERE id = ? AND session_id = ?
      `).get(checkpointId, sessionId);
      
      if (row) {
        // Reconstruct checkpoint object from database row
        checkpointData = {
          id: row.id,
          sessionId: row.session_id,
          name: row.name,
          description: row.description,
          timestamp: row.timestamp,
          terminalHistory: row.terminal_history,
          data: {
            snapshot: row.files_snapshot ? JSON.parse(row.files_snapshot) : {},
            terminalHistory: row.terminal_history,
            ...(row.metadata ? JSON.parse(row.metadata) : {})
          }
        };
        source = 'database';
        console.log(`✅ Checkpoint loaded from database: ${checkpointId} (${row.terminal_history_size} chars)`);
      }
      
      db.close();
    } catch (dbError) {
      console.warn('⚠️ Database read failed, trying JSON file:', dbError);
    }
    
    // Fallback to JSON file if database didn't have it
    if (!checkpointData) {
      const dataDir = path.join(process.cwd(), 'data');
      const checkpointsDir = path.join(dataDir, 'sessions', sessionId, 'checkpoints');
      const checkpointFile = path.join(checkpointsDir, `${checkpointId}.json`);
      
      console.log('📂 Looking for checkpoint at:', checkpointFile);
      
      try {
        checkpointData = JSON.parse(await fs.readFile(checkpointFile, 'utf8'));
        source = 'json_file';
        console.log('✅ Checkpoint loaded from JSON file (fallback)');
      } catch (error) {
        console.error('❌ Checkpoint not found in database or JSON file:', checkpointFile, error);
        return NextResponse.json(
          { 
            error: 'Checkpoint not found',
            details: {
              checkpointFile,
              sessionId,
              checkpointId,
              message: error instanceof Error ? error.message : 'Unknown error'
            }
          },
          { status: 404 }
        );
      }
    }
    
    // ✅ NO FILTERING NEEDED: Data is already filtered during save operation
    // This makes restoration INSTANT (was taking 58+ seconds with async filtering)
    // The checkpoint save operation now filters terminal history asynchronously
    
    return NextResponse.json({
      success: true,
      checkpoint: checkpointData,
      source,  // Tell frontend where data came from
      message: `Checkpoint restored from ${source} (pre-filtered, instant load)`
    });
    
  } catch (error) {
    console.error('❌ Restore checkpoint API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to restore checkpoint',
        details: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      },
      { status: 500 }
    );
  }
}