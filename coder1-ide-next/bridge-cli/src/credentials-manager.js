/**
 * Credentials Manager for Coder1 Bridge
 *
 * Handles secure storage and retrieval of Bridge credentials
 * for auto-reconnect functionality.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const CODER1_DIR = path.join(os.homedir(), '.coder1');
const CREDENTIALS_FILE = path.join(CODER1_DIR, 'bridge-credentials.json');

/**
 * Generate a machine-specific encryption key
 * Uses hostname + username as a simple machine identifier
 */
function getEncryptionKey() {
  const machineId = os.hostname() + os.userInfo().username;
  return crypto.createHash('sha256').update(machineId).digest();
}

/**
 * Encrypt text using AES-256-CBC
 * @param {string} text - Text to encrypt
 * @returns {string} Encrypted text (iv:ciphertext format)
 */
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt text using AES-256-CBC
 * @param {string} text - Encrypted text (iv:ciphertext format)
 * @returns {string} Decrypted text
 */
function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Save credentials to encrypted file
 * @param {Object} credentials - Credentials object containing token, bridgeId, userId, serverUrl
 */
function saveCredentials(credentials) {
  if (!fs.existsSync(CODER1_DIR)) {
    fs.mkdirSync(CODER1_DIR, { recursive: true });
  }
  const encrypted = encrypt(JSON.stringify(credentials));
  fs.writeFileSync(CREDENTIALS_FILE, encrypted, 'utf8');
}

/**
 * Load credentials from encrypted file
 * @returns {Object|null} Credentials object or null if not found/invalid
 */
function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_FILE)) return null;
  try {
    const encrypted = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
    return JSON.parse(decrypt(encrypted));
  } catch (e) {
    // Credentials file corrupted or encryption key changed (different machine)
    return null;
  }
}

/**
 * Clear saved credentials
 */
function clearCredentials() {
  if (fs.existsSync(CREDENTIALS_FILE)) {
    fs.unlinkSync(CREDENTIALS_FILE);
  }
}

/**
 * Check if credentials file exists
 * @returns {boolean}
 */
function hasCredentials() {
  return fs.existsSync(CREDENTIALS_FILE);
}

module.exports = {
  saveCredentials,
  loadCredentials,
  clearCredentials,
  hasCredentials,
  CREDENTIALS_FILE
};
