/**
 * Shared storage for bridge pairing codes
 * This singleton ensures both generate-code and pair endpoints share the same data
 * Uses global object to persist across Next.js hot-reloads in development
 */

interface PairingData {
  userId: string;
  expires: number;
}

// Declare global type for TypeScript
declare global {
  var bridgePairingCodes: Map<string, PairingData> | undefined;
  var bridgeCleanupInterval: NodeJS.Timeout | undefined;
}

class BridgeStore {
  private static instance: BridgeStore;
  private pairingCodes: Map<string, PairingData>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Use global storage in development to persist across hot-reloads
    if (!global.bridgePairingCodes) {
      console.log('🌉 Initializing new bridge pairing codes store');
      global.bridgePairingCodes = new Map();
    }
    this.pairingCodes = global.bridgePairingCodes;
    
    // Reuse existing cleanup interval if it exists
    if (!global.bridgeCleanupInterval) {
      this.startCleanup();
    } else {
      this.cleanupInterval = global.bridgeCleanupInterval;
    }
  }

  public static getInstance(): BridgeStore {
    if (!BridgeStore.instance) {
      BridgeStore.instance = new BridgeStore();
    }
    return BridgeStore.instance;
  }

  private startCleanup() {
    // Clean up expired codes every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [code, data] of this.pairingCodes.entries()) {
        if (data.expires < now) {
          this.pairingCodes.delete(code);
          console.log(`Cleaned up expired pairing code: ${code}`);
        }
      }
    }, 60000);
    
    // Store interval globally to prevent multiple intervals in development
    global.bridgeCleanupInterval = this.cleanupInterval;
  }

  public generateCode(userId: string): string {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store with 5 minute expiration
    this.pairingCodes.set(code, {
      userId,
      expires: Date.now() + 300000 // 5 minutes
    });

    console.log(`Generated pairing code ${code} for user ${userId}`);
    return code;
  }

  public validateCode(code: string): PairingData | null {
    const data = this.pairingCodes.get(code);
    
    if (!data) {
      console.log(`Pairing code ${code} not found`);
      return null;
    }

    // Check if expired
    if (data.expires < Date.now()) {
      console.log(`Pairing code ${code} expired`);
      this.pairingCodes.delete(code);
      return null;
    }

    console.log(`Pairing code ${code} validated for user ${data.userId}`);
    return data;
  }

  public consumeCode(code: string): void {
    this.pairingCodes.delete(code);
    console.log(`Pairing code ${code} consumed`);
  }

  public getAllCodes(): Map<string, PairingData> {
    return new Map(this.pairingCodes);
  }

  public cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      global.bridgeCleanupInterval = undefined;
    }
  }
}

// Export singleton instance
export const bridgeStore = BridgeStore.getInstance();