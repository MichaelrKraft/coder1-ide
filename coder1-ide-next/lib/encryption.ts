/**
 * Server-Side Encryption Utilities
 *
 * AES-256-GCM encryption for sensitive data like OAuth tokens.
 * Uses Node.js crypto module - server-side only.
 *
 * The encryption key is derived from COMPOSIO_ENCRYPTION_KEY env var
 * (or falls back to a deterministic key from COMPOSIO_API_KEY).
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derive a 32-byte encryption key from environment.
 * Prefers COMPOSIO_ENCRYPTION_KEY; falls back to hashing COMPOSIO_API_KEY.
 */
function getEncryptionKey(): Buffer {
  const explicit = process.env.COMPOSIO_ENCRYPTION_KEY;
  if (explicit) {
    return createHash('sha256').update(explicit).digest();
  }

  const apiKey = process.env.COMPOSIO_API_KEY;
  if (apiKey) {
    return createHash('sha256').update(`composio-token-encryption:${apiKey}`).digest();
  }

  throw new Error(
    '[Encryption] Neither COMPOSIO_ENCRYPTION_KEY nor COMPOSIO_API_KEY is set. Cannot encrypt tokens.'
  );
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64 string containing IV + authTag + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Pack: IV (16) + authTag (16) + ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString('base64');
}

/**
 * Decrypt a base64 string produced by encrypt().
 * Returns the original plaintext.
 */
export function decrypt(encoded: string): string {
  const key = getEncryptionKey();
  const packed = Buffer.from(encoded, 'base64');

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
