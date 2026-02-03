/**
 * Shared storage for bridge pairing codes
 * Uses SQLite database for persistent storage across processes and restarts
 * Updated Feb 1, 2026 to fix production "Invalid or expired pairing code" errors
 * Updated Feb 2, 2026 to auto-create table if missing
 */

import { getDatabase } from './database';

interface PairingData {
  userId: string;
  expires: number;
}

export class BridgeStore {
  private static instance: BridgeStore;
  private tableInitialized = false;

  private constructor() {
    // No initialization needed for synchronous members
  }

  public static getInstance(): BridgeStore {
    if (!BridgeStore.instance) {
      BridgeStore.instance = new BridgeStore();
    }
    return BridgeStore.instance;
  }

  /**
   * Ensure the bridge_pairing_codes table exists
   * Called before any database operation
   */
  private async ensureTable(db: any): Promise<void> {
    if (this.tableInitialized) return;

    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS bridge_pairing_codes (
          code TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          expires INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_bridge_pairing_codes_expires ON bridge_pairing_codes(expires);
      `);
      this.tableInitialized = true;
      console.log('[BridgeStore] Table bridge_pairing_codes ensured');
    } catch (error) {
      console.error('[BridgeStore] Failed to create table:', error);
      throw error;
    }
  }

  /**
   * Clean up expired tokens from the database
   */
  private async cleanupExpiredCodes(db: any) {
    try {
      const now = Date.now();
      const result = db.prepare('DELETE FROM bridge_pairing_codes WHERE expires < ?').run(now);
      if (result.changes > 0) {
        console.log(`Cleaned up ${result.changes} expired bridge pairing codes`);
      }
    } catch (error) {
      console.warn('Failed to cleanup expired codes:', error);
      // Non-critical error
    }
  }

  public async generateCode(userId: string): Promise<string> {
    const db = await getDatabase();

    try {
      // Ensure table exists before any operations
      await this.ensureTable(db);

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 300000; // 5 minutes

      // Insert into DB
      db.prepare(`
        INSERT INTO bridge_pairing_codes (code, user_id, expires)
        VALUES (?, ?, ?)
      `).run(code, userId, expires);

      console.log(`[BridgeStore] Generated pairing code ${code} for user ${userId}, expires in 5 min`);

      // Opportunistic cleanup
      await this.cleanupExpiredCodes(db);

      return code;
    } finally {
      db.close();
    }
  }

  public async validateCode(code: string): Promise<PairingData | null> {
    const db = await getDatabase();

    try {
      // Ensure table exists before any operations
      await this.ensureTable(db);

      const row = db.prepare(`
        SELECT user_id, expires FROM bridge_pairing_codes WHERE code = ?
      `).get(code) as { user_id: string; expires: number } | undefined;

      if (!row) {
        console.log(`[BridgeStore] Pairing code ${code} not found in DB`);
        return null;
      }

      // Check expiry
      if (row.expires < Date.now()) {
        console.log(`[BridgeStore] Pairing code ${code} expired (was valid for user ${row.user_id})`);
        // Cleanup this specific code
        db.prepare('DELETE FROM bridge_pairing_codes WHERE code = ?').run(code);
        return null;
      }

      console.log(`[BridgeStore] Pairing code ${code} validated for user ${row.user_id}`);
      return {
        userId: row.user_id,
        expires: row.expires
      };

    } finally {
      db.close();
    }
  }

  public async consumeCode(code: string): Promise<void> {
    const db = await getDatabase();
    try {
      // Ensure table exists before any operations
      await this.ensureTable(db);

      db.prepare('DELETE FROM bridge_pairing_codes WHERE code = ?').run(code);
      console.log(`[BridgeStore] Pairing code ${code} consumed (deleted from DB)`);
    } finally {
      db.close();
    }
  }

  // Deprecated/Unused methods kept for interface compatibility if needed
  public getAllCodes(): Map<string, PairingData> {
    return new Map();
  }

  public cleanup() {
    // No-op for DB implementation
  }
}

// Export singleton instance
export const bridgeStore = BridgeStore.getInstance();