/**
 * Composio Service
 *
 * Server-side service for managing OAuth connections to deployment platforms
 * via the Composio SDK. Handles connection initiation, callback processing,
 * token refresh, and action execution.
 *
 * All tokens are encrypted at rest using AES-256-GCM (see lib/encryption.ts).
 * This service is singleton -- use getComposioService() to obtain the instance.
 */

import { Composio } from 'composio-core';
import { randomUUID } from 'crypto';
import { encrypt, decrypt } from '@/lib/encryption';
import { initializeDb, logAudit } from '@/lib/johnny5-db';
import type {
  ComposioPlatform,
  ConnectionStatus,
  ActionResult,
  StoredConnection,
} from './types';
import { ComposioServiceError } from './types';

// ---------------------------------------------------------------------------
// Database helpers (integration connections table)
// ---------------------------------------------------------------------------

let dbInitialized = false;

/**
 * Ensure the composio_connections table exists.
 * Called lazily on first service use.
 */
async function ensureTable(): Promise<void> {
  if (dbInitialized) return;

  const { default: Database } = await import('better-sqlite3');
  const { JOHNNY5_DB_PATH } = await import('@/lib/data-paths');

  const db = new Database(JOHNNY5_DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS composio_connections (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      composio_account_id TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      status TEXT NOT NULL DEFAULT 'connected',
      connected_at TEXT NOT NULL,
      last_used_at TEXT,
      UNIQUE(user_id, platform)
    )
  `);
  db.close();
  dbInitialized = true;
}

/** Open a short-lived DB handle for a query */
async function openDb() {
  const { default: Database } = await import('better-sqlite3');
  const { JOHNNY5_DB_PATH } = await import('@/lib/data-paths');
  return new Database(JOHNNY5_DB_PATH);
}

// ---------------------------------------------------------------------------
// Service list cache (reduces API calls for list_services)
// ---------------------------------------------------------------------------

interface ServiceCacheEntry {
  services: Array<{ id: string; name: string; type: string }>;
  cachedAt: number;
}

const SERVICE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const serviceCache = new Map<string, ServiceCacheEntry>();

function getServiceCacheKey(userId: string, platform: ComposioPlatform): string {
  return `${userId}:${platform}`;
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

export class ComposioService {
  private client: Composio | null = null;

  /**
   * Initialize the Composio SDK client.
   * Must be called before any other method.
   */
  async initializeClient(): Promise<void> {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new ComposioServiceError(
        'COMPOSIO_API_KEY environment variable is not set.',
        'NOT_INITIALIZED',
      );
    }

    this.client = new Composio({ apiKey });
    await ensureTable();
    console.log('[ComposioService] Initialized');
  }

  /** Guarantee the client is ready; initialize lazily if needed. */
  private async ensureClient(): Promise<Composio> {
    if (!this.client) {
      await this.initializeClient();
    }
    return this.client!;
  }

  // -------------------------------------------------------------------------
  // Connection status
  // -------------------------------------------------------------------------

  /**
   * Check whether a user has an active connection for a platform.
   */
  async getConnectionStatus(
    userId: string,
    platform: ComposioPlatform,
  ): Promise<ConnectionStatus> {
    await ensureTable();
    const db = await openDb();

    try {
      const row = db.prepare(
        'SELECT * FROM composio_connections WHERE user_id = ? AND platform = ?',
      ).get(userId, platform) as StoredConnection | undefined;

      if (!row) {
        return { platform, connected: false, status: 'disconnected' };
      }

      return {
        platform,
        connected: row.status === 'connected',
        status: row.status as ConnectionStatus['status'],
        connectedAt: row.connectedAt ?? row.connected_at,
        lastUsedAt: row.lastUsedAt ?? row.last_used_at,
      };
    } finally {
      db.close();
    }
  }

  // -------------------------------------------------------------------------
  // Global connection check (Composio-side, ignores our DB)
  // -------------------------------------------------------------------------

  /**
   * Check if there's an active connection in Composio for this platform.
   * This checks Composio's connected accounts directly, bypassing our local DB.
   */
  async checkGlobalConnection(
    platform: ComposioPlatform,
  ): Promise<{ connected: boolean; accountId?: string }> {
    try {
      const client = await this.ensureClient();
      const accounts = await client.connectedAccounts.list({});

      const platformAccount = accounts.items?.find(
        (a: { appName?: string; status?: string }) =>
          a.appName === platform && a.status === 'ACTIVE',
      );

      if (platformAccount) {
        return { connected: true, accountId: platformAccount.id };
      }

      return { connected: false };
    } catch (err) {
      console.error('[ComposioService] checkGlobalConnection error:', err);
      return { connected: false };
    }
  }

  // -------------------------------------------------------------------------
  // OAuth flow -- initiation
  // -------------------------------------------------------------------------

  /**
   * Generate an OAuth URL for a given platform.
   * The user should be redirected to this URL to authorize.
   */
  async getOAuthUrl(
    userId: string,
    platform: ComposioPlatform,
  ): Promise<string> {
    const client = await this.ensureClient();
    const entity = client.getEntity(userId);

    const redirectUri =
      process.env.COMPOSIO_REDIRECT_URI ??
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/api/composio/callback`;

    console.log('[ComposioService] Initiating OAuth:', {
      userId,
      platform,
      redirectUri,
      entityId: entity.id,
    });

    const connectionRequest = await entity.initiateConnection({
      appName: platform,
      redirectUri,
    });

    await logAudit('composio_oauth_initiated', {
      userId,
      platform,
      connectedAccountId: connectionRequest.connectedAccountId,
    });

    return connectionRequest.redirectUrl ?? '';
  }

  // -------------------------------------------------------------------------
  // OAuth flow -- callback
  // -------------------------------------------------------------------------

  /**
   * Process the OAuth callback after the user authorizes on the platform.
   * Stores encrypted tokens in the database.
   */
  async handleOAuthCallback(
    composioAccountId: string,
    userId: string,
    platform: ComposioPlatform,
  ): Promise<void> {
    const client = await this.ensureClient();

    // Fetch the connection details from Composio
    const account = await client.connectedAccounts.get({
      connectedAccountId: composioAccountId,
    });

    if (!account) {
      throw new ComposioServiceError(
        'Connected account not found after OAuth callback.',
        'INVALID_CALLBACK',
        platform,
      );
    }

    await ensureTable();
    const db = await openDb();

    try {
      const id = randomUUID();
      const now = new Date().toISOString();

      // Encrypt tokens before storage
      const encryptedAccess = encrypt(composioAccountId);
      const encryptedRefresh = account.refreshToken
        ? encrypt(account.refreshToken)
        : null;

      db.prepare(`
        INSERT INTO composio_connections
          (id, user_id, platform, composio_account_id, access_token, refresh_token, status, connected_at)
        VALUES (?, ?, ?, ?, ?, ?, 'connected', ?)
        ON CONFLICT(user_id, platform) DO UPDATE SET
          composio_account_id = excluded.composio_account_id,
          access_token = excluded.access_token,
          refresh_token = excluded.refresh_token,
          status = 'connected',
          connected_at = excluded.connected_at
      `).run(id, userId, platform, composioAccountId, encryptedAccess, encryptedRefresh, now);

      await logAudit('composio_oauth_completed', { userId, platform });
    } finally {
      db.close();
    }
  }

  // -------------------------------------------------------------------------
  // Token refresh
  // -------------------------------------------------------------------------

  /**
   * Attempt a silent token refresh before executing an action.
   * Returns true if the connection is valid (refreshed or still active).
   */
  async refreshTokenIfNeeded(
    userId: string,
    platform: ComposioPlatform,
  ): Promise<boolean> {
    await ensureTable();
    const db = await openDb();

    try {
      const row = db.prepare(
        'SELECT * FROM composio_connections WHERE user_id = ? AND platform = ?',
      ).get(userId, platform) as (Record<string, string> | undefined);

      if (!row) return false;

      const client = await this.ensureClient();

      // Check connection health via Composio
      try {
        const account = await client.connectedAccounts.get({
          connectedAccountId: row.composio_account_id,
        });
        if (account && account.status === 'ACTIVE') {
          return true;
        }
      } catch {
        // Connection may be expired -- attempt reinitiation below
      }

      // Try to reinitiate the connection
      try {
        await client.connectedAccounts.reinitiateConnection({
          connectedAccountId: row.composio_account_id,
          data: {},
        });
        return true;
      } catch {
        // Mark as expired in our DB
        db.prepare(
          "UPDATE composio_connections SET status = 'expired' WHERE user_id = ? AND platform = ?",
        ).run(userId, platform);

        await logAudit('composio_token_expired', { userId, platform });
        return false;
      }
    } finally {
      db.close();
    }
  }

  // -------------------------------------------------------------------------
  // Action execution
  // -------------------------------------------------------------------------

  /**
   * Execute an action on a connected platform.
   * Automatically refreshes the token first.
   *
   * @param userId   - The user's ID
   * @param platform - Target platform (e.g. 'render')
   * @param action   - Composio action name (e.g. 'RENDER_SET_ENV_VAR')
   * @param params   - Action-specific parameters
   */
  async executeAction(
    userId: string,
    platform: ComposioPlatform,
    action: string,
    params: Record<string, unknown>,
  ): Promise<ActionResult> {
    // Ensure token is valid
    const isValid = await this.refreshTokenIfNeeded(userId, platform);
    if (!isValid) {
      throw new ComposioServiceError(
        `Not connected to ${platform}. Please reconnect.`,
        'NOT_CONNECTED',
        platform,
      );
    }

    const client = await this.ensureClient();

    // Retrieve Composio account ID
    await ensureTable();
    const db = await openDb();
    let composioAccountId: string;

    try {
      const row = db.prepare(
        'SELECT composio_account_id FROM composio_connections WHERE user_id = ? AND platform = ?',
      ).get(userId, platform) as { composio_account_id: string } | undefined;

      if (!row) {
        throw new ComposioServiceError(
          `No connection found for ${platform}.`,
          'NOT_CONNECTED',
          platform,
        );
      }
      composioAccountId = row.composio_account_id;

      // Update last_used_at
      db.prepare(
        'UPDATE composio_connections SET last_used_at = ? WHERE user_id = ? AND platform = ?',
      ).run(new Date().toISOString(), userId, platform);
    } finally {
      db.close();
    }

    // Execute via Composio SDK
    try {
      const result = await client.actions.execute({
        actionName: action,
        params,
        connectedAccountId: composioAccountId,
      });

      await logAudit('composio_action_executed', {
        userId,
        platform,
        action,
        success: true,
      });

      return {
        success: true,
        data: result as Record<string, unknown>,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      await logAudit('composio_action_failed', {
        userId,
        platform,
        action,
        error: message,
      });

      // Map common HTTP errors to typed codes
      const code = mapErrorCode(message);
      throw new ComposioServiceError(message, code, platform);
    }
  }

  // -------------------------------------------------------------------------
  // Service list caching
  // -------------------------------------------------------------------------

  /**
   * Get cached service list if still valid.
   */
  getCachedServices(
    userId: string,
    platform: ComposioPlatform,
  ): Array<{ id: string; name: string; type: string }> | null {
    const key = getServiceCacheKey(userId, platform);
    const entry = serviceCache.get(key);

    if (!entry) return null;

    const age = Date.now() - entry.cachedAt;
    if (age > SERVICE_CACHE_TTL_MS) {
      serviceCache.delete(key);
      return null;
    }

    return entry.services;
  }

  /**
   * Store service list in cache.
   */
  setCachedServices(
    userId: string,
    platform: ComposioPlatform,
    services: Array<{ id: string; name: string; type: string }>,
  ): void {
    const key = getServiceCacheKey(userId, platform);
    serviceCache.set(key, {
      services,
      cachedAt: Date.now(),
    });
  }

  /**
   * Invalidate cached services (e.g., after a service is created/deleted).
   */
  invalidateServiceCache(userId: string, platform: ComposioPlatform): void {
    const key = getServiceCacheKey(userId, platform);
    serviceCache.delete(key);
  }

  // -------------------------------------------------------------------------
  // Disconnect
  // -------------------------------------------------------------------------

  /**
   * Disconnect a platform by removing the stored connection.
   */
  async disconnect(userId: string, platform: ComposioPlatform): Promise<void> {
    await ensureTable();
    const db = await openDb();

    try {
      db.prepare(
        'DELETE FROM composio_connections WHERE user_id = ? AND platform = ?',
      ).run(userId, platform);

      await logAudit('composio_disconnected', { userId, platform });
    } finally {
      db.close();
    }
  }
}

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

function mapErrorCode(message: string): ComposioServiceError['code'] {
  const lower = message.toLowerCase();
  if (lower.includes('401') || lower.includes('unauthorized')) return 'TOKEN_EXPIRED';
  if (lower.includes('403') || lower.includes('forbidden')) return 'PERMISSION_DENIED';
  if (lower.includes('404') || lower.includes('not found')) return 'PLATFORM_NOT_FOUND';
  if (lower.includes('429') || lower.includes('rate limit')) return 'RATE_LIMITED';
  if (lower.includes('5')) return 'PLATFORM_ERROR';
  return 'UNKNOWN';
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: ComposioService | null = null;

export function getComposioService(): ComposioService {
  if (!instance) {
    instance = new ComposioService();
  }
  return instance;
}
