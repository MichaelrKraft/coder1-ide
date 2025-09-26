/**
 * Evolutionary Memory Manager Service
 * 
 * Orchestrates the Evolutionary Sandbox Memory System by managing:
 * - Sandbox memory isolation and contexts
 * - Experiment outcome tracking and analysis
 * - Memory graduation pipeline (sandbox → production)
 * - Confidence scoring and pattern learning
 * 
 * This service bridges the existing contextual memory system with sandbox experiments
 * to create a learning AI that gets smarter from safe experimentation.
 */

import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import type { ClaudeConversation } from './context-database';

// Types for evolutionary sandbox memory
export interface SandboxExperiment {
  id: string;
  userId: string;
  projectPath: string;
  sandboxId: string;
  suggestionText: string;
  suggestionHash: string;
  confidenceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  experimentType: 'general' | 'file_modification' | 'dependency_change' | 'config_update' | 
                 'refactoring' | 'testing' | 'deployment' | 'security_fix';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  outcome: 'pending' | 'running' | 'success' | 'failure' | 'abandoned' | 'timeout';
  graduated: boolean;
  graduationDecision?: 'accept' | 'reject';
  graduationReason?: string;
  graduationAt?: Date;
  filesModified?: string[];
  commandsRun?: string[];
  errorMessages?: string[];
  successMetrics?: Record<string, any>;
  executionTimeMs: number;
  memoryCreated: number;
}

export interface ExperimentMemory {
  id: string;
  experimentId: string;
  conversationId?: string;
  memoryType: 'conversation' | 'command_result' | 'file_change' | 'error_encounter' | 
              'success_pattern' | 'lesson_learned';
  content: string;
  contextData?: Record<string, any>;
  relevanceScore: number;
  isolationLevel: 'sandbox' | 'experiment' | 'global';
  createdAt: Date;
  graduatedToMain: boolean;
  graduationDate?: Date;
}

export interface ConfidencePattern {
  id: string;
  patternName: string;
  patternDescription: string;
  patternRegex?: string;
  successRate: number;
  totalExperiments: number;
  successfulExperiments: number;
  failedExperiments: number;
  riskMultiplier: number;
  patternWeight: number;
  metadata?: Record<string, any>;
}

export interface MemoryGraduation {
  id: string;
  experimentId: string;
  memoryId: string;
  graduationType: 'promote' | 'reject';
  decisionReason: string;
  humanDecision: boolean;
  confidenceThreshold?: number;
  graduatedAt: Date;
  promotedToSessionId?: string;
}

export interface ExperimentCreationConfig {
  suggestionText: string;
  userId?: string;
  projectPath?: string;
  sandboxId: string;
  experimentType?: SandboxExperiment['experimentType'];
  riskLevel?: SandboxExperiment['riskLevel'];
  contextData?: Record<string, any>;
}

export interface MemoryGraduationDecision {
  experimentId: string;
  decision: 'accept' | 'reject';
  reason: string;
  selectedMemoryIds?: string[];
  targetSessionId?: string;
}

class EvolutionaryMemoryManager extends EventEmitter {
  private db: Database.Database;
  private isInitialized = false;

  constructor() {
    super();
    // Initialize database connection directly
    const dbPath = path.join(process.cwd(), 'db', 'context-memory.db');
    this.db = new Database(dbPath);
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Verify evolutionary tables exist
      const tables = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name LIKE '%experiment%' OR name LIKE '%sandbox%'
      `).all();

      if (tables.length === 0) {
        throw new Error('Evolutionary sandbox tables not found. Run evolutionary-sandbox-schema.sql first.');
      }

      this.isInitialized = true;
      logger.info('✅ Evolutionary Memory Manager initialized');
      this.emit('initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Evolutionary Memory Manager:', error);
      throw error;
    }
  }

  /**
   * Create a new sandbox experiment with confidence scoring
   */
  async createExperiment(config: ExperimentCreationConfig): Promise<SandboxExperiment> {
    if (!this.isInitialized) {
      throw new Error('Evolutionary Memory Manager not initialized');
    }

    try {
      const experimentId = uuidv4();
      const suggestionHash = crypto.createHash('md5').update(config.suggestionText).digest('hex');
      
      // Calculate confidence score based on historical patterns
      const confidenceScore = await this.calculateConfidenceScore(config.suggestionText, config.experimentType || 'general');
      
      // Determine risk level if not provided
      const riskLevel = config.riskLevel || this.assessRiskLevel(config.suggestionText);

      const experiment: SandboxExperiment = {
        id: experimentId,
        userId: config.userId || 'default-user',
        projectPath: config.projectPath || '/current-project',
        sandboxId: config.sandboxId,
        suggestionText: config.suggestionText,
        suggestionHash,
        confidenceScore,
        riskLevel,
        experimentType: config.experimentType || 'general',
        createdAt: new Date(),
        outcome: 'pending',
        graduated: false,
        executionTimeMs: 0,
        memoryCreated: 0
      };

      // Store in database
      this.db.prepare(`
        INSERT INTO sandbox_experiments (
          id, user_id, project_path, sandbox_id, suggestion_text, suggestion_hash,
          confidence_score, risk_level, experiment_type, created_at, outcome,
          graduated, execution_time_ms, memory_created
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        experiment.id, experiment.userId, experiment.projectPath, experiment.sandboxId,
        experiment.suggestionText, experiment.suggestionHash, experiment.confidenceScore,
        experiment.riskLevel, experiment.experimentType, experiment.createdAt.toISOString(),
        experiment.outcome, experiment.graduated ? 1 : 0, experiment.executionTimeMs,
        experiment.memoryCreated
      );

      logger.info(`🧪 Created sandbox experiment: ${experimentId} (confidence: ${Math.round(confidenceScore * 100)}%)`);
      this.emit('experiment:created', experiment);

      return experiment;
    } catch (error) {
      logger.error('❌ Failed to create sandbox experiment:', error);
      throw error;
    }
  }

  /**
   * Create isolated memory entry for sandbox experiment
   */
  async createExperimentMemory(
    experimentId: string,
    memoryType: ExperimentMemory['memoryType'],
    content: string,
    contextData?: Record<string, any>,
    conversationId?: string
  ): Promise<ExperimentMemory> {
    try {
      const memoryId = uuidv4();
      const relevanceScore = this.calculateMemoryRelevance(content, memoryType);

      const memory: ExperimentMemory = {
        id: memoryId,
        experimentId,
        conversationId,
        memoryType,
        content,
        contextData,
        relevanceScore,
        isolationLevel: 'sandbox',
        createdAt: new Date(),
        graduatedToMain: false
      };

      this.db.prepare(`
        INSERT INTO experiment_memories (
          id, experiment_id, conversation_id, memory_type, content, context_data,
          relevance_score, isolation_level, created_at, graduated_to_main
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        memory.id, memory.experimentId, memory.conversationId, memory.memoryType,
        memory.content, JSON.stringify(memory.contextData), memory.relevanceScore,
        memory.isolationLevel, memory.createdAt.toISOString(), memory.graduatedToMain ? 1 : 0
      );

      // Update memory count on experiment
      this.db.prepare(`
        UPDATE sandbox_experiments 
        SET memory_created = memory_created + 1 
        WHERE id = ?
      `).run(experimentId);

      logger.debug(`💾 Created experiment memory: ${memoryId} (type: ${memoryType})`);
      this.emit('memory:created', memory);

      return memory;
    } catch (error) {
      logger.error('❌ Failed to create experiment memory:', error);
      throw error;
    }
  }

  /**
   * Update experiment outcome and analyze results
   */
  async updateExperimentOutcome(
    experimentId: string,
    outcome: SandboxExperiment['outcome'],
    metadata?: {
      filesModified?: string[];
      commandsRun?: string[];
      errorMessages?: string[];
      successMetrics?: Record<string, any>;
      executionTimeMs?: number;
    }
  ): Promise<void> {
    try {
      const updateData = {
        outcome,
        completedAt: new Date().toISOString(),
        filesModified: metadata?.filesModified ? JSON.stringify(metadata.filesModified) : null,
        commandsRun: metadata?.commandsRun ? JSON.stringify(metadata.commandsRun) : null,
        errorMessages: metadata?.errorMessages ? JSON.stringify(metadata.errorMessages) : null,
        successMetrics: metadata?.successMetrics ? JSON.stringify(metadata.successMetrics) : null,
        executionTimeMs: metadata?.executionTimeMs || 0
      };

      this.db.prepare(`
        UPDATE sandbox_experiments 
        SET outcome = ?, completed_at = ?, files_modified = ?, commands_run = ?,
            error_messages = ?, success_metrics = ?, execution_time_ms = ?
        WHERE id = ?
      `).run(
        updateData.outcome, updateData.completedAt, updateData.filesModified,
        updateData.commandsRun, updateData.errorMessages, updateData.successMetrics,
        updateData.executionTimeMs, experimentId
      );

      // Update confidence patterns based on outcome
      await this.updateConfidencePatterns(experimentId, outcome === 'success');

      logger.info(`🎯 Updated experiment outcome: ${experimentId} → ${outcome}`);
      this.emit('experiment:completed', { experimentId, outcome, metadata });

    } catch (error) {
      logger.error('❌ Failed to update experiment outcome:', error);
      throw error;
    }
  }

  /**
   * Graduate successful experiment memories to production memory
   */
  async graduateMemories(decision: MemoryGraduationDecision): Promise<MemoryGraduation[]> {
    try {
      const graduations: MemoryGraduation[] = [];

      if (decision.decision === 'accept') {
        // Get experiment memories to graduate
        const memories = this.db.prepare(`
          SELECT * FROM experiment_memories 
          WHERE experiment_id = ? AND graduated_to_main = 0
          ${decision.selectedMemoryIds ? 'AND id IN (' + decision.selectedMemoryIds.map(() => '?').join(',') + ')' : ''}
        `).all(decision.experimentId, ...(decision.selectedMemoryIds || [])) as ExperimentMemory[];

        for (const memory of memories) {
          // Create corresponding entry in main contextual memory system
          if (memory.memoryType === 'conversation' && memory.conversationId) {
            // This is already in claude_conversations, just mark it as graduated
            // Real implementation would copy to main memory context
            logger.debug(`📈 Graduating conversation memory: ${memory.id}`);
          } else {
            // Create new contextual memory entry from experiment memory
            await this.promoteToContextualMemory(memory, decision.targetSessionId);
          }

          // Mark as graduated
          this.db.prepare(`
            UPDATE experiment_memories 
            SET graduated_to_main = 1, graduation_date = ?
            WHERE id = ?
          `).run(new Date().toISOString(), memory.id);

          // Record graduation
          const graduationId = uuidv4();
          const graduation: MemoryGraduation = {
            id: graduationId,
            experimentId: decision.experimentId,
            memoryId: memory.id,
            graduationType: 'promote',
            decisionReason: decision.reason,
            humanDecision: true,
            graduatedAt: new Date(),
            promotedToSessionId: decision.targetSessionId
          };

          this.db.prepare(`
            INSERT INTO memory_graduation (
              id, experiment_id, memory_id, graduation_type, decision_reason,
              human_decision, graduated_at, promoted_to_session_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            graduation.id, graduation.experimentId, graduation.memoryId,
            graduation.graduationType, graduation.decisionReason,
            graduation.humanDecision ? 1 : 0, graduation.graduatedAt.toISOString(),
            graduation.promotedToSessionId
          );

          graduations.push(graduation);
        }
      }

      // Mark experiment as graduated
      this.db.prepare(`
        UPDATE sandbox_experiments 
        SET graduated = 1, graduation_decision = ?, graduation_reason = ?, graduation_at = ?
        WHERE id = ?
      `).run(decision.decision, decision.reason, new Date().toISOString(), decision.experimentId);

      logger.info(`🎓 Graduated ${graduations.length} memories from experiment: ${decision.experimentId}`);
      this.emit('memories:graduated', { decision, graduations });

      return graduations;
    } catch (error) {
      logger.error('❌ Failed to graduate memories:', error);
      throw error;
    }
  }

  /**
   * Calculate confidence score for a suggestion based on historical patterns
   */
  private async calculateConfidenceScore(suggestionText: string, experimentType: string): Promise<number> {
    try {
      // Get all confidence patterns
      const patterns = this.db.prepare(`
        SELECT * FROM confidence_patterns 
        ORDER BY pattern_weight DESC
      `).all() as ConfidencePattern[];

      let totalScore = 0;
      let totalWeight = 0;
      let baseScore = 0.5; // Default confidence

      // Apply pattern matching
      for (const pattern of patterns) {
        if (pattern.patternRegex) {
          const regex = new RegExp(pattern.patternRegex, 'i');
          if (regex.test(suggestionText)) {
            totalScore += pattern.successRate * pattern.patternWeight;
            totalWeight += pattern.patternWeight;
            logger.debug(`🎯 Pattern match: ${pattern.patternName} (${Math.round(pattern.successRate * 100)}%)`);
          }
        }
      }

      // Calculate weighted average
      if (totalWeight > 0) {
        baseScore = totalScore / totalWeight;
      }

      // Adjust for experiment type
      const typeMultipliers: Record<string, number> = {
        'general': 1.0,
        'file_modification': 0.9,
        'dependency_change': 0.7,
        'config_update': 0.8,
        'refactoring': 0.6,
        'testing': 0.85,
        'deployment': 0.5,
        'security_fix': 0.6
      };

      const finalScore = Math.min(0.95, Math.max(0.05, baseScore * (typeMultipliers[experimentType] || 1.0)));
      
      return Math.round(finalScore * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      logger.error('❌ Failed to calculate confidence score:', error);
      return 0.5; // Default fallback
    }
  }

  /**
   * Assess risk level based on suggestion text
   */
  private assessRiskLevel(suggestionText: string): 'low' | 'medium' | 'high' {
    const highRiskPatterns = [
      /delete|remove|drop|destroy/i,
      /database.*migration/i,
      /production|deploy/i,
      /security.*change/i,
      /auth.*modify/i
    ];

    const mediumRiskPatterns = [
      /refactor/i,
      /dependency|package/i,
      /config.*change/i,
      /api.*endpoint/i
    ];

    if (highRiskPatterns.some(pattern => pattern.test(suggestionText))) {
      return 'high';
    }

    if (mediumRiskPatterns.some(pattern => pattern.test(suggestionText))) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Calculate memory relevance score
   */
  private calculateMemoryRelevance(content: string, memoryType: ExperimentMemory['memoryType']): number {
    const typeWeights = {
      'conversation': 0.8,
      'command_result': 0.7,
      'file_change': 0.6,
      'error_encounter': 0.9,
      'success_pattern': 0.85,
      'lesson_learned': 0.9
    };

    const baseScore = typeWeights[memoryType] || 0.5;
    
    // Adjust based on content length and information density
    const contentScore = Math.min(1.0, content.length / 500); // More content = higher relevance up to 500 chars
    
    return Math.min(0.95, Math.max(0.1, baseScore * contentScore));
  }

  /**
   * Update confidence patterns based on experiment outcome
   */
  private async updateConfidencePatterns(experimentId: string, success: boolean): Promise<void> {
    try {
      // Get experiment details
      const experiment = this.db.prepare(`
        SELECT * FROM sandbox_experiments WHERE id = ?
      `).get(experimentId) as SandboxExperiment;

      if (!experiment) return;

      // Update matching patterns
      const patterns = this.db.prepare(`
        SELECT * FROM confidence_patterns
      `).all() as ConfidencePattern[];

      for (const pattern of patterns) {
        if (pattern.patternRegex) {
          const regex = new RegExp(pattern.patternRegex, 'i');
          if (regex.test(experiment.suggestionText)) {
            // Update pattern statistics
            this.db.prepare(`
              UPDATE confidence_patterns 
              SET total_experiments = total_experiments + 1,
                  ${success ? 'successful_experiments = successful_experiments + 1' : 'failed_experiments = failed_experiments + 1'},
                  success_rate = CAST(successful_experiments AS REAL) / CAST(total_experiments AS REAL),
                  last_updated = ?
              WHERE id = ?
            `).run(new Date().toISOString(), pattern.id);

            logger.debug(`📊 Updated pattern: ${pattern.patternName} (${success ? 'success' : 'failure'})`);
          }
        }
      }
    } catch (error) {
      logger.error('❌ Failed to update confidence patterns:', error);
    }
  }

  /**
   * Promote experiment memory to main contextual memory system
   */
  private async promoteToContextualMemory(memory: ExperimentMemory, targetSessionId?: string): Promise<void> {
    try {
      // This would integrate with the existing contextual memory system
      // For now, we'll create a placeholder that could be expanded
      logger.info(`📈 Promoting memory to contextual system: ${memory.id} → session: ${targetSessionId || 'default'}`);
      
      // In a full implementation, this would:
      // 1. Create entry in claude_conversations or learned_insights
      // 2. Update session summaries with new insights
      // 3. Trigger reindexing of contextual search
    } catch (error) {
      logger.error('❌ Failed to promote memory to contextual system:', error);
    }
  }

  /**
   * Get experiments for a user/project with filtering
   */
  async getExperiments(
    userId: string = 'default-user',
    filters?: {
      projectPath?: string;
      outcome?: SandboxExperiment['outcome'];
      experimentType?: SandboxExperiment['experimentType'];
      graduated?: boolean;
      limit?: number;
    }
  ): Promise<SandboxExperiment[]> {
    try {
      let query = `SELECT * FROM sandbox_experiments WHERE user_id = ?`;
      const params: any[] = [userId];

      if (filters?.projectPath) {
        query += ` AND project_path = ?`;
        params.push(filters.projectPath);
      }

      if (filters?.outcome) {
        query += ` AND outcome = ?`;
        params.push(filters.outcome);
      }

      if (filters?.experimentType) {
        query += ` AND experiment_type = ?`;
        params.push(filters.experimentType);
      }

      if (filters?.graduated !== undefined) {
        query += ` AND graduated = ?`;
        params.push(filters.graduated ? 1 : 0);
      }

      query += ` ORDER BY created_at DESC`;

      if (filters?.limit) {
        query += ` LIMIT ?`;
        params.push(filters.limit);
      }

      return this.db.prepare(query).all(...params) as SandboxExperiment[];
    } catch (error) {
      logger.error('❌ Failed to get experiments:', error);
      return [];
    }
  }

  /**
   * Get experiment memories with filtering
   */
  async getExperimentMemories(
    experimentId: string,
    filters?: {
      memoryType?: ExperimentMemory['memoryType'];
      graduated?: boolean;
    }
  ): Promise<ExperimentMemory[]> {
    try {
      let query = `SELECT * FROM experiment_memories WHERE experiment_id = ?`;
      const params: any[] = [experimentId];

      if (filters?.memoryType) {
        query += ` AND memory_type = ?`;
        params.push(filters.memoryType);
      }

      if (filters?.graduated !== undefined) {
        query += ` AND graduated_to_main = ?`;
        params.push(filters.graduated ? 1 : 0);
      }

      query += ` ORDER BY created_at DESC`;

      return this.db.prepare(query).all(...params) as ExperimentMemory[];
    } catch (error) {
      logger.error('❌ Failed to get experiment memories:', error);
      return [];
    }
  }

  /**
   * Get confidence score statistics
   */
  async getConfidenceStats(): Promise<{
    averageConfidence: number;
    accuracyScore: number;
    totalExperiments: number;
    patternCount: number;
  }> {
    try {
      const stats = this.db.prepare(`
        SELECT 
          AVG(confidence_score) as avg_confidence,
          COUNT(*) as total_experiments,
          COUNT(CASE WHEN outcome = 'success' THEN 1 END) as successful_experiments
        FROM sandbox_experiments 
        WHERE outcome IN ('success', 'failure')
      `).get() as any;

      const patternCount = this.db.prepare(`
        SELECT COUNT(*) as count FROM confidence_patterns
      `).get() as any;

      const accuracyScore = stats.total_experiments > 0 
        ? stats.successful_experiments / stats.total_experiments 
        : 0;

      return {
        averageConfidence: stats.avg_confidence || 0,
        accuracyScore,
        totalExperiments: stats.total_experiments || 0,
        patternCount: patternCount.count || 0
      };
    } catch (error) {
      logger.error('❌ Failed to get confidence stats:', error);
      return {
        averageConfidence: 0,
        accuracyScore: 0,
        totalExperiments: 0,
        patternCount: 0
      };
    }
  }

  /**
   * Cleanup old experiments and memories
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = this.db.prepare(`
        DELETE FROM sandbox_experiments 
        WHERE created_at < ? AND outcome IN ('success', 'failure', 'abandoned')
      `).run(cutoffDate.toISOString());

      logger.info(`🧹 Cleaned up ${result.changes} old experiments`);
      return result.changes || 0;
    } catch (error) {
      logger.error('❌ Failed to cleanup experiments:', error);
      return 0;
    }
  }
}

// Singleton instance
let evolutionaryMemoryManager: EvolutionaryMemoryManager | null = null;

export function getEvolutionaryMemoryManager(): EvolutionaryMemoryManager {
  if (!evolutionaryMemoryManager) {
    evolutionaryMemoryManager = new EvolutionaryMemoryManager();
  }
  return evolutionaryMemoryManager;
}

export default EvolutionaryMemoryManager;