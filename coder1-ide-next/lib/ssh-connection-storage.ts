/**
 * SSH Connection Storage Service
 *
 * Stores and retrieves SSH connection configurations in localStorage.
 * Sensitive fields (password, privateKey, passphrase) are XOR-obfuscated before storage.
 */

'use client';

import type {
  SSHConnection,
  SSHAuthMethod,
  SSHValidationResult,
  SSHValidationError,
} from '../types/ssh';

const STORAGE_KEY = 'coder1_ssh_connections';
const ACTIVE_CONNECTION_KEY = 'coder1_active_ssh_connection';
const ENCRYPTION_KEY = 'coder1-ssh-secure-v1';

/** Fields that are encrypted before being persisted */
const ENCRYPTED_FIELDS: (keyof SSHConnection)[] = ['password', 'privateKey', 'passphrase'];

const VALID_AUTH_METHODS: SSHAuthMethod[] = ['password', 'key', 'key-with-passphrase'];

/** Simple hostname/IP regex -- allows FQDN and IPv4 */
const HOST_PATTERN = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

class SSHConnectionStorageClass {
  // ---------------------------------------------------------------------------
  // Encryption helpers (XOR obfuscation, mirrors api-key-storage.ts)
  // ---------------------------------------------------------------------------

  private encrypt(text: string): string {
    if (!text) return '';
    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
      encrypted += String.fromCharCode(
        text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length),
      );
    }
    return btoa(encrypted);
  }

  private decrypt(encrypted: string): string {
    if (!encrypted) return '';
    try {
      const text = atob(encrypted);
      let decrypted = '';
      for (let i = 0; i < text.length; i++) {
        decrypted += String.fromCharCode(
          text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length),
        );
      }
      return decrypted;
    } catch (error) {
      console.error('[SSHStorage] Decryption error:', error);
      return '';
    }
  }

  // ---------------------------------------------------------------------------
  // Internal persistence helpers
  // ---------------------------------------------------------------------------

  /** Read raw (encrypted) connection list from localStorage */
  private readRaw(): SSHConnection[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored) as SSHConnection[];
    } catch (error) {
      console.error('[SSHStorage] Error reading connections:', error);
      return [];
    }
  }

  /** Write raw connection list to localStorage and dispatch update event */
  private writeRaw(connections: SSHConnection[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
      window.dispatchEvent(new Event('ssh-connections-updated'));
    } catch (error) {
      console.error('[SSHStorage] Error writing connections:', error);
    }
  }

  /** Decrypt sensitive fields on a single connection */
  private decryptConnection(conn: SSHConnection): SSHConnection {
    const decrypted = { ...conn };
    for (const field of ENCRYPTED_FIELDS) {
      const value = decrypted[field] as string | undefined;
      if (value) {
        (decrypted as Record<string, unknown>)[field] = this.decrypt(value);
      }
    }
    return decrypted;
  }

  /** Encrypt sensitive fields on a single connection */
  private encryptConnection(conn: SSHConnection): SSHConnection {
    const encrypted = { ...conn };
    for (const field of ENCRYPTED_FIELDS) {
      const value = encrypted[field] as string | undefined;
      if (value) {
        (encrypted as Record<string, unknown>)[field] = this.encrypt(value);
      }
    }
    return encrypted;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Get all saved connections (with sensitive fields decrypted) */
  getConnections(): SSHConnection[] {
    return this.readRaw().map((c) => this.decryptConnection(c));
  }

  /** Get a specific connection by ID (with sensitive fields decrypted) */
  getConnection(id: string): SSHConnection | null {
    const raw = this.readRaw().find((c) => c.id === id);
    if (!raw) return null;
    return this.decryptConnection(raw);
  }

  /**
   * Save a new connection.
   * Generates a UUID and sets `createdAt` automatically.
   */
  saveConnection(
    connection: Omit<SSHConnection, 'id' | 'createdAt'>,
  ): SSHConnection {
    const newConn: SSHConnection = {
      ...connection,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    const connections = this.readRaw();
    connections.push(this.encryptConnection(newConn));
    this.writeRaw(connections);

    return newConn;
  }

  /**
   * Update an existing connection.
   * Returns the updated connection or `null` if the ID was not found.
   */
  updateConnection(
    id: string,
    updates: Partial<SSHConnection>,
  ): SSHConnection | null {
    const connections = this.readRaw();
    const index = connections.findIndex((c) => c.id === id);
    if (index === -1) return null;

    // Decrypt the existing record so we can merge plaintext values
    const existing = this.decryptConnection(connections[index]);
    const merged: SSHConnection = { ...existing, ...updates, id };

    connections[index] = this.encryptConnection(merged);
    this.writeRaw(connections);

    return merged;
  }

  /** Delete a connection by ID. Returns `true` if the connection existed. */
  deleteConnection(id: string): boolean {
    const connections = this.readRaw();
    const filtered = connections.filter((c) => c.id !== id);

    if (filtered.length === connections.length) return false;

    this.writeRaw(filtered);

    // Clear active connection if it was the deleted one
    if (this.getActiveConnectionId() === id) {
      this.setActiveConnectionId(null);
    }

    return true;
  }

  /** Get the ID of the currently active SSH connection (or `null`) */
  getActiveConnectionId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_CONNECTION_KEY);
    } catch {
      return null;
    }
  }

  /** Set (or clear) the currently active SSH connection ID */
  setActiveConnectionId(id: string | null): void {
    try {
      if (id === null) {
        localStorage.removeItem(ACTIVE_CONNECTION_KEY);
      } else {
        localStorage.setItem(ACTIVE_CONNECTION_KEY, id);
      }
      window.dispatchEvent(new Event('ssh-connections-updated'));
    } catch (error) {
      console.error('[SSHStorage] Error setting active connection:', error);
    }
  }

  /**
   * Validate a partial connection configuration.
   * Returns a result object indicating whether the config is valid and any
   * field-level errors.
   */
  validateConnection(conn: Partial<SSHConnection>): SSHValidationResult {
    const errors: SSHValidationError[] = [];

    // name
    if (!conn.name || conn.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Connection name is required' });
    }

    // host
    if (!conn.host || conn.host.trim().length === 0) {
      errors.push({ field: 'host', message: 'Host is required' });
    } else if (!HOST_PATTERN.test(conn.host.trim())) {
      errors.push({ field: 'host', message: 'Host must be a valid hostname or IP address' });
    }

    // port
    if (conn.port === undefined || conn.port === null) {
      errors.push({ field: 'port', message: 'Port is required' });
    } else if (!Number.isInteger(conn.port) || conn.port < 1 || conn.port > 65535) {
      errors.push({ field: 'port', message: 'Port must be an integer between 1 and 65535' });
    }

    // username
    if (!conn.username || conn.username.trim().length === 0) {
      errors.push({ field: 'username', message: 'Username is required' });
    }

    // authMethod
    if (!conn.authMethod) {
      errors.push({ field: 'authMethod', message: 'Authentication method is required' });
    } else if (!VALID_AUTH_METHODS.includes(conn.authMethod)) {
      errors.push({ field: 'authMethod', message: 'Invalid authentication method' });
    } else {
      // Auth-method-specific validations
      switch (conn.authMethod) {
        case 'password':
          if (!conn.password || conn.password.length === 0) {
            errors.push({ field: 'password', message: 'Password is required for password authentication' });
          }
          break;

        case 'key':
          if ((!conn.privateKeyPath || conn.privateKeyPath.trim().length === 0) &&
              (!conn.privateKey || conn.privateKey.length === 0)) {
            errors.push({
              field: 'privateKeyPath',
              message: 'Private key path or inline key is required for key authentication',
            });
          }
          break;

        case 'key-with-passphrase':
          if (!conn.privateKeyPath || conn.privateKeyPath.trim().length === 0) {
            errors.push({
              field: 'privateKeyPath',
              message: 'Private key path is required for key-with-passphrase authentication',
            });
          }
          if (!conn.passphrase || conn.passphrase.length === 0) {
            errors.push({
              field: 'passphrase',
              message: 'Passphrase is required for key-with-passphrase authentication',
            });
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const SSHConnectionStorage = new SSHConnectionStorageClass();
