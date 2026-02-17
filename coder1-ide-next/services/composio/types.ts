/**
 * Composio Integration Types
 *
 * Type definitions for the Composio OAuth service layer.
 */

/** Supported deployment platforms */
export type ComposioPlatform = 'render' | 'vercel' | 'supabase';

/** Connection status returned by the service */
export interface ConnectionStatus {
  platform: ComposioPlatform;
  connected: boolean;
  status: 'connected' | 'expired' | 'disconnected' | 'error';
  connectedAt?: string;
  lastUsedAt?: string;
  error?: string;
}

/** Result of executing a Composio action */
export interface ActionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  /** HTTP status from the upstream platform API */
  httpStatus?: number;
}

/** Stored connection record (persisted in SQLite) */
export interface StoredConnection {
  id: string;
  userId: string;
  platform: ComposioPlatform;
  /** Composio's connected account ID */
  composioAccountId: string;
  /** Encrypted access token */
  accessToken: string;
  /** Encrypted refresh token */
  refreshToken?: string;
  status: 'connected' | 'expired' | 'error';
  connectedAt: string;
  lastUsedAt?: string;
}

/** Composio service error with actionable context */
export class ComposioServiceError extends Error {
  constructor(
    message: string,
    public readonly code: ComposioErrorCode,
    public readonly platform?: ComposioPlatform,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'ComposioServiceError';
  }
}

export type ComposioErrorCode =
  | 'NOT_INITIALIZED'
  | 'NOT_CONNECTED'
  | 'TOKEN_EXPIRED'
  | 'PERMISSION_DENIED'
  | 'PLATFORM_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'PLATFORM_ERROR'
  | 'INVALID_CALLBACK'
  | 'ENCRYPTION_ERROR'
  | 'UNKNOWN';
