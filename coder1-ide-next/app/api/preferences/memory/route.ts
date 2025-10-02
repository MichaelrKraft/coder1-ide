/**
 * Memory Preferences API Route
 * Provides server-side access to SQLite memory preferences
 * Handles GET (load) and POST (save) operations
 */

import { NextRequest, NextResponse } from 'next/server';

// Use dynamic import to avoid client-side issues
async function getMemoryDatabase() {
  try {
    const { memoryDb } = await import('@/lib/db/memory-database');
    return memoryDb;
  } catch (error) {
    console.error('Failed to load memory database:', error);
    throw new Error('Database unavailable');
  }
}

const DEFAULT_PREFERENCES = {
  enabled: true,
  threshold: 70,
  autoGeneration: true,
  eventTypes: {
    bugFix: true,
    featureCompletion: true,
    breakthrough: true,
    learning: true,
    architectureDecision: false,
    solutionDiscovery: false,
  },
  notifications: true,
  notificationSound: false,
  templateType: 'default',
};

/**
 * GET - Load memory preferences from database
 */
export async function GET() {
  try {
    const db = await getMemoryDatabase();
    
    // Access the private database instance
    const dbInstance = (db as any).db;
    if (!dbInstance) {
      throw new Error('Database not initialized');
    }
    
    // Get all preference values from database
    const stmt = dbInstance.prepare('SELECT key, value FROM user_preferences');
    const rows = stmt.all() as Array<{ key: string; value: string }>;
    
    const dbPrefs: Record<string, any> = {};
    rows.forEach(row => {
      try {
        dbPrefs[row.key] = JSON.parse(row.value);
      } catch {
        dbPrefs[row.key] = row.value;
      }
    });

    // Map database keys to our preference structure
    const preferences = {
      enabled: dbPrefs.memory_detection_enabled === 'true' || dbPrefs.memory_detection_enabled === true,
      threshold: parseInt(dbPrefs.memory_detection_threshold || '70'),
      autoGeneration: dbPrefs.memory_auto_generation === 'true' || dbPrefs.memory_auto_generation === true,
      notifications: dbPrefs.memory_notifications === 'true' || dbPrefs.memory_notifications === true,
      notificationSound: dbPrefs.memory_notification_sound === 'true' || dbPrefs.memory_notification_sound === true,
      templateType: dbPrefs.memory_template_type || 'default',
      eventTypes: dbPrefs.memory_event_types ? 
        (typeof dbPrefs.memory_event_types === 'string' ? 
          JSON.parse(dbPrefs.memory_event_types) : 
          dbPrefs.memory_event_types) : 
        DEFAULT_PREFERENCES.eventTypes
    };

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Failed to load memory preferences:', error);
    
    // Return defaults if database fails
    return NextResponse.json(DEFAULT_PREFERENCES);
  }
}

/**
 * POST - Save memory preferences to database
 */
export async function POST(request: NextRequest) {
  try {
    const preferences = await request.json();
    const db = await getMemoryDatabase();
    
    // Access the private database instance
    const dbInstance = (db as any).db;
    if (!dbInstance) {
      throw new Error('Database not initialized');
    }
    
    const updates = [
      { key: 'memory_detection_enabled', value: preferences.enabled?.toString() || 'true' },
      { key: 'memory_detection_threshold', value: preferences.threshold?.toString() || '70' },
      { key: 'memory_auto_generation', value: preferences.autoGeneration?.toString() || 'true' },
      { key: 'memory_notifications', value: preferences.notifications?.toString() || 'true' },
      { key: 'memory_notification_sound', value: preferences.notificationSound?.toString() || 'false' },
      { key: 'memory_template_type', value: preferences.templateType || 'default' },
      { key: 'memory_event_types', value: JSON.stringify(preferences.eventTypes || DEFAULT_PREFERENCES.eventTypes) }
    ];

    // Use upsert (INSERT OR REPLACE) for each preference
    const stmt = dbInstance.prepare(`
      INSERT OR REPLACE INTO user_preferences (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);

    const transaction = dbInstance.transaction((updates: Array<{key: string, value: string}>) => {
      for (const update of updates) {
        stmt.run(update.key, update.value);
      }
    });

    transaction(updates);
    
    console.log('✅ Memory preferences saved to SQLite database via API');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Preferences saved to SQLite database' 
    });
  } catch (error) {
    console.error('Failed to save memory preferences via API:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save preferences',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}