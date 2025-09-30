/**
 * Memory System Types and Constants
 * Provides types for the enhanced memory context system
 */

export enum MemoryMode {
  OFF = 'off',          // No memory context
  SAFE = 'safe',        // Only recent, high-confidence context (default)
  ON = 'on'             // Full memory context
}

export interface MemoryConfig {
  mode: MemoryMode;
  enabled: boolean;
  autoInject: boolean;
  maxTokens: number;
  maxAge: number; // Days before context expires
}

export interface MemoryCorrection {
  id: string;
  sessionId: string;
  incorrectInfo: string;
  correction: string;
  timestamp: Date;
}

export interface SafeModeFilter {
  maxAge: number; // 7 days default
  requireVerified: boolean;
  excludeErrors: boolean;
  excludeFlagged: boolean;
  minConfidence: number;
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  mode: MemoryMode.SAFE,
  enabled: false, // Start disabled until user enables
  autoInject: true,
  maxTokens: 1000,
  maxAge: 7
};

export const SAFE_MODE_FILTER: SafeModeFilter = {
  maxAge: 7,
  requireVerified: false, // Don't require verification, just no errors
  excludeErrors: true,
  excludeFlagged: true,
  minConfidence: 0.7
};