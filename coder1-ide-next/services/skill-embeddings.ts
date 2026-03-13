/**
 * Semantic Skill Matching with Gemini Embeddings
 *
 * Enables Johnny5 to understand user intent and match to skills semantically,
 * rather than requiring exact keyword triggers.
 *
 * Example: "What's trending in tech?" -> matches hackernews-digest skill
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ============================================================================
// Types
// ============================================================================

interface SkillMetadata {
  name: string;
  description: string;
  path: string;
}

interface SkillEmbedding extends SkillMetadata {
  embedding: number[];
}

interface EmbeddingsCache {
  model: string;
  dimensions: number;
  generated_at: string;
  skills: SkillEmbedding[];
}

interface SkillMatch {
  skill: SkillMetadata;
  similarity: number;
}

// ============================================================================
// Configuration
// ============================================================================

const SKILLS_DIR = join(homedir(), '.johnny5', 'skills');
const CACHE_FILE = join(homedir(), '.johnny5', 'cache', 'skill-embeddings.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const GEMINI_MODEL = 'gemini-embedding-001'; // Correct model name from API
const EMBEDDING_DIMENSIONS = 768;
const SIMILARITY_THRESHOLD = 0.65; // Tuned to avoid false positives on generic queries

// ============================================================================
// Gemini API Client
// ============================================================================

async function getGeminiApiKey(): Promise<string> {
  const key = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      'Missing GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable. ' +
      'Get one at: https://aistudio.google.com/apikey'
    );
  }
  return key;
}

async function embedText(text: string, taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'): Promise<number[]> {
  const apiKey = await getGeminiApiKey();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${GEMINI_MODEL}`,
        content: { parts: [{ text }] },
        taskType,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

// ============================================================================
// Skill Discovery
// ============================================================================

/**
 * Recursively find all SKILL.md files under the skills directory
 */
function findSkillFiles(dir: string): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findSkillFiles(fullPath));
    } else if (entry === 'SKILL.md') {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extract name and description from SKILL.md
 * Supports two formats:
 * 1. YAML frontmatter (---\nname: ...\ndescription: ...\n---)
 * 2. Markdown headers (# Title\n## Purpose\nDescription...)
 */
function parseSkillFile(filePath: string): SkillMetadata | null {
  try {
    const content = readFileSync(filePath, 'utf-8');

    // Try Format 1: YAML frontmatter
    const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (yamlMatch) {
      const frontmatter = yamlMatch[1];
      const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
      const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

      if (nameMatch && descMatch) {
        return {
          name: nameMatch[1].trim(),
          description: descMatch[1].trim(),
          path: filePath,
        };
      }
    }

    // Try Format 2: Markdown headers (# Title / ## Purpose)
    const titleMatch = content.match(/^#\s+(.+?)(?:\s*\(.*\))?$/m);
    const purposeMatch = content.match(/##\s*Purpose\s*\n+([\s\S]*?)(?=\n##|\n$)/i);

    if (titleMatch) {
      // Extract first sentence/paragraph from Purpose section, or use title as description
      let description = titleMatch[1].trim();
      if (purposeMatch) {
        // Get first paragraph (up to double newline or 200 chars)
        const purposeText = purposeMatch[1].trim();
        const firstParagraph = purposeText.split(/\n\n/)[0];
        description = firstParagraph.slice(0, 200).trim();
        if (firstParagraph.length > 200) description += '...';
      }

      // Convert title to slug-style name (e.g., "HackerNews Digest" -> "hackernews-digest")
      const name = titleMatch[1]
        .toLowerCase()
        .replace(/\s*\(.*\)\s*$/g, '') // Remove parenthetical suffixes like "(Advanced)"
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      return { name, description, path: filePath };
    }

    console.warn(`[SkillEmbeddings] Could not parse ${filePath} - no valid format found`);
    return null;
  } catch (error) {
    console.error(`[SkillEmbeddings] Error parsing ${filePath}:`, error);
    return null;
  }
}

// ============================================================================
// Embedding Cache
// ============================================================================

function loadCache(): EmbeddingsCache | null {
  if (!existsSync(CACHE_FILE)) return null;

  try {
    const content = readFileSync(CACHE_FILE, 'utf-8');
    const cache = JSON.parse(content) as EmbeddingsCache;

    // Check if cache is stale
    const generatedAt = new Date(cache.generated_at).getTime();
    if (Date.now() - generatedAt > CACHE_TTL_MS) {
      console.log('[SkillEmbeddings] Cache expired, will regenerate');
      return null;
    }

    return cache;
  } catch (error) {
    console.error('[SkillEmbeddings] Error loading cache:', error);
    return null;
  }
}

function saveCache(cache: EmbeddingsCache): void {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    console.log(`[SkillEmbeddings] Saved ${cache.skills.length} skill embeddings to cache`);
  } catch (error) {
    console.error('[SkillEmbeddings] Error saving cache:', error);
  }
}

// ============================================================================
// Cosine Similarity
// ============================================================================

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

// ============================================================================
// Main Service
// ============================================================================

class SkillEmbeddingsService {
  private cache: EmbeddingsCache | null = null;
  private initialized = false;

  /**
   * Initialize the service: load cache or generate embeddings
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Try to load from cache
    this.cache = loadCache();

    if (this.cache) {
      console.log(`[SkillEmbeddings] Loaded ${this.cache.skills.length} skills from cache`);
      this.initialized = true;
      return;
    }

    // Generate fresh embeddings
    console.log('[SkillEmbeddings] Generating skill embeddings...');
    await this.regenerateEmbeddings();
    this.initialized = true;
  }

  /**
   * Regenerate all skill embeddings (called on cache miss or manual refresh)
   */
  async regenerateEmbeddings(): Promise<void> {
    const skillFiles = findSkillFiles(SKILLS_DIR);
    console.log(`[SkillEmbeddings] Found ${skillFiles.length} SKILL.md files`);

    const skills: SkillEmbedding[] = [];

    for (const filePath of skillFiles) {
      const metadata = parseSkillFile(filePath);
      if (!metadata) continue;

      try {
        // Embed the skill description for document retrieval
        const embedding = await embedText(
          `${metadata.name}: ${metadata.description}`,
          'RETRIEVAL_DOCUMENT'
        );

        skills.push({ ...metadata, embedding });
        console.log(`[SkillEmbeddings] Embedded: ${metadata.name}`);
      } catch (error) {
        console.error(`[SkillEmbeddings] Failed to embed ${metadata.name}:`, error);
      }
    }

    this.cache = {
      model: GEMINI_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      generated_at: new Date().toISOString(),
      skills,
    };

    saveCache(this.cache);
  }

  /**
   * Find the best matching skill for a user query
   */
  async findBestMatch(query: string): Promise<SkillMatch | null> {
    await this.initialize();

    if (!this.cache || this.cache.skills.length === 0) {
      console.warn('[SkillEmbeddings] No skills available');
      return null;
    }

    // Embed the user query
    const queryEmbedding = await embedText(query, 'RETRIEVAL_QUERY');

    // Find best match
    let bestMatch: SkillMatch | null = null;

    for (const skill of this.cache.skills) {
      const similarity = cosineSimilarity(queryEmbedding, skill.embedding);

      if (similarity > SIMILARITY_THRESHOLD) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = {
            skill: {
              name: skill.name,
              description: skill.description,
              path: skill.path,
            },
            similarity,
          };
        }
      }
    }

    if (bestMatch) {
      console.log(`[SkillEmbeddings] Matched "${query}" -> ${bestMatch.skill.name} (${(bestMatch.similarity * 100).toFixed(1)}%)`);
    } else {
      console.log(`[SkillEmbeddings] No match for "${query}" (below ${SIMILARITY_THRESHOLD * 100}% threshold)`);
    }

    return bestMatch;
  }

  /**
   * Get all matches above threshold, sorted by similarity
   */
  async findAllMatches(query: string, limit = 5): Promise<SkillMatch[]> {
    await this.initialize();

    if (!this.cache || this.cache.skills.length === 0) {
      return [];
    }

    const queryEmbedding = await embedText(query, 'RETRIEVAL_QUERY');

    const matches: SkillMatch[] = [];

    for (const skill of this.cache.skills) {
      const similarity = cosineSimilarity(queryEmbedding, skill.embedding);

      matches.push({
        skill: {
          name: skill.name,
          description: skill.description,
          path: skill.path,
        },
        similarity,
      });
    }

    // Sort by similarity descending and take top N
    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Force refresh embeddings (e.g., after adding new skills)
   */
  async refresh(): Promise<void> {
    this.initialized = false;
    this.cache = null;
    await this.regenerateEmbeddings();
    this.initialized = true;
  }

  /**
   * Get cache status for debugging
   */
  getStatus(): { initialized: boolean; skillCount: number; cacheAge: string | null } {
    return {
      initialized: this.initialized,
      skillCount: this.cache?.skills.length ?? 0,
      cacheAge: this.cache?.generated_at ?? null,
    };
  }
}

// Export singleton instance
export const skillEmbeddings = new SkillEmbeddingsService();

// Export types for consumers
export type { SkillMatch, SkillMetadata };
