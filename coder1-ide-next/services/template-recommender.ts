/**
 * Template Recommendation Service
 * 
 * Provides intelligent template recommendations based on user requirements.
 * Uses multi-factor compatibility scoring to match templates to user needs.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {  Template,
  TemplateRecommendation,
  TemplateRecommendationRequest,
  TemplateCatalog,
  TechStack
} from '../types/template';
import { DetailedRequirements } from './requirements-gatherer';
import { logger } from '@/lib/logger';

/**
 * Template Recommender Class
 */
export class TemplateRecommender {
  private templates: Template[] = [];
  private catalogVersion: string = '1.0.0';

  constructor() {
    this.loadTemplates();
  }

  /**
   * Load templates from JSON catalog
   */
  private loadTemplates(): void {
    try {
      const catalogPath = join(process.cwd(), 'data', 'templates.json');
      const catalogData = readFileSync(catalogPath, 'utf-8');
      const catalog: TemplateCatalog = JSON.parse(catalogData);
      
      this.templates = catalog.templates;
      this.catalogVersion = catalog.version;
      
      logger.info(`📦 Loaded ${this.templates.length} templates (v${this.catalogVersion})`);
    } catch (error) {
      logger.error('❌ Failed to load templates catalog:', error);
      this.templates = [];
    }
  }

  /**
   * Get recommendations based on user requirements
   */
  async getRecommendations(
    requirements: DetailedRequirements,
    limit: number = 5,
    minScore: number = 50
  ): Promise<TemplateRecommendation[]> {
    const startTime = Date.now();
    
    logger.info(`🎯 Generating recommendations for: "${requirements.initialRequest}"`);
    logger.info(`📊 Filters: limit=${limit}, minScore=${minScore}`);

    // Score all templates
    const scoredTemplates = this.templates.map(template => {
      const { score, reasons, missing } = this.calculateCompatibility(
        requirements,
        template
      );
      
      return {
        template,
        compatibilityScore: score,
        matchReasons: reasons,
        missingFeatures: missing
      };
    });

    // Filter and sort
    const recommendations = scoredTemplates
      .filter(rec => rec.compatibilityScore >= minScore)
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, limit);

    const processingTime = Date.now() - startTime;
    
    logger.info(`✨ Found ${recommendations.length} recommendations in ${processingTime}ms`);
    if (recommendations.length > 0) {
      logger.info(`🏆 Top match: ${recommendations[0].template.name} (${recommendations[0].compatibilityScore}%)`);
    }

    return recommendations;
  }

  /**
   * Calculate compatibility score between requirements and template
   * 
   * Scoring breakdown:
   * - Tech stack match: 40% (frontend 20%, backend 15%, database 10%, auth 5%)
   * - Feature overlap: 30%
   * - Project type match: 20%
   * - Keyword match: 10%
   * 
   * Total: 100%
   */
  private calculateCompatibility(
    requirements: DetailedRequirements,
    template: Template
  ): { score: number; reasons: string[]; missing: string[] } {
    let score = 0;
    const reasons: string[] = [];
    const missing: string[] = [];

    // 1. Tech Stack Match (40% weight)
    const techStackScore = this.scoreTechStack(
      requirements.techStack,
      template.techStack,
      reasons
    );
    score += techStackScore;

    // 2. Feature Overlap (30% weight)
    const featureScore = this.scoreFeatures(
      requirements.features,
      template.features,
      reasons,
      missing
    );
    score += featureScore;

    // 3. Project Type Match (20% weight)
    const projectTypeScore = this.scoreProjectType(
      requirements.projectType,
      template.compatibility.projectTypes,
      reasons
    );
    score += projectTypeScore;

    // 4. Keyword Match (10% weight)
    const keywordScore = this.scoreKeywords(
      requirements.initialRequest,
      template.compatibility.keywords,
      reasons
    );
    score += keywordScore;

    // Bonus: Difficulty level match (up to +5%)
    const difficultyBonus = this.scoreDifficulty(
      requirements.scope,
      template.difficultyLevel,
      reasons
    );
    score += difficultyBonus;

    return {
      score: Math.min(Math.round(score), 100),
      reasons,
      missing
    };
  }

  /**
   * Score tech stack compatibility (max 40 points)
   */
  private scoreTechStack(
    reqStack: DetailedRequirements['techStack'],
    templateStack: TechStack,
    reasons: string[]
  ): number {
    let score = 0;

    // Frontend match (20 points)
    if (reqStack.frontend && templateStack.frontend) {
      if (this.techMatches(reqStack.frontend, templateStack.frontend)) {
        score += 20;
        reasons.push(`✅ Uses ${templateStack.frontend} (your preference)`);
      } else {
        reasons.push(`⚠️ Uses ${templateStack.frontend} (you wanted ${reqStack.frontend})`);
      }
    } else if (templateStack.frontend) {
      score += 10; // Partial credit for having a frontend
    }

    // Backend match (10 points)
    if (reqStack.backend && templateStack.backend) {
      if (this.techMatches(reqStack.backend, templateStack.backend)) {
        score += 10;
        reasons.push(`✅ Uses ${templateStack.backend} backend`);
      }
    } else if (templateStack.backend) {
      score += 5;
    }

    // Database match (8 points)
    if (reqStack.database && templateStack.database) {
      if (this.techMatches(reqStack.database, templateStack.database)) {
        score += 8;
        reasons.push(`✅ Uses ${templateStack.database} database`);
      }
    } else if (templateStack.database) {
      score += 4;
    }

    // Auth system (2 points bonus)
    if (templateStack.auth) {
      score += 2;
      reasons.push(`✅ Includes ${templateStack.auth}`);
    }

    return score;
  }

  /**
   * Score feature overlap (max 30 points)
   */
  private scoreFeatures(
    reqFeatures: string[],
    templateFeatures: string[],
    reasons: string[],
    missing: string[]
  ): number {
    if (reqFeatures.length === 0) return 15; // Neutral score if no features specified

    const matches = reqFeatures.filter(reqFeature =>
      templateFeatures.some(templateFeature =>
        this.featureMatches(reqFeature, templateFeature)
      )
    );

    const matchPercentage = matches.length / reqFeatures.length;
    const score = matchPercentage * 30;

    if (matches.length > 0) {
      reasons.push(`✅ Includes ${matches.length}/${reqFeatures.length} requested features`);
    }

    // Track missing features
    const missingFeatures = reqFeatures.filter(reqFeature =>
      !templateFeatures.some(templateFeature =>
        this.featureMatches(reqFeature, templateFeature)
      )
    );
    
    if (missingFeatures.length > 0 && missingFeatures.length <= 3) {
      missing.push(...missingFeatures);
    }

    return score;
  }

  /**
   * Score project type match (max 20 points)
   */
  private scoreProjectType(
    reqType: string,
    compatibleTypes: string[],
    reasons: string[]
  ): number {
    if (compatibleTypes.includes(reqType)) {
      reasons.push(`✅ Perfect for ${reqType} projects`);
      return 20;
    }

    // Partial match for related types
    const relatedTypes: { [key: string]: string[] } = {
      'web-application': ['full-stack', 'dashboard'],
      'api': ['full-stack'],
      'full-stack': ['web-application', 'api', 'dashboard']
    };

    if (relatedTypes[reqType]?.some(rt => compatibleTypes.includes(rt))) {
      reasons.push(`✅ Works for ${reqType} (categorized as ${compatibleTypes[0]})`);
      return 15;
    }

    return 5; // Minimal score for any template
  }

  /**
   * Score keyword relevance (max 10 points)
   */
  private scoreKeywords(
    request: string,
    keywords: string[],
    reasons: string[]
  ): number {
    const requestLower = request.toLowerCase();
    const matches = keywords.filter(keyword =>
      requestLower.includes(keyword.toLowerCase())
    );

    if (matches.length === 0) return 0;

    const score = Math.min(matches.length * 2.5, 10);
    
    if (matches.length > 0) {
      reasons.push(`✅ Relevant keywords: ${matches.slice(0, 3).join(', ')}`);
    }

    return score;
  }

  /**
   * Bonus points for difficulty level match (max 5 points)
   */
  private scoreDifficulty(
    scope: 'mvp' | 'full-featured' | 'prototype',
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    reasons: string[]
  ): number {
    const scopeDifficultyMap: { [key: string]: string[] } = {
      'mvp': ['beginner', 'intermediate'],
      'prototype': ['beginner'],
      'full-featured': ['intermediate', 'advanced']
    };

    if (scopeDifficultyMap[scope]?.includes(difficulty)) {
      reasons.push(`✅ ${difficulty} difficulty matches ${scope} scope`);
      return 5;
    }

    return 0;
  }

  /**
   * Check if two tech names match (case-insensitive, handles variations)
   */
  private techMatches(tech1: string, tech2: string): boolean {
    const normalize = (tech: string) => tech.toLowerCase().replace(/[.\s-]/g, '');
    return normalize(tech1) === normalize(tech2);
  }

  /**
   * Check if feature requirement matches template feature
   */
  private featureMatches(reqFeature: string, templateFeature: string): boolean {
    const normalize = (feature: string) =>
      feature.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const reqNorm = normalize(reqFeature);
    const tempNorm = normalize(templateFeature);

    // Exact match
    if (reqNorm === tempNorm) return true;

    // Partial match (one contains the other)
    if (reqNorm.includes(tempNorm) || tempNorm.includes(reqNorm)) return true;

    // Common synonyms
    const synonyms: { [key: string]: string[] } = {
      'auth': ['authentication', 'authorization', 'login', 'signup'],
      'payment': ['billing', 'stripe', 'subscription', 'checkout'],
      'team': ['workspace', 'organization', 'multitenant', 'collaborative'],
      'admin': ['dashboard', 'management', 'control panel']
    };

    for (const [key, values] of Object.entries(synonyms)) {
      if ((reqNorm.includes(key) || values.some(v => reqNorm.includes(v))) &&
          (tempNorm.includes(key) || values.some(v => tempNorm.includes(v)))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all templates
   */
  getAllTemplates(): Template[] {
    return this.templates;
  }

  /**
   * Get template by ID
   */
  getTemplateById(id: string): Template | undefined {
    return this.templates.find(t => t.id === id);
  }

  /**
   * Get catalog version
   */
  getCatalogVersion(): string {
    return this.catalogVersion;
  }
}

// Singleton instance
let recommenderInstance: TemplateRecommender | null = null;

/**
 * Get or create template recommender instance
 */
export function getTemplateRecommender(): TemplateRecommender {
  if (!recommenderInstance) {
    recommenderInstance = new TemplateRecommender();
  }
  return recommenderInstance;
}
