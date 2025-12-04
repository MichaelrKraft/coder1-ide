/**
 * Artifacts Service for Coder1 IDE Mission Control
 *
 * Implements an INBOX workflow for artifacts with PERSISTENT STORAGE:
 * - Agents produce artifacts → appear in inbox as "pending"
 * - User reviews and either saves or deletes
 * - Saved artifacts move to permanent storage
 * - Deleted artifacts are removed
 * - All changes persist to disk automatically
 */

import fs from 'fs';
import path from 'path';
import { Artifact, ArtifactType, ArtifactFilter, ArtifactStats, ArtifactStatus } from '@/types/mission-control';
import { logger } from '@/lib/logger';

// Storage paths
const DATA_DIR = path.join(process.cwd(), 'data', 'artifacts');
const METADATA_FILE = path.join(DATA_DIR, 'artifacts.json');
const FILES_DIR = path.join(DATA_DIR, 'files');

/**
 * Artifacts Service
 * Handles inbox workflow for IDE-generated artifacts with persistent storage
 */
export class ArtifactsService {
  private artifacts: Map<string, Artifact> = new Map();
  private artifactCounter: number = 0;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize storage directories and load existing artifacts
   */
  private initialize(): void {
    try {
      // Ensure directories exist
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        logger.info('📁 Created artifacts data directory');
      }
      if (!fs.existsSync(FILES_DIR)) {
        fs.mkdirSync(FILES_DIR, { recursive: true });
        logger.info('📁 Created artifacts files directory');
      }

      // Load existing artifacts from disk
      if (fs.existsSync(METADATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
        this.artifactCounter = data.counter || 0;

        if (data.artifacts && Array.isArray(data.artifacts)) {
          data.artifacts.forEach((artifact: Artifact) => {
            // Convert date strings back to Date objects
            artifact.createdAt = new Date(artifact.createdAt);
            this.artifacts.set(artifact.id, artifact);
          });
        }

        logger.info(`📦 Loaded ${this.artifacts.size} artifacts from storage`);
      } else {
        // No existing data - start fresh (no demo data when using persistent storage)
        logger.info('📦 Artifacts storage initialized (empty)');
      }

      this.initialized = true;
    } catch (error) {
      logger.error('❌ Failed to initialize artifacts storage:', error);
      this.initialized = true; // Continue with in-memory fallback
    }
  }

  /**
   * Save current state to disk
   */
  private saveToDisk(): void {
    try {
      const data = {
        counter: this.artifactCounter,
        artifacts: Array.from(this.artifacts.values()),
        lastUpdated: new Date().toISOString()
      };

      fs.writeFileSync(METADATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      logger.error('❌ Failed to save artifacts to disk:', error);
    }
  }

  /**
   * Save artifact content to files directory
   */
  public saveArtifactContent(artifactId: string, content: string | Buffer): string {
    const filePath = path.join(FILES_DIR, artifactId);

    try {
      if (typeof content === 'string') {
        fs.writeFileSync(filePath, content, 'utf-8');
      } else {
        fs.writeFileSync(filePath, content);
      }
      return filePath;
    } catch (error) {
      logger.error(`❌ Failed to save artifact content for ${artifactId}:`, error);
      throw error;
    }
  }

  /**
   * Get artifact content from files directory
   */
  public getArtifactContent(artifactId: string): string | null {
    const filePath = path.join(FILES_DIR, artifactId);

    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
      return null;
    } catch (error) {
      logger.error(`❌ Failed to read artifact content for ${artifactId}:`, error);
      return null;
    }
  }

  /**
   * Delete artifact content from files directory
   */
  private deleteArtifactContent(artifactId: string): void {
    const filePath = path.join(FILES_DIR, artifactId);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      logger.error(`❌ Failed to delete artifact content for ${artifactId}:`, error);
    }
  }

  /**
   * Get all pending artifacts (inbox items)
   */
  public getInbox(): Artifact[] {
    return Array.from(this.artifacts.values())
      .filter(a => a.status === 'pending')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get all saved artifacts
   */
  public getSaved(): Artifact[] {
    return Array.from(this.artifacts.values())
      .filter(a => a.status === 'saved')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Save an artifact (move from inbox to saved)
   */
  public saveArtifact(id: string, saveTo?: string): Artifact | null {
    const artifact = this.artifacts.get(id);
    if (!artifact || artifact.status !== 'pending') {
      return null;
    }

    artifact.status = 'saved';
    if (saveTo) {
      artifact.metadata = {
        ...artifact.metadata,
        savedTo: saveTo
      };
    }

    this.artifacts.set(id, artifact);
    this.saveToDisk(); // Persist change
    logger.info(`💾 Artifact saved: ${artifact.name} (${id})`);
    return artifact;
  }

  /**
   * Delete an artifact (remove from inbox permanently)
   */
  public deleteArtifact(id: string): boolean {
    const artifact = this.artifacts.get(id);
    if (!artifact) {
      return false;
    }

    // Delete content file if exists
    this.deleteArtifactContent(id);

    // Remove from map
    this.artifacts.delete(id);
    this.saveToDisk(); // Persist change
    logger.info(`🗑️ Artifact deleted: ${artifact.name} (${id})`);
    return true;
  }

  /**
   * Save all pending artifacts at once
   */
  public saveAll(): number {
    let count = 0;
    this.artifacts.forEach((artifact, id) => {
      if (artifact.status === 'pending') {
        artifact.status = 'saved';
        this.artifacts.set(id, artifact);
        count++;
      }
    });

    if (count > 0) {
      this.saveToDisk(); // Persist changes
      logger.info(`💾 Saved ${count} artifacts in bulk`);
    }
    return count;
  }

  /**
   * Delete all pending artifacts at once
   */
  public deleteAllPending(): number {
    let count = 0;
    const toDelete: string[] = [];

    this.artifacts.forEach((artifact, id) => {
      if (artifact.status === 'pending') {
        toDelete.push(id);
        count++;
      }
    });

    toDelete.forEach(id => {
      this.deleteArtifactContent(id);
      this.artifacts.delete(id);
    });

    if (count > 0) {
      this.saveToDisk(); // Persist changes
      logger.info(`🗑️ Deleted ${count} pending artifacts in bulk`);
    }
    return count;
  }

  /**
   * Add a new artifact to the inbox (called by agents/services)
   * @param artifact - Artifact data without id, createdAt, status
   * @param content - Optional content to save to disk
   */
  public addToInbox(
    artifact: Omit<Artifact, 'id' | 'createdAt' | 'status'>,
    content?: string | Buffer
  ): Artifact {
    this.artifactCounter++;
    const newArtifact: Artifact = {
      ...artifact,
      id: `art-${String(this.artifactCounter).padStart(6, '0')}`,
      createdAt: new Date(),
      status: 'pending'
    };

    // Save content to disk if provided
    if (content) {
      try {
        this.saveArtifactContent(newArtifact.id, content);
        newArtifact.metadata = {
          ...newArtifact.metadata,
          hasContent: true
        };
      } catch (error) {
        logger.error(`❌ Failed to save content for artifact ${newArtifact.id}`);
      }
    }

    this.artifacts.set(newArtifact.id, newArtifact);
    this.saveToDisk(); // Persist change
    logger.info(`📥 Artifact added to inbox: ${newArtifact.name} (${newArtifact.id}) from ${artifact.sourceAgent || 'unknown'}`);
    return newArtifact;
  }

  /**
   * List all artifacts with optional filtering (legacy support)
   */
  public listArtifacts(filter?: ArtifactFilter): Artifact[] {
    let results = Array.from(this.artifacts.values());

    if (filter) {
      if (filter.type) {
        results = results.filter(a => a.type === filter.type);
      }
      if (filter.startDate) {
        results = results.filter(a => a.createdAt >= filter.startDate!);
      }
      if (filter.endDate) {
        results = results.filter(a => a.createdAt <= filter.endDate!);
      }
      if (filter.minSize !== undefined) {
        results = results.filter(a => a.size >= filter.minSize!);
      }
      if (filter.maxSize !== undefined) {
        results = results.filter(a => a.size <= filter.maxSize!);
      }
      if (filter.testId) {
        results = results.filter(a => a.metadata?.testId === filter.testId);
      }
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get a single artifact by ID
   */
  public getArtifact(id: string): Artifact | null {
    return this.artifacts.get(id) || null;
  }

  /**
   * Get inbox statistics
   */
  public getInboxStats(): { pending: number; saved: number; totalSize: number } {
    let pending = 0;
    let saved = 0;
    let totalSize = 0;

    this.artifacts.forEach(artifact => {
      if (artifact.status === 'pending') {
        pending++;
        totalSize += artifact.size;
      } else if (artifact.status === 'saved') {
        saved++;
      }
    });

    return { pending, saved, totalSize };
  }

  /**
   * Get artifact statistics (legacy support)
   */
  public getArtifactStats(): ArtifactStats {
    const allArtifacts = Array.from(this.artifacts.values());

    const byType: Record<ArtifactType, number> = {
      video: 0,
      trace: 0,
      screenshot: 0,
      document: 0,
      code: 0
    };

    let totalSize = 0;
    let mostRecent: Date | undefined;

    allArtifacts.forEach(artifact => {
      byType[artifact.type]++;
      totalSize += artifact.size;

      if (!mostRecent || artifact.createdAt > mostRecent) {
        mostRecent = artifact.createdAt;
      }
    });

    return {
      total: allArtifacts.length,
      byType,
      totalSize,
      averageSize: allArtifacts.length > 0 ? Math.round(totalSize / allArtifacts.length) : 0,
      lastCreated: mostRecent
    };
  }

  /**
   * Clear all artifacts (for testing)
   */
  public clearAllArtifacts(): void {
    this.artifacts.clear();
    this.artifactCounter = 0;
  }

  /**
   * Get artifact count
   */
  public getArtifactCount(): number {
    return this.artifacts.size;
  }
}

// Export singleton instance
export const artifactsService = new ArtifactsService();
