import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

interface TimelineEvent {
  id: string;
  timestamp: string | number;
  type: 'file_change' | 'terminal_command' | 'checkpoint' | 'error';
  description: string;
  details?: any;
}

// Helper: Read checkpoints from manual/, auto/, and legacy root directories
const readCheckpointsFromAllLocations = async (checkpointsBaseDir: string) => {
  const checkpoints: any[] = [];
  
  // Try reading from type-specific subdirectories (manual/ and auto/)
  for (const type of ['manual', 'auto']) {
    const typeDir = path.join(checkpointsBaseDir, type);
    try {
      const files = await fs.readdir(typeDir);
      const jsonFiles = files.filter((f: string) => f.endsWith('.json'));
      
      for (const file of jsonFiles) {
        const content = await fs.readFile(path.join(typeDir, file), 'utf8');
        const checkpoint = JSON.parse(content);
        // Ensure checkpoint has type field for consistency
        if (!checkpoint.type) checkpoint.type = type;
        checkpoints.push(checkpoint);
      }
    } catch (error) {
      // Directory doesn't exist yet - normal for new installations or pre-migration
    }
  }
  
  // BACKWARD COMPATIBILITY: Also check root checkpoints directory for legacy checkpoints
  try {
    const rootFiles = await fs.readdir(checkpointsBaseDir);
    const jsonFiles = rootFiles.filter((f: string) => f.endsWith('.json') && f.startsWith('checkpoint_'));
    
    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(checkpointsBaseDir, file), 'utf8');
      const checkpoint = JSON.parse(content);
      // Legacy checkpoints are assumed to be manual
      if (!checkpoint.type) checkpoint.type = 'manual';
      checkpoints.push(checkpoint);
    }
  } catch (error) {
    // Root directory doesn't exist or has no JSON files
  }
  
  return checkpoints;
};

// Get database connection using dynamic import to avoid webpack bundling issues
const getDatabase = async () => {
  const BetterSqlite3 = await import('better-sqlite3');
  const Database = BetterSqlite3.default || BetterSqlite3;
  const dbPath = path.join(process.cwd(), 'db', 'context-memory.db');
  return new Database(dbPath);
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const typeFilter = searchParams.get('type'); // Filter by checkpoint type: 'manual', 'auto', or null for all
    
    let allCheckpoints: TimelineEvent[] = [];
    
    // 🔄 DUAL-READ: Try database first, fallback to JSON files
    let dbCheckpoints: TimelineEvent[] = [];
    let source = 'json_files';
    
    try {
      const db = await getDatabase();
      
      if (sessionId) {
        // Get checkpoints for specific session from database
        const rows = db.prepare(`
          SELECT * FROM checkpoints 
          WHERE session_id = ? 
          ORDER BY timestamp DESC
        `).all(sessionId);
        
        dbCheckpoints = rows.map((row: any) => ({
          id: row.id,
          timestamp: row.timestamp,
          type: 'checkpoint' as const,
          description: row.name || 'Checkpoint',
          details: {
            sessionId: row.session_id,
            description: row.description,
            terminalHistory: row.terminal_history,
            data: {
              terminalHistory: row.terminal_history,
              snapshot: row.files_snapshot ? JSON.parse(row.files_snapshot) : {}
            },
            metadata: row.metadata ? JSON.parse(row.metadata) : {}
          }
        }));
        
        source = 'database';
        console.log(`✅ Timeline loaded ${dbCheckpoints.length} checkpoints from database for session ${sessionId}`);
      } else {
        // Get recent checkpoints from all sessions
        const rows = db.prepare(`
          SELECT * FROM checkpoints 
          ORDER BY timestamp DESC 
          LIMIT 50
        `).all();
        
        dbCheckpoints = rows.map((row: any) => ({
          id: row.id,
          timestamp: row.timestamp,
          type: 'checkpoint' as const,
          description: row.name || 'Checkpoint',
          details: {
            sessionId: row.session_id,
            description: row.description,
            terminalHistory: row.terminal_history,
            data: {
              terminalHistory: row.terminal_history,
              snapshot: row.files_snapshot ? JSON.parse(row.files_snapshot) : {}
            },
            metadata: row.metadata ? JSON.parse(row.metadata) : {}
          }
        }));
        
        source = 'database';
        console.log(`✅ Timeline loaded ${dbCheckpoints.length} recent checkpoints from database`);
      }
      
      db.close();
      allCheckpoints = dbCheckpoints;
    } catch (dbError) {
      console.warn('⚠️ Database read failed, falling back to JSON files:', dbError);
    }
    
    // ALWAYS merge JSON files with database results for complete timeline
    // Database might have some checkpoints, but JSON files are the historical source of truth
    const jsonCheckpoints: TimelineEvent[] = [];
    {
      const dataDir = path.join(process.cwd(), 'data');
      const sessionsDir = path.join(dataDir, 'sessions');
      
      try {
        if (sessionId) {
          // Get checkpoints for specific session from JSON files (all locations)
          const checkpointsBaseDir = path.join(sessionsDir, sessionId, 'checkpoints');
        
          try {
            // Read from manual/, auto/, and legacy root
            const allCheckpoints = await readCheckpointsFromAllLocations(checkpointsBaseDir);
            
            for (const checkpointData of allCheckpoints) {
              // Apply type filter if specified
              if (typeFilter && checkpointData.type !== typeFilter) {
                continue;
              }
              
              jsonCheckpoints.push({
                id: checkpointData.id,
                timestamp: checkpointData.timestamp,
                type: 'checkpoint' as const,
                description: checkpointData.name || 'Checkpoint',
                details: {
                  sessionId: checkpointData.sessionId,
                  description: checkpointData.description,
                  data: checkpointData.data,
                  tags: checkpointData.tags,
                  autoGenerated: checkpointData.autoGenerated,
                  checkpointType: checkpointData.type // 'manual' or 'auto'
                }
              });
            }
          } catch (error) {
            // Session or checkpoints directory doesn't exist
            console.log(`No JSON checkpoints found for session ${sessionId}`);
          }
        } else {
        // Get checkpoints from all sessions for comprehensive timeline
        try {
          const sessions = await fs.readdir(sessionsDir);
          
          // 🔧 FIX: Show ALL sessions (not just 5) - user needs to see historical data
          // Sort by name (which includes timestamp) to get chronological order
          const recentSessions = sessions.sort();
          
          for (const sessionDir of recentSessions) {
            const checkpointsBaseDir = path.join(sessionsDir, sessionDir, 'checkpoints');
            const metadataPath = path.join(sessionsDir, sessionDir, 'metadata.json');
            
            let sessionName = sessionDir;
            try {
              const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
              sessionName = metadata.name || sessionDir;
            } catch {
              // Metadata file doesn't exist, use directory name
            }
            
            try {
              // Read from manual/, auto/, and legacy root
              const allCheckpoints = await readCheckpointsFromAllLocations(checkpointsBaseDir);
              
              for (const checkpointData of allCheckpoints) {
                // Apply type filter if specified
                if (typeFilter && checkpointData.type !== typeFilter) {
                  continue;
                }
                
                jsonCheckpoints.push({
                  id: checkpointData.id,
                  timestamp: checkpointData.timestamp,
                  type: 'checkpoint' as const,
                  description: `${sessionName}: ${checkpointData.name || 'Checkpoint'}`,
                  details: {
                    sessionId: checkpointData.sessionId,
                    sessionName,
                    description: checkpointData.description,
                    data: checkpointData.data,
                    tags: checkpointData.tags,
                    autoGenerated: checkpointData.autoGenerated,
                    checkpointType: checkpointData.type // 'manual' or 'auto'
                  }
                });
              }
            } catch (error) {
              // Checkpoints directory doesn't exist for this session
            }
          }
        } catch (error) {
          // Sessions directory doesn't exist
        }
        }
      } catch (error) {
        // Error reading JSON files
      }
    }
    
    // Merge database and JSON checkpoints, removing duplicates by ID
    const mergedMap = new Map<string, TimelineEvent>();
    
    // Add database checkpoints first (newer migration path)
    for (const checkpoint of allCheckpoints) {
      mergedMap.set(checkpoint.id, checkpoint);
    }
    
    // Add JSON checkpoints (legacy storage)
    for (const checkpoint of jsonCheckpoints) {
      if (!mergedMap.has(checkpoint.id)) {
        mergedMap.set(checkpoint.id, checkpoint);
      }
    }
    
    allCheckpoints = Array.from(mergedMap.values());
    source = allCheckpoints.length > dbCheckpoints.length ? 'merged' : 'database';
    
    // Sort by timestamp (newest first)
    allCheckpoints.sort((a, b) => {
      const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
      const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
      return timeB - timeA;
    });
    
    return NextResponse.json({ 
      success: true,
      events: allCheckpoints.slice(0, 200), // Return last 200 events (increased to show more history)
      total: allCheckpoints.length,
      showing: Math.min(allCheckpoints.length, 200)
    });
    
  } catch (error) {
    // logger?.error('Failed to fetch timeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    
    const timelineEvent: TimelineEvent = {
      id: `event-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...event
    };
    
    // Save to global timeline file for tracking all events
    const dataDir = path.join(process.cwd(), 'data');
    const globalTimelineDir = path.join(dataDir, 'timeline');
    const globalTimelineFile = path.join(globalTimelineDir, 'global-timeline.json');
    
    await fs.mkdir(globalTimelineDir, { recursive: true });
    
    let globalTimeline = [];
    try {
      const existingData = await fs.readFile(globalTimelineFile, 'utf8');
      globalTimeline = JSON.parse(existingData);
    } catch {
      // File doesn't exist yet, start with empty array
      globalTimeline = [];
    }
    
    globalTimeline.push(timelineEvent);
    
    // Keep only last 1000 events for performance
    if (globalTimeline.length > 1000) {
      globalTimeline = globalTimeline.slice(-1000);
    }
    
    await fs.writeFile(globalTimelineFile, JSON.stringify(globalTimeline, null, 2));
    
    return NextResponse.json({ 
      success: true,
      event: timelineEvent
    });
    
  } catch (error) {
    // logger?.error('Failed to add timeline event:', error);
    return NextResponse.json(
      { error: 'Failed to add timeline event' },
      { status: 500 }
    );
  }
}