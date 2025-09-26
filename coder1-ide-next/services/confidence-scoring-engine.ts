/**
 * Confidence Scoring Engine
 * 
 * Advanced confidence scoring system that predicts the success probability
 * of AI suggestions based on historical experiment patterns, code context,
 * and risk assessment algorithms.
 * 
 * This engine continuously learns from sandbox experiment outcomes to improve
 * its predictions and help users make informed decisions about AI suggestions.
 */

import { logger } from '@/lib/logger';
import { getEvolutionaryMemoryManager, type SandboxExperiment } from './evolutionary-memory-manager';
import Database from 'better-sqlite3';
import path from 'path';

export interface ConfidenceAnalysis {
  confidenceScore: number; // 0.0 to 1.0
  confidenceLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string[];
  historicalMatch: boolean;
  similarExperiments: number;
  patternMatches: string[];
  recommendations: string[];
  adjustmentFactors: {
    patternMatch: number;
    complexity: number;
    risk: number;
    historical: number;
    context: number;
  };
}

export interface ConfidenceContext {
  suggestionText: string;
  experimentType?: SandboxExperiment['experimentType'];
  currentFiles?: string[];
  recentCommands?: string[];
  errorContext?: string;
  projectContext?: Record<string, any>;
  userExperience?: 'beginner' | 'intermediate' | 'advanced';
}

export interface PatternMatchResult {
  patternName: string;
  patternDescription: string;
  successRate: number;
  confidence: number;
  weight: number;
  matchStrength: number;
}

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number; // 0.0 to 1.0
  riskFactors: string[];
  mitigationSuggestions: string[];
}

export interface ComplexityAnalysis {
  complexityScore: number; // 0.0 to 1.0
  complexityFactors: string[];
  estimatedDifficulty: 'simple' | 'moderate' | 'complex' | 'very_complex';
}

class ConfidenceScoringEngine {
  private memoryManager = getEvolutionaryMemoryManager();
  private db: Database.Database;

  constructor() {
    // Initialize database connection directly
    const dbPath = path.join(process.cwd(), 'db', 'context-memory.db');
    this.db = new Database(dbPath);
  }

  // Pattern matching algorithms
  private readonly HIGH_RISK_PATTERNS = [
    { pattern: /delete|remove|drop|destroy|rm\s+-rf/i, weight: 0.9, reason: 'Destructive operation' },
    { pattern: /database.*migration|schema.*change|alter\s+table/i, weight: 0.8, reason: 'Database schema change' },
    { pattern: /production|deploy|live|release/i, weight: 0.7, reason: 'Production environment' },
    { pattern: /security.*change|auth.*modify|permission.*update/i, weight: 0.8, reason: 'Security modification' },
    { pattern: /sudo|root|admin|elevated/i, weight: 0.6, reason: 'Elevated privileges' },
    { pattern: /config.*server|system.*config/i, weight: 0.6, reason: 'System configuration' }
  ];

  private readonly MEDIUM_RISK_PATTERNS = [
    { pattern: /refactor|restructure|reorganize/i, weight: 0.6, reason: 'Code refactoring' },
    { pattern: /dependency|package.*install|npm.*add/i, weight: 0.5, reason: 'Dependency change' },
    { pattern: /config.*change|settings.*update/i, weight: 0.4, reason: 'Configuration change' },
    { pattern: /api.*endpoint|route.*add/i, weight: 0.4, reason: 'API modification' },
    { pattern: /build.*config|webpack|babel/i, weight: 0.5, reason: 'Build configuration' }
  ];

  private readonly LOW_RISK_PATTERNS = [
    { pattern: /comment|documentation|readme/i, weight: 0.1, reason: 'Documentation' },
    { pattern: /test|spec|jest|cypress/i, weight: 0.2, reason: 'Testing' },
    { pattern: /style|css|styling|appearance/i, weight: 0.2, reason: 'Styling' },
    { pattern: /log|debug|console/i, weight: 0.2, reason: 'Logging/debugging' },
    { pattern: /ui.*component|interface.*element/i, weight: 0.3, reason: 'UI component' }
  ];

  private readonly COMPLEXITY_INDICATORS = [
    { pattern: /multiple.*files|several.*files|\d+.*files/i, weight: 0.3, reason: 'Multiple file changes' },
    { pattern: /complex|complicated|advanced|sophisticated/i, weight: 0.4, reason: 'Self-described complexity' },
    { pattern: /integration|connect.*services|microservice/i, weight: 0.5, reason: 'Service integration' },
    { pattern: /algorithm|optimization|performance/i, weight: 0.4, reason: 'Algorithmic changes' },
    { pattern: /async|promise|callback|concurrent/i, weight: 0.3, reason: 'Asynchronous operations' },
    { pattern: /state.*management|redux|context/i, weight: 0.3, reason: 'State management' }
  ];

  /**
   * Analyze confidence for a given suggestion and context
   */
  async analyzeConfidence(context: ConfidenceContext): Promise<ConfidenceAnalysis> {
    try {
      logger.debug('🎯 Starting confidence analysis for suggestion:', context.suggestionText.substring(0, 100) + '...');

      // Step 1: Pattern matching analysis
      const patternMatches = await this.analyzePatterns(context.suggestionText);
      
      // Step 2: Risk assessment
      const riskAssessment = this.assessRisk(context.suggestionText);
      
      // Step 3: Complexity analysis
      const complexityAnalysis = this.analyzeComplexity(context.suggestionText);
      
      // Step 4: Historical similarity matching
      const historicalAnalysis = await this.analyzeHistoricalSimilarity(context);
      
      // Step 5: Context-aware adjustments
      const contextAdjustments = this.analyzeContext(context);

      // Step 6: Calculate final confidence score
      const confidenceScore = this.calculateFinalConfidence({
        patternMatches,
        riskAssessment,
        complexityAnalysis,
        historicalAnalysis,
        contextAdjustments
      });

      // Step 7: Generate recommendations
      const recommendations = this.generateRecommendations(
        confidenceScore,
        riskAssessment,
        complexityAnalysis,
        patternMatches
      );

      const analysis: ConfidenceAnalysis = {
        confidenceScore: Math.round(confidenceScore * 100) / 100,
        confidenceLevel: this.getConfidenceLevel(confidenceScore),
        riskLevel: riskAssessment.riskLevel,
        reasoning: this.generateReasoning({
          patternMatches,
          riskAssessment,
          complexityAnalysis,
          historicalAnalysis
        }),
        historicalMatch: historicalAnalysis.similarCount > 0,
        similarExperiments: historicalAnalysis.similarCount,
        patternMatches: patternMatches.map(p => p.patternName),
        recommendations,
        adjustmentFactors: {
          patternMatch: this.calculatePatternAdjustment(patternMatches),
          complexity: complexityAnalysis.complexityScore,
          risk: riskAssessment.riskScore,
          historical: historicalAnalysis.confidence,
          context: contextAdjustments.adjustment
        }
      };

      logger.info(`✅ Confidence analysis complete: ${Math.round(confidenceScore * 100)}% (${analysis.confidenceLevel})`);
      return analysis;

    } catch (error) {
      logger.error('❌ Failed to analyze confidence:', error);
      
      // Return safe fallback
      return {
        confidenceScore: 0.5,
        confidenceLevel: 'medium',
        riskLevel: 'medium',
        reasoning: ['Unable to analyze - using default confidence'],
        historicalMatch: false,
        similarExperiments: 0,
        patternMatches: [],
        recommendations: ['Proceed with caution - analysis unavailable'],
        adjustmentFactors: {
          patternMatch: 0,
          complexity: 0,
          risk: 0,
          historical: 0,
          context: 0
        }
      };
    }
  }

  /**
   * Analyze suggestion against known patterns
   */
  private async analyzePatterns(suggestionText: string): Promise<PatternMatchResult[]> {
    try {
      const matches: PatternMatchResult[] = [];

      // Get stored patterns from database
      const storedPatterns = this.db.prepare(`
        SELECT * FROM confidence_patterns 
        WHERE pattern_regex IS NOT NULL
        ORDER BY success_rate DESC
      `).all() as any[];

      // Check stored patterns
      for (const pattern of storedPatterns) {
        try {
          const regex = new RegExp(pattern.pattern_regex, 'i');
          if (regex.test(suggestionText)) {
            matches.push({
              patternName: pattern.pattern_name,
              patternDescription: pattern.pattern_description,
              successRate: pattern.success_rate,
              confidence: pattern.success_rate * pattern.pattern_weight,
              weight: pattern.pattern_weight,
              matchStrength: this.calculateMatchStrength(suggestionText, pattern.pattern_regex)
            });
          }
        } catch (regexError) {
          logger.warn(`Invalid regex in pattern ${pattern.pattern_name}:`, regexError);
        }
      }

      return matches;
    } catch (error) {
      logger.error('❌ Failed to analyze patterns:', error);
      return [];
    }
  }

  /**
   * Assess risk level of the suggestion
   */
  private assessRisk(suggestionText: string): RiskAssessment {
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Check high-risk patterns
    for (const riskPattern of this.HIGH_RISK_PATTERNS) {
      if (riskPattern.pattern.test(suggestionText)) {
        riskFactors.push(riskPattern.reason);
        riskScore = Math.max(riskScore, riskPattern.weight);
      }
    }

    // Check medium-risk patterns
    if (riskScore < 0.6) {
      for (const riskPattern of this.MEDIUM_RISK_PATTERNS) {
        if (riskPattern.pattern.test(suggestionText)) {
          riskFactors.push(riskPattern.reason);
          riskScore = Math.max(riskScore, riskPattern.weight);
        }
      }
    }

    // Check low-risk patterns (these reduce risk)
    for (const riskPattern of this.LOW_RISK_PATTERNS) {
      if (riskPattern.pattern.test(suggestionText)) {
        riskFactors.push(`Low risk: ${riskPattern.reason}`);
        riskScore = Math.max(0, riskScore - riskPattern.weight);
      }
    }

    const riskLevel: RiskAssessment['riskLevel'] = 
      riskScore > 0.6 ? 'high' : 
      riskScore > 0.3 ? 'medium' : 'low';

    return {
      riskLevel,
      riskScore,
      riskFactors,
      mitigationSuggestions: this.generateRiskMitigations(riskLevel, riskFactors)
    };
  }

  /**
   * Analyze complexity of the suggestion
   */
  private analyzeComplexity(suggestionText: string): ComplexityAnalysis {
    const complexityFactors: string[] = [];
    let complexityScore = 0.2; // Base complexity

    for (const indicator of this.COMPLEXITY_INDICATORS) {
      if (indicator.pattern.test(suggestionText)) {
        complexityFactors.push(indicator.reason);
        complexityScore += indicator.weight;
      }
    }

    // Text length factor
    const lengthFactor = Math.min(0.3, suggestionText.length / 1000);
    complexityScore += lengthFactor;

    // Word complexity factor
    const complexWords = (suggestionText.match(/\w{8,}/g) || []).length;
    complexityScore += Math.min(0.2, complexWords * 0.05);

    complexityScore = Math.min(1.0, complexityScore);

    const estimatedDifficulty: ComplexityAnalysis['estimatedDifficulty'] = 
      complexityScore > 0.8 ? 'very_complex' :
      complexityScore > 0.6 ? 'complex' :
      complexityScore > 0.4 ? 'moderate' : 'simple';

    return {
      complexityScore,
      complexityFactors,
      estimatedDifficulty
    };
  }

  /**
   * Analyze historical similarity to past experiments
   */
  private async analyzeHistoricalSimilarity(context: ConfidenceContext): Promise<{
    similarCount: number;
    confidence: number;
    successRate: number;
  }> {
    try {
      // Find similar experiments based on text similarity and context
      const experiments = await this.memoryManager.getExperiments('default-user', {
        outcome: 'success',
        limit: 100
      });

      let similarCount = 0;
      let successfulSimilar = 0;
      
      for (const experiment of experiments) {
        const similarity = this.calculateTextSimilarity(
          context.suggestionText,
          experiment.suggestionText
        );
        
        if (similarity > 0.3) { // 30% similarity threshold
          similarCount++;
          if (experiment.outcome === 'success') {
            successfulSimilar++;
          }
        }
      }

      const successRate = similarCount > 0 ? successfulSimilar / similarCount : 0.5;
      const confidence = similarCount > 0 ? 
        Math.min(0.3, similarCount * 0.05) : 0; // Up to 30% confidence boost from history

      return {
        similarCount,
        confidence,
        successRate
      };
    } catch (error) {
      logger.error('❌ Failed to analyze historical similarity:', error);
      return { similarCount: 0, confidence: 0, successRate: 0.5 };
    }
  }

  /**
   * Analyze context for additional confidence adjustments
   */
  private analyzeContext(context: ConfidenceContext): { adjustment: number; reasons: string[] } {
    const reasons: string[] = [];
    let adjustment = 0;

    // File context analysis
    if (context.currentFiles && context.currentFiles.length > 0) {
      const fileTypes = context.currentFiles.map(f => f.split('.').pop()).filter(Boolean);
      const uniqueTypes = new Set(fileTypes);
      
      if (uniqueTypes.size === 1) {
        adjustment += 0.1;
        reasons.push('Working with consistent file types');
      } else if (uniqueTypes.size > 5) {
        adjustment -= 0.1;
        reasons.push('Working with many different file types');
      }
    }

    // Recent commands context
    if (context.recentCommands && context.recentCommands.length > 0) {
      const hasTestCommands = context.recentCommands.some(cmd => /test|jest|cypress/.test(cmd));
      if (hasTestCommands) {
        adjustment += 0.1;
        reasons.push('Recent testing activity detected');
      }

      const hasGitCommands = context.recentCommands.some(cmd => /git\s+(commit|push|pull)/.test(cmd));
      if (hasGitCommands) {
        adjustment += 0.05;
        reasons.push('Recent version control activity');
      }
    }

    // Error context
    if (context.errorContext) {
      adjustment -= 0.1;
      reasons.push('Error context present - higher uncertainty');
    }

    // User experience level
    if (context.userExperience === 'beginner') {
      adjustment -= 0.1;
      reasons.push('Beginner user - recommend extra caution');
    } else if (context.userExperience === 'advanced') {
      adjustment += 0.05;
      reasons.push('Advanced user - slightly higher confidence');
    }

    return { adjustment: Math.max(-0.3, Math.min(0.3, adjustment)), reasons };
  }

  /**
   * Calculate final confidence score from all factors
   */
  private calculateFinalConfidence(factors: {
    patternMatches: PatternMatchResult[];
    riskAssessment: RiskAssessment;
    complexityAnalysis: ComplexityAnalysis;
    historicalAnalysis: { confidence: number; successRate: number };
    contextAdjustments: { adjustment: number };
  }): number {
    // Base confidence
    let confidence = 0.5;

    // Pattern matching influence (up to ±30%)
    if (factors.patternMatches.length > 0) {
      const patternConfidence = factors.patternMatches.reduce((acc, match) => 
        acc + (match.confidence * match.matchStrength), 0) / factors.patternMatches.length;
      confidence += (patternConfidence - 0.5) * 0.6;
    }

    // Risk penalty (up to -40%)
    confidence -= factors.riskAssessment.riskScore * 0.4;

    // Complexity penalty (up to -30%)
    confidence -= (factors.complexityAnalysis.complexityScore - 0.2) * 0.3;

    // Historical boost (up to +30%)
    confidence += factors.historicalAnalysis.confidence;
    if (factors.historicalAnalysis.successRate > 0.5) {
      confidence += (factors.historicalAnalysis.successRate - 0.5) * 0.2;
    }

    // Context adjustments (up to ±30%)
    confidence += factors.contextAdjustments.adjustment;

    // Ensure bounds
    return Math.max(0.05, Math.min(0.95, confidence));
  }

  /**
   * Helper methods
   */
  private calculateMatchStrength(text: string, regex: string): number {
    try {
      const regexObj = new RegExp(regex, 'gi');
      const matches = text.match(regexObj) || [];
      return Math.min(1.0, matches.length * 0.2);
    } catch {
      return 0.5;
    }
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple word-based similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculatePatternAdjustment(patterns: PatternMatchResult[]): number {
    if (patterns.length === 0) return 0;
    return patterns.reduce((acc, p) => acc + p.confidence, 0) / patterns.length - 0.5;
  }

  private getConfidenceLevel(score: number): ConfidenceAnalysis['confidenceLevel'] {
    if (score >= 0.8) return 'very_high';
    if (score >= 0.65) return 'high';
    if (score >= 0.35) return 'medium';
    if (score >= 0.2) return 'low';
    return 'very_low';
  }

  private generateRiskMitigations(riskLevel: string, factors: string[]): string[] {
    const mitigations: string[] = [];

    if (riskLevel === 'high') {
      mitigations.push('Create a backup before proceeding');
      mitigations.push('Test in a development environment first');
      mitigations.push('Have a rollback plan ready');
    }

    if (riskLevel === 'medium') {
      mitigations.push('Review changes carefully before applying');
      mitigations.push('Consider running tests after changes');
    }

    if (factors.some(f => f.includes('Database'))) {
      mitigations.push('Backup database before schema changes');
    }

    if (factors.some(f => f.includes('Production'))) {
      mitigations.push('Use blue-green deployment strategy');
    }

    return mitigations;
  }

  private generateRecommendations(
    confidenceScore: number,
    riskAssessment: RiskAssessment,
    complexityAnalysis: ComplexityAnalysis,
    patternMatches: PatternMatchResult[]
  ): string[] {
    const recommendations: string[] = [];

    if (confidenceScore >= 0.8) {
      recommendations.push('High confidence - safe to proceed');
    } else if (confidenceScore >= 0.6) {
      recommendations.push('Good confidence - recommended with review');
    } else if (confidenceScore >= 0.4) {
      recommendations.push('Medium confidence - proceed with caution');
    } else {
      recommendations.push('Low confidence - consider manual implementation');
    }

    if (riskAssessment.riskLevel === 'high') {
      recommendations.push('High risk detected - strongly recommend sandbox testing');
    }

    if (complexityAnalysis.estimatedDifficulty === 'very_complex') {
      recommendations.push('Complex operation - break into smaller steps');
    }

    if (patternMatches.length === 0) {
      recommendations.push('No historical patterns - proceed carefully');
    }

    return recommendations;
  }

  private generateReasoning(factors: {
    patternMatches: PatternMatchResult[];
    riskAssessment: RiskAssessment;
    complexityAnalysis: ComplexityAnalysis;
    historicalAnalysis: { similarCount: number; successRate: number };
  }): string[] {
    const reasoning: string[] = [];

    if (factors.patternMatches.length > 0) {
      reasoning.push(`Matched ${factors.patternMatches.length} known patterns`);
      const avgSuccess = factors.patternMatches.reduce((acc, p) => acc + p.successRate, 0) / factors.patternMatches.length;
      reasoning.push(`Average pattern success rate: ${Math.round(avgSuccess * 100)}%`);
    }

    reasoning.push(`Risk assessment: ${factors.riskAssessment.riskLevel}`);
    reasoning.push(`Complexity: ${factors.complexityAnalysis.estimatedDifficulty}`);

    if (factors.historicalAnalysis.similarCount > 0) {
      reasoning.push(`Found ${factors.historicalAnalysis.similarCount} similar past experiments`);
      reasoning.push(`Historical success rate: ${Math.round(factors.historicalAnalysis.successRate * 100)}%`);
    } else {
      reasoning.push('No similar historical experiments found');
    }

    return reasoning;
  }

  /**
   * Update confidence patterns based on new experiment outcome
   */
  async updateFromExperiment(experiment: SandboxExperiment): Promise<void> {
    try {
      // This is called by the evolutionary memory manager after experiment completion
      // to update pattern success rates and learn new patterns
      
      logger.debug(`📊 Updating confidence patterns from experiment: ${experiment.id} (${experiment.outcome})`);
      
      // Pattern learning logic would go here
      // For now, the evolutionary memory manager handles this
      
    } catch (error) {
      logger.error('❌ Failed to update from experiment:', error);
    }
  }
}

// Singleton instance
let confidenceScoringEngine: ConfidenceScoringEngine | null = null;

export function getConfidenceScoringEngine(): ConfidenceScoringEngine {
  if (!confidenceScoringEngine) {
    confidenceScoringEngine = new ConfidenceScoringEngine();
  }
  return confidenceScoringEngine;
}

export default ConfidenceScoringEngine;