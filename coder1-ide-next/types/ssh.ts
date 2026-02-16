/**
 * SSH Remote Connection Type Definitions
 * Types for SSH connection management, authentication, and bridge communication
 */

// ================================================================================
// Connection Status & Auth Types
// ================================================================================

/** Current state of an SSH connection */
export type SSHConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'reconnecting'
  | 'error'
  | 'never-tested';

/** Supported authentication methods */
export type SSHAuthMethod =
  | 'password'
  | 'key'
  | 'key-with-passphrase';

/** Known hosting platforms for platform-specific defaults */
export type SSHPlatform =
  | 'render'
  | 'railway'
  | 'digitalocean'
  | 'aws'
  | 'generic';

// ================================================================================
// Core SSH Connection
// ================================================================================

/** A saved SSH connection configuration */
export interface SSHConnection {
  /** Unique identifier (UUID v4) */
  id: string;

  /** User-friendly display name, e.g. "Render Production" */
  name: string;

  /** Hostname or IP address, e.g. "srv-abc123.render.com" */
  host: string;

  /** SSH port (default: 22) */
  port: number;

  /** SSH username, e.g. "root" or "render" */
  username: string;

  /** Authentication method for this connection */
  authMethod: SSHAuthMethod;

  // -- Credentials (stored encrypted at rest) --

  /** Password for password-based auth */
  password?: string;

  /** Path to private key file, e.g. "~/.ssh/id_rsa" */
  privateKeyPath?: string;

  /** Inline private key content (for platforms that provide keys directly) */
  privateKey?: string;

  /** Passphrase for encrypted private keys */
  passphrase?: string;

  // -- Metadata --

  /** ISO 8601 timestamp of when this connection was created */
  createdAt: string;

  /** ISO 8601 timestamp of the last successful connection */
  lastConnected?: string;

  /** Most recent connection status */
  lastStatus: SSHConnectionStatus;

  /** Last error message if status is 'error' */
  lastError?: string;

  // -- Optional configuration --

  /** Default working directory on the remote host, e.g. "/app" or "~" */
  defaultWorkingDirectory?: string;

  /** Hosting platform for platform-specific behavior */
  platform?: SSHPlatform;

  /** SSH keep-alive interval in seconds (default: 30) */
  keepAliveInterval?: number;

  /** Connection timeout in seconds (default: 10) */
  connectionTimeout?: number;
}

// ================================================================================
// Error Handling
// ================================================================================

/** Categorized SSH error codes */
export type SSHErrorCode =
  | 'AUTH_FAILED'
  | 'HOST_UNREACHABLE'
  | 'CONNECTION_REFUSED'
  | 'TIMEOUT'
  | 'DNS_FAILURE'
  | 'KEY_NOT_FOUND'
  | 'KEY_INVALID'
  | 'PASSPHRASE_REQUIRED'
  | 'CLAUDE_NOT_INSTALLED'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN';

/** Structured SSH connection error */
export interface SSHConnectionError {
  /** Machine-readable error code */
  code: SSHErrorCode;

  /** Human-readable error message */
  message: string;

  /** Additional diagnostic details */
  details?: string;

  /** Whether the connection can be retried without user intervention */
  recoverable: boolean;
}

// ================================================================================
// Remote Connection Context
// ================================================================================

/** Minimal context passed when routing commands to a remote connection */
export interface RemoteConnectionContext {
  /** Connection ID (references SSHConnection.id) */
  id: string;

  /** Remote host for display purposes */
  host: string;

  /** Current working directory on the remote */
  workingDirectory: string;
}

// ================================================================================
// Validation
// ================================================================================

/** Result of validating an SSHConnection before saving */
export interface SSHValidationResult {
  /** Whether the connection config is valid */
  valid: boolean;

  /** List of field-level validation errors */
  errors: SSHValidationError[];
}

/** A single field-level validation error */
export interface SSHValidationError {
  /** The SSHConnection field that failed validation */
  field: keyof SSHConnection;

  /** Human-readable description of the validation failure */
  message: string;
}

// ================================================================================
// Socket.IO Bridge Messages
// ================================================================================

/** Request payload sent from the IDE to the bridge to initiate an SSH connection */
export interface SSHConnectRequest {
  /** ID of the saved connection config */
  connectionId: string;

  /** Remote hostname */
  host: string;

  /** Remote SSH port */
  port: number;

  /** SSH username */
  username: string;

  /** Authentication method */
  authMethod: SSHAuthMethod;

  /** Password (for password auth) */
  password?: string;

  /** Path to private key file (for key auth) */
  privateKeyPath?: string;

  /** Passphrase for encrypted private key */
  passphrase?: string;

  /** Initial working directory on the remote */
  workingDirectory: string;
}

/** Status response sent from the bridge back to the IDE */
export interface SSHStatusResponse {
  /** Current connection status */
  status: SSHConnectionStatus;

  /** ID of the connection this status refers to */
  connectionId?: string;

  /** Claude CLI version detected on the remote, if available */
  claudeVersion?: string;

  /** Current working directory on the remote */
  workingDirectory?: string;

  /** Error message if status is 'error' */
  error?: string;

  /** ISO 8601 timestamp of when this status was generated */
  timestamp: string;
}

/** Progress updates during the SSH connection handshake */
export interface SSHProgressResponse {
  /** Current step in the connection sequence */
  step: 'authenticating' | 'verifying-claude' | 'setting-directory' | 'ready';

  /** Human-readable description of the current step */
  message: string;
}

// ================================================================================
// SSH Connection Defaults
// ================================================================================

/** Default values for new SSH connections */
export const SSH_DEFAULTS = {
  PORT: 22,
  KEEP_ALIVE_INTERVAL: 30,
  CONNECTION_TIMEOUT: 10,
  WORKING_DIRECTORY: '~',
  PLATFORM: 'generic' as SSHPlatform,
} as const;

/** Socket.IO event names for SSH bridge communication */
export const SSH_EVENTS = {
  CONNECT: 'ssh:connect',
  DISCONNECT: 'ssh:disconnect',
  STATUS: 'ssh:status',
  PROGRESS: 'ssh:progress',
  ERROR: 'ssh:error',
  TEST: 'ssh:test',
} as const;
