/**
 * Johnny5 Configuration Management System
 *
 * Manages persistent configuration for the Johnny5 AI companion.
 * Stores settings in ~/.coder1/johnny5-config.json
 *
 * NOTE: Johnny5 now uses Claude Code CLI via Bridge connection instead of
 * direct Anthropic API calls. This allows Pro/Max plan users to use their
 * included Claude Code usage rather than paying separately for API calls.
 *
 * Features:
 * - Permission management
 * - Proactivity level control
 * - Integration configuration (Zapier, Telegram)
 * - Token budget tracking (estimated)
 *
 * DEPRECATED: API key functions are maintained for backward compatibility
 * but are no longer used. Johnny5 uses the Bridge connection instead.
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { logger } from './logger';
import { DATA_DIR, JOHNNY5_CONFIG_PATH, ensureDataDir } from './data-paths';

// ============================================================================
// Types
// ============================================================================

export interface Johnny5Permissions {
  readFiles: boolean;
  suggestCode: boolean;
  executeTerminal: boolean;
  externalRequests: boolean;
}

export interface ZapierIntegration {
  enabled: boolean;
  webhookUrl?: string;
}

export interface TelegramIntegration {
  enabled: boolean;
  botToken?: string;
  chatId?: string;
}

export interface Johnny5Integrations {
  zapier?: ZapierIntegration;
  telegram?: TelegramIntegration;
}

export interface TokenBudget {
  enabled: boolean;
  dailyLimit: number;
  action: 'warn' | 'stop';
}

export interface Johnny5Config {
  // Setup status
  isSetupComplete: boolean;
  setupCompletedAt?: string;

  // API configuration (key stored encrypted)
  apiKey?: string;
  apiKeyValidatedAt?: string;

  // Permissions
  permissions: Johnny5Permissions;

  // Behavior
  proactivityLevel: 'low' | 'medium' | 'high';

  // Integrations
  integrations: Johnny5Integrations;

  // Token budget
  tokenBudget?: TokenBudget;
}

// ============================================================================
// Constants
// ============================================================================

const CONFIG_DIR = DATA_DIR;
const CONFIG_FILE = JOHNNY5_CONFIG_PATH;
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const SALT = 'johnny5-salt-v1';

// ============================================================================
// Encryption Helpers
// ============================================================================

/**
 * Derive encryption key from machine-specific identifier
 */
function getEncryptionKey(): Buffer {
  const identifier = process.env.USER || process.env.USERNAME || 'coder1';
  return scryptSync(identifier, SALT, 32);
}

/**
 * Encrypt a string value
 */
function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    logger.error('[Johnny5] Encryption failed:', error);
    throw new Error('Failed to encrypt value');
  }
}

/**
 * Decrypt an encrypted string value
 */
function decrypt(encryptedText: string): string {
  try {
    const [ivHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !encrypted) {
      throw new Error('Invalid encrypted format');
    }
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    logger.error('[Johnny5] Decryption failed:', error);
    throw new Error('Failed to decrypt value');
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Get the default Johnny5 configuration
 */
export function getDefaultConfig(): Johnny5Config {
  return {
    isSetupComplete: false,
    permissions: {
      readFiles: true,        // ON by default (essential for AI assistance)
      suggestCode: true,      // ON by default (core value proposition)
      executeTerminal: false, // OFF by default (requires trust)
      externalRequests: false, // OFF by default (privacy protection)
    },
    proactivityLevel: 'medium',
    integrations: {},
  };
}

// ============================================================================
// Config File Operations
// ============================================================================

/**
 * Get the path to the config directory
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}

/**
 * Get the path to the config file
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * Ensure the config directory exists
 */
function ensureConfigDir(): void {
  ensureDataDir(); // Use centralized directory creation from data-paths.ts
}

/**
 * Validate the structure of a config object
 */
function validateConfig(config: unknown): config is Johnny5Config {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const c = config as Record<string, unknown>;

  // Check required fields
  if (typeof c.isSetupComplete !== 'boolean') {
    return false;
  }

  // Check permissions structure
  if (!c.permissions || typeof c.permissions !== 'object') {
    return false;
  }

  const p = c.permissions as Record<string, unknown>;
  const requiredPermissions = ['readFiles', 'suggestCode', 'executeTerminal', 'externalRequests'];
  for (const perm of requiredPermissions) {
    if (typeof p[perm] !== 'boolean') {
      return false;
    }
  }

  // Check proactivityLevel
  const validLevels = ['low', 'medium', 'high'];
  if (typeof c.proactivityLevel !== 'string' || !validLevels.includes(c.proactivityLevel)) {
    return false;
  }

  // Check integrations (optional but must be object if present)
  if (c.integrations !== undefined && typeof c.integrations !== 'object') {
    return false;
  }

  return true;
}

/**
 * Load the Johnny5 configuration from disk
 */
export function loadConfig(): Johnny5Config {
  ensureConfigDir();

  if (!existsSync(CONFIG_FILE)) {
    logger.debug('[Johnny5] Config file not found, using defaults');
    return getDefaultConfig();
  }

  try {
    const content = readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(content);

    if (!validateConfig(parsed)) {
      logger.warn('[Johnny5] Invalid config structure, resetting to defaults');
      const defaultConfig = getDefaultConfig();
      saveConfigInternal(defaultConfig);
      return defaultConfig;
    }

    logger.debug('[Johnny5] Loaded config from:', CONFIG_FILE);
    return parsed;
  } catch (error) {
    logger.error('[Johnny5] Failed to load config, resetting to defaults:', error);
    const defaultConfig = getDefaultConfig();
    saveConfigInternal(defaultConfig);
    return defaultConfig;
  }
}

/**
 * Internal save function (full config replacement)
 */
function saveConfigInternal(config: Johnny5Config): void {
  ensureConfigDir();

  try {
    const content = JSON.stringify(config, null, 2);
    writeFileSync(CONFIG_FILE, content, { encoding: 'utf8', mode: 0o600 });
    logger.debug('[Johnny5] Saved config to:', CONFIG_FILE);
  } catch (error) {
    logger.error('[Johnny5] Failed to save config:', error);
    throw new Error('Failed to save configuration');
  }
}

/**
 * Save partial configuration updates (merges with existing config)
 */
export function saveConfig(updates: Partial<Johnny5Config>): void {
  const currentConfig = loadConfig();

  // Deep merge for permissions and integrations
  const mergedConfig: Johnny5Config = {
    ...currentConfig,
    ...updates,
    permissions: {
      ...currentConfig.permissions,
      ...(updates.permissions || {}),
    },
    integrations: {
      ...currentConfig.integrations,
      ...(updates.integrations || {}),
    },
  };

  saveConfigInternal(mergedConfig);
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  const defaultConfig = getDefaultConfig();
  saveConfigInternal(defaultConfig);
  logger.info('[Johnny5] Configuration reset to defaults');
}

/**
 * Delete the configuration file entirely
 */
export function deleteConfig(): void {
  if (existsSync(CONFIG_FILE)) {
    try {
      unlinkSync(CONFIG_FILE);
      logger.info('[Johnny5] Configuration file deleted');
    } catch (error) {
      logger.error('[Johnny5] Failed to delete config file:', error);
      throw new Error('Failed to delete configuration file');
    }
  }
}

// ============================================================================
// Setup Status
// ============================================================================

/**
 * Check if setup is complete
 */
export function isSetupComplete(): boolean {
  const config = loadConfig();
  return config.isSetupComplete;
}

/**
 * Mark setup as complete
 */
export function markSetupComplete(): void {
  saveConfig({
    isSetupComplete: true,
    setupCompletedAt: new Date().toISOString(),
  });
  logger.info('[Johnny5] Setup marked as complete');
}

/**
 * Mark setup as incomplete (to re-run setup)
 */
export function markSetupIncomplete(): void {
  saveConfig({
    isSetupComplete: false,
  });
  logger.debug('[Johnny5] Setup marked as incomplete');
}

// ============================================================================
// Permissions Management
// ============================================================================

/**
 * Get current permissions
 */
export function getPermissions(): Johnny5Permissions {
  const config = loadConfig();
  return config.permissions;
}

/**
 * Set permissions (partial update)
 */
export function setPermissions(permissions: Partial<Johnny5Permissions>): void {
  saveConfig({
    permissions: permissions as Johnny5Permissions,
  });
  logger.debug('[Johnny5] Permissions updated:', permissions);
}

/**
 * Check if a specific permission is enabled
 */
export function hasPermission(permission: keyof Johnny5Permissions): boolean {
  const permissions = getPermissions();
  return permissions[permission];
}

// ============================================================================
// Proactivity Level
// ============================================================================

/**
 * Get current proactivity level
 */
export function getProactivityLevel(): 'low' | 'medium' | 'high' {
  const config = loadConfig();
  return config.proactivityLevel;
}

/**
 * Set proactivity level
 */
export function setProactivityLevel(level: 'low' | 'medium' | 'high'): void {
  if (!['low', 'medium', 'high'].includes(level)) {
    throw new Error('Invalid proactivity level. Must be: low, medium, or high');
  }

  saveConfig({ proactivityLevel: level });
  logger.debug('[Johnny5] Proactivity level set to:', level);
}

// ============================================================================
// Token Budget
// ============================================================================

/**
 * Get token budget configuration
 */
export function getTokenBudget(): TokenBudget | undefined {
  const config = loadConfig();
  return config.tokenBudget;
}

/**
 * Set token budget configuration
 */
export function setTokenBudget(budget: TokenBudget): void {
  if (budget.dailyLimit < 0) {
    throw new Error('Daily limit must be a positive number');
  }

  if (!['warn', 'stop'].includes(budget.action)) {
    throw new Error('Action must be: warn or stop');
  }

  saveConfig({ tokenBudget: budget });
  logger.debug('[Johnny5] Token budget configured:', budget);
}

/**
 * Clear token budget (disable)
 */
export function clearTokenBudget(): void {
  const config = loadConfig();
  delete config.tokenBudget;
  saveConfigInternal(config);
  logger.debug('[Johnny5] Token budget cleared');
}

// ============================================================================
// Integrations
// ============================================================================

/**
 * Get all integrations
 */
export function getIntegrations(): Johnny5Integrations {
  const config = loadConfig();
  return config.integrations;
}

/**
 * Configure Zapier integration
 */
export function setZapierIntegration(integration: ZapierIntegration): void {
  saveConfig({
    integrations: { zapier: integration },
  });
  logger.debug('[Johnny5] Zapier integration configured');
}

/**
 * Configure Telegram integration
 */
export function setTelegramIntegration(integration: TelegramIntegration): void {
  // Encrypt sensitive tokens if present
  const safeIntegration = { ...integration };
  if (integration.botToken) {
    safeIntegration.botToken = encrypt(integration.botToken);
  }

  saveConfig({
    integrations: { telegram: safeIntegration },
  });
  logger.debug('[Johnny5] Telegram integration configured');
}

/**
 * Get decrypted Telegram bot token
 */
export function getTelegramBotToken(): string | null {
  const config = loadConfig();
  const telegram = config.integrations.telegram;

  if (!telegram?.botToken) {
    return null;
  }

  try {
    return decrypt(telegram.botToken);
  } catch (error) {
    logger.error('[Johnny5] Failed to decrypt Telegram token:', error);
    return null;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Export configuration for debugging (without sensitive data)
 */
export function exportConfigSafe(): Omit<Johnny5Config, 'apiKey'> & { hasApiKey: boolean } {
  const config = loadConfig();
  const { apiKey, ...safeConfig } = config;

  // Also mask telegram token if present
  if (safeConfig.integrations.telegram?.botToken) {
    safeConfig.integrations.telegram.botToken = '[ENCRYPTED]';
  }

  return {
    ...safeConfig,
    hasApiKey: !!apiKey,
  };
}

/**
 * Get configuration summary for display
 */
export function getConfigSummary(): {
  setupComplete: boolean;
  hasApiKey: boolean;
  permissions: Johnny5Permissions;
  proactivityLevel: string;
  hasIntegrations: boolean;
  hasTokenBudget: boolean;
} {
  const config = loadConfig();

  return {
    setupComplete: config.isSetupComplete,
    hasApiKey: !!config.apiKey,
    permissions: config.permissions,
    proactivityLevel: config.proactivityLevel,
    hasIntegrations: !!(config.integrations.zapier?.enabled || config.integrations.telegram?.enabled),
    hasTokenBudget: !!config.tokenBudget?.enabled,
  };
}

// ============================================================================
// Export singleton logger for Johnny5
// ============================================================================

export const johnny5Logger = {
  debug: (...args: unknown[]) => logger.debug('[Johnny5]', ...args),
  info: (...args: unknown[]) => logger.info('[Johnny5]', ...args),
  warn: (...args: unknown[]) => logger.warn('[Johnny5]', ...args),
  error: (...args: unknown[]) => logger.error('[Johnny5]', ...args),
};
