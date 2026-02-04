/**
 * ManusLive Memory Integration Module
 *
 * This module provides read access to ManusLive's memory files (MEMORY.md and USER.md),
 * enabling Johnny5 in Coder1 IDE to have unified memory across all communication channels
 * (Telegram, WhatsApp, Coder1 IDE).
 *
 * Memory File Locations:
 * - ~/.manuslive/workspace/MEMORY.md - Facts, preferences, context, goals
 * - ~/.manuslive/workspace/USER.md - Detailed user profile
 *
 * Features:
 * - Graceful error handling when files don't exist
 * - In-memory cache with 60-second TTL to reduce disk reads
 * - Markdown parsing into structured data
 *
 * @module manuslive-memory
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ============================================================================
// Types
// ============================================================================

/**
 * Parsed section from MEMORY.md
 */
export interface MemorySection {
  /** Section title (e.g., "User Preferences", "Important Facts") */
  title: string;
  /** List of items in this section */
  items: string[];
}

/**
 * Complete parsed memory from MEMORY.md
 */
export interface ManusLiveMemory {
  /** User preferences (e.g., "User's favorite color is blue") */
  preferences: string[];
  /** Important facts about the user */
  facts: string[];
  /** Persistent context information */
  context: string[];
  /** User goals */
  goals: string[];
  /** All sections for extensibility */
  sections: MemorySection[];
  /** Raw markdown content */
  rawContent: string;
  /** When this memory was last read from disk */
  lastReadAt: Date;
  /** File path that was read */
  filePath: string;
}

/**
 * User profile basic info from USER.md
 */
export interface UserBasicInfo {
  name: string | null;
  age: string | null;
  role: string | null;
  family: string | null;
  background: string | null;
  currentBusiness: string | null;
  selfIdentification: string | null;
}

/**
 * User preferences from USER.md
 */
export interface UserPreferences {
  favoriteColor: string | null;
  workStyle: string[];
  challenges: string[];
  technicalStrengths: string[];
  technologyStack: string[];
}

/**
 * Communication style preferences from USER.md
 */
export interface CommunicationStyle {
  whatWorks: string[];
  whatDoesntWork: string[];
  decisionMakingSupport: string[];
}

/**
 * Complete parsed user profile from USER.md
 */
export interface ManusLiveUserProfile {
  /** Basic information */
  basicInfo: UserBasicInfo;
  /** User preferences */
  preferences: UserPreferences;
  /** Current focus/priority */
  currentFocus: string[];
  /** Communication style */
  communicationStyle: CommunicationStyle;
  /** Important context */
  importantContext: string[];
  /** Raw markdown content */
  rawContent: string;
  /** When this profile was last read from disk */
  lastReadAt: Date;
  /** File path that was read */
  filePath: string;
}

/**
 * Unified context combining ManusLive and local Johnny5 data
 */
export interface UnifiedMemoryContext {
  /** Whether ManusLive memory was available */
  manusLiveAvailable: boolean;
  /** Memory from ManusLive MEMORY.md */
  memory: ManusLiveMemory | null;
  /** User profile from ManusLive USER.md */
  userProfile: ManusLiveUserProfile | null;
  /** Human-readable summary for AI context */
  contextSummary: string;
  /** Timestamp when context was generated */
  generatedAt: Date;
}

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: {
  memory: CacheEntry<ManusLiveMemory | null> | null;
  userProfile: CacheEntry<ManusLiveUserProfile | null> | null;
} = {
  memory: null,
  userProfile: null,
};

// ============================================================================
// File Paths
// ============================================================================

const MANUSLIVE_DIR = join(homedir(), '.manuslive', 'workspace');
const MEMORY_FILE_PATH = join(MANUSLIVE_DIR, 'MEMORY.md');
const USER_FILE_PATH = join(MANUSLIVE_DIR, 'USER.md');

// Log ManusLive availability on first check (helpful for production debugging)
let manusLiveAvailabilityLogged = false;

function logManusLiveAvailability(): void {
  if (manusLiveAvailabilityLogged) return;
  manusLiveAvailabilityLogged = true;

  if (!existsSync(MANUSLIVE_DIR)) {
    console.log('[ManusLive] Directory not found at:', MANUSLIVE_DIR);
    console.log('[ManusLive] This is expected in production - memory will rely on Johnny5 database');
  } else {
    console.log('[ManusLive] Found local installation at:', MANUSLIVE_DIR);
    console.log('[ManusLive] Will use ManusLive files for enhanced memory context');
  }
}

/**
 * Check if ManusLive directory exists
 */
export function isManusLiveInstalled(): boolean {
  return existsSync(MANUSLIVE_DIR);
}

/**
 * Get the ManusLive workspace directory path
 */
export function getManusLiveDirectory(): string {
  return MANUSLIVE_DIR;
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse a markdown list into an array of strings
 * Handles bullet points with -, *, or numbered lists
 */
function parseMarkdownList(content: string): string[] {
  const lines = content.split('\n');
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match lines starting with -, *, or numbered list (1., 2., etc.)
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);

    if (bulletMatch) {
      items.push(bulletMatch[1].trim());
    } else if (numberedMatch) {
      items.push(numberedMatch[1].trim());
    }
  }

  // Remove duplicates (the MEMORY.md file has some duplicates)
  return [...new Set(items)];
}

/**
 * Extract sections from markdown content
 */
function extractSections(content: string): MemorySection[] {
  const sections: MemorySection[] = [];
  const sectionRegex = /^##\s+(.+)$/gm;

  let match;
  const sectionStarts: { title: string; index: number }[] = [];

  while ((match = sectionRegex.exec(content)) !== null) {
    sectionStarts.push({
      title: match[1].trim(),
      index: match.index,
    });
  }

  for (let i = 0; i < sectionStarts.length; i++) {
    const start = sectionStarts[i];
    const end = sectionStarts[i + 1]?.index ?? content.length;
    const sectionContent = content.slice(start.index, end);

    sections.push({
      title: start.title,
      items: parseMarkdownList(sectionContent),
    });
  }

  return sections;
}

/**
 * Extract a specific section by title (case-insensitive partial match)
 */
function getSectionItems(sections: MemorySection[], titlePattern: string): string[] {
  const pattern = titlePattern.toLowerCase();
  const section = sections.find(s => s.title.toLowerCase().includes(pattern));
  return section?.items ?? [];
}

/**
 * Extract key-value pairs from markdown (e.g., "**Name:** Mike")
 */
function extractKeyValue(content: string, key: string): string | null {
  const pattern = new RegExp(`\\*\\*${key}:\\*\\*\\s*(.+)`, 'i');
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Extract a named section's bullet points from USER.md format
 */
function extractNamedSection(content: string, sectionName: string): string[] {
  // Match section headers like **Work Style:** followed by bullet points
  const sectionPattern = new RegExp(
    `\\*\\*${sectionName}:\\*\\*\\s*([\\s\\S]*?)(?=\\*\\*[^*]+:\\*\\*|##|$)`,
    'i'
  );
  const match = content.match(sectionPattern);
  if (!match) return [];
  return parseMarkdownList(match[1]);
}

// ============================================================================
// Main API Functions
// ============================================================================

/**
 * Read and parse ManusLive's MEMORY.md file
 *
 * @param forceRefresh - Skip cache and read from disk
 * @returns Parsed memory or null if file doesn't exist
 *
 * @example
 * ```typescript
 * const memory = await getManusLiveMemory();
 * if (memory) {
 *   console.log('User prefers:', memory.preferences);
 *   console.log('Known facts:', memory.facts);
 * }
 * ```
 */
export async function getManusLiveMemory(forceRefresh = false): Promise<ManusLiveMemory | null> {
  // Log availability status on first call
  logManusLiveAvailability();

  const now = Date.now();

  // Check cache
  if (!forceRefresh && cache.memory && now - cache.memory.timestamp < CACHE_TTL_MS) {
    return cache.memory.data;
  }

  // Check if file exists
  if (!existsSync(MEMORY_FILE_PATH)) {
    cache.memory = { data: null, timestamp: now };
    return null;
  }

  try {
    const content = await readFile(MEMORY_FILE_PATH, 'utf-8');
    const sections = extractSections(content);

    const memory: ManusLiveMemory = {
      preferences: getSectionItems(sections, 'User Preferences'),
      facts: getSectionItems(sections, 'Important Facts'),
      context: getSectionItems(sections, 'Context'),
      goals: getSectionItems(sections, 'Goals'),
      sections,
      rawContent: content,
      lastReadAt: new Date(),
      filePath: MEMORY_FILE_PATH,
    };

    cache.memory = { data: memory, timestamp: now };
    return memory;
  } catch (error) {
    console.error('[ManusLive] Error reading MEMORY.md:', error);
    cache.memory = { data: null, timestamp: now };
    return null;
  }
}

/**
 * Read and parse ManusLive's USER.md file
 *
 * @param forceRefresh - Skip cache and read from disk
 * @returns Parsed user profile or null if file doesn't exist
 *
 * @example
 * ```typescript
 * const profile = await getManusLiveUserProfile();
 * if (profile) {
 *   console.log('User name:', profile.basicInfo.name);
 *   console.log('Work style:', profile.preferences.workStyle);
 * }
 * ```
 */
export async function getManusLiveUserProfile(forceRefresh = false): Promise<ManusLiveUserProfile | null> {
  // Log availability status on first call
  logManusLiveAvailability();

  const now = Date.now();

  // Check cache
  if (!forceRefresh && cache.userProfile && now - cache.userProfile.timestamp < CACHE_TTL_MS) {
    return cache.userProfile.data;
  }

  // Check if file exists
  if (!existsSync(USER_FILE_PATH)) {
    cache.userProfile = { data: null, timestamp: now };
    return null;
  }

  try {
    const content = await readFile(USER_FILE_PATH, 'utf-8');

    // Extract Basic Info section
    const basicInfo: UserBasicInfo = {
      name: extractKeyValue(content, 'Name'),
      age: extractKeyValue(content, 'Age'),
      role: extractKeyValue(content, 'Role'),
      family: extractKeyValue(content, 'Family'),
      background: extractKeyValue(content, 'Background'),
      currentBusiness: extractKeyValue(content, 'Current Business'),
      selfIdentification: extractKeyValue(content, 'Self-Identification'),
    };

    // Extract Preferences section
    const preferences: UserPreferences = {
      favoriteColor: extractKeyValue(content, 'Favorite Color'),
      workStyle: extractNamedSection(content, 'Work Style'),
      challenges: extractNamedSection(content, 'Challenges'),
      technicalStrengths: extractNamedSection(content, 'Technical Strengths'),
      technologyStack: extractNamedSection(content, 'Technology Stack'),
    };

    // Extract Communication Style section
    const communicationStyle: CommunicationStyle = {
      whatWorks: extractNamedSection(content, 'What Works'),
      whatDoesntWork: extractNamedSection(content, "What Doesn't Work"),
      decisionMakingSupport: extractNamedSection(content, 'Decision-Making Support Needed'),
    };

    // Extract Current Focus section
    const currentFocusSection = content.match(/## Current Focus[\s\S]*?(?=##|$)/i);
    const currentFocus = currentFocusSection ? parseMarkdownList(currentFocusSection[0]) : [];

    // Extract Important Context section
    const importantContextSection = content.match(/## Important Context[\s\S]*?(?=##|$)/i);
    const importantContext = importantContextSection ? parseMarkdownList(importantContextSection[0]) : [];

    const profile: ManusLiveUserProfile = {
      basicInfo,
      preferences,
      currentFocus,
      communicationStyle,
      importantContext,
      rawContent: content,
      lastReadAt: new Date(),
      filePath: USER_FILE_PATH,
    };

    cache.userProfile = { data: profile, timestamp: now };
    return profile;
  } catch (error) {
    console.error('[ManusLive] Error reading USER.md:', error);
    cache.userProfile = { data: null, timestamp: now };
    return null;
  }
}

/**
 * Get unified context combining all ManusLive memory
 *
 * This function aggregates data from both MEMORY.md and USER.md and creates
 * a human-readable summary suitable for including in AI context.
 *
 * @param forceRefresh - Skip cache and read from disk
 * @returns Unified memory context
 *
 * @example
 * ```typescript
 * const context = await getUnifiedManusLiveContext();
 * console.log(context.contextSummary);
 * // Output: "User: Mike (46 years old, Entrepreneur and technical founder)..."
 * ```
 */
export async function getUnifiedManusLiveContext(forceRefresh = false): Promise<UnifiedMemoryContext> {
  // Log availability status on first call
  logManusLiveAvailability();

  const [memory, userProfile] = await Promise.all([
    getManusLiveMemory(forceRefresh),
    getManusLiveUserProfile(forceRefresh),
  ]);

  const available = memory !== null || userProfile !== null;

  // Build human-readable context summary
  const summaryParts: string[] = [];

  if (userProfile?.basicInfo.name) {
    const namePart = userProfile.basicInfo.name;
    const agePart = userProfile.basicInfo.age ? ` (${userProfile.basicInfo.age}` : '';
    const rolePart = userProfile.basicInfo.role ? `, ${userProfile.basicInfo.role}` : '';
    summaryParts.push(`User: ${namePart}${agePart}${rolePart ? rolePart + ')' : agePart ? ')' : ''}`);
  }

  if (userProfile?.preferences.favoriteColor) {
    summaryParts.push(`Favorite color: ${userProfile.preferences.favoriteColor}`);
  }

  if (userProfile?.currentFocus.length) {
    summaryParts.push(`Current focus: ${userProfile.currentFocus.slice(0, 3).join('; ')}`);
  }

  if (memory?.facts.length) {
    summaryParts.push(`Key facts: ${memory.facts.slice(0, 5).join('; ')}`);
  }

  if (memory?.goals.length) {
    summaryParts.push(`Goals: ${memory.goals.slice(0, 3).join('; ')}`);
  }

  if (userProfile?.communicationStyle.whatWorks.length) {
    summaryParts.push(`Communication: ${userProfile.communicationStyle.whatWorks.slice(0, 3).join('; ')}`);
  }

  const contextSummary = summaryParts.length > 0
    ? summaryParts.join('\n')
    : 'No ManusLive memory available.';

  return {
    manusLiveAvailable: available,
    memory,
    userProfile,
    contextSummary,
    generatedAt: new Date(),
  };
}

/**
 * Clear the memory cache
 *
 * Useful when you know the files have been updated and want fresh data immediately.
 */
export function clearManusLiveCache(): void {
  cache.memory = null;
  cache.userProfile = null;
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): {
  memoryCached: boolean;
  memoryAge: number | null;
  userProfileCached: boolean;
  userProfileAge: number | null;
  ttlMs: number;
} {
  const now = Date.now();
  return {
    memoryCached: cache.memory !== null,
    memoryAge: cache.memory ? now - cache.memory.timestamp : null,
    userProfileCached: cache.userProfile !== null,
    userProfileAge: cache.userProfile ? now - cache.userProfile.timestamp : null,
    ttlMs: CACHE_TTL_MS,
  };
}
