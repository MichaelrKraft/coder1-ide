/**
 * Shared storage for bridge pairing codes
 * Uses SQLite database for persistent storage across processes and restarts
 * Updated Feb 1, 2026 to fix production "Invalid or expired pairing code" errors
 */

import { getDatabase } from './database';

interface PairingData {
  userId: string;
  expires: number;
}

export class BridgeStore {
  private static instance: BridgeStore;

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
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 300000; // 5 minutes

      // Insert into DB
      db.prepare(`
        INSERT INTO bridge_pairing_codes (code, user_id, expires)
        VALUES (?, ?, ?)
      `).run(code, userId, expires);

      console.log(`Generated persistent pairing code ${code} for user ${userId}`);
      
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
      const row = db.prepare(`
        SELECT user_id, expires FROM bridge_pairing_codes WHERE code = ?
      `).get(code);

      if (!row) {
        console.log(`Pairing code ${code} not found in DB`);
        return null;
      }

      // Check expiry
      if (row.expires < Date.now()) {
        console.log(`Pairing code ${code} expired`);
        // Cleanup this specific code
        db.prepare('DELETE FROM bridge_pairing_codes WHERE code = ?').run(code);
        return null;
      }

      console.log(`Pairing code ${code} validated for user ${row.user_id}`);
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
      db.prepare('DELETE FROM bridge_pairing_codes WHERE code = ?').run(code);
      console.log(`Pairing code ${code} consumed (deleted from DB)`);
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