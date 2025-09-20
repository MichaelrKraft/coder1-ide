/**
 * Coder1 AI Review Service
 * 
 * This service provides intelligent code review capabilities as a native
 * Coder1 feature. It analyzes code for bugs, security issues, performance
 * problems, and best practices violations.
 * 
 * @module services/code-review
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { ReviewProvider } from './review-provider';
import { CodeRabbitProvider } from './coderabbit-provider';
import { ReviewFormatter } from './review-formatter';

const execAsync = promisify(exec);

export interface CodeReviewOptions {
  files?: string[];
  staged?: boolean;
  unstaged?: boolean;
  commit?: string;
  plain?: boolean;
  autoFix?: boolean;
}

export interface ReviewResult {
  source: string;
  timestamp: Date;
  summary: {
    total: number;
    errors: number;
    warnings: number;
    suggestions: number;
    security: number;
  };
  issues: ReviewIssue[];
  metrics: ReviewMetrics;
  confidence: number;
}

export interface ReviewIssue {
  severity: 'error' | 'warning' | 'info' | 'suggestion';
  category: string;
  file: string;
  line?: number;
  column?: number;
  message: string;
  suggestion?: string;
  autoFixAvailable?: boolean;
}

export interface ReviewMetrics {
  filesAnalyzed: number;
  linesReviewed: number;
  executionTime: number;
  coveragePercent: number;
}

export class CodeReviewService extends EventEmitter {
  private provider: ReviewProvider;
  private formatter: ReviewFormatter;
  private isInitialized: boolean = false;

  constructor() {
    super();
    // Use CodeRabbit provider but this is completely abstracted
    // Could easily swap to another provider in the future
    this.provider = new CodeRabbitProvider();
    this.formatter = new ReviewFormatter();
  }

  /**
   * Initialize the code review service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if the review engine is available
      await this.provider.checkAvailability();
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize Coder1 AI Review:', error);
      // Fail silently - feature simply won't be available
      this.emit('initialization-failed', error);
    }
  }

  /**
   * Perform AI code review on specified files or changes
   */
  async reviewCode(options: CodeReviewOptions = {}): Promise<ReviewResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    this.emit('review-started', options);

    try {
      // Get raw review from provider
      const rawReview = await this.provider.analyze(options);
      
      // Format for Coder1 branding
      const formattedReview = this.formatter.format(rawReview);
      
      // Add Coder1-specific metadata
      const result: ReviewResult = {
        source: 'Coder1 AI Review',
        timestamp: new Date(),
        summary: this.calculateSummary(formattedReview),
        issues: formattedReview.issues,
        metrics: {
          ...formattedReview.metrics,
          executionTime: Date.now() - startTime
        },
        confidence: this.calculateConfidence(formattedReview)
      };

      this.emit('review-completed', result);
      return result;
    } catch (error) {
      this.emit('review-failed', error);
      throw new Error(`AI Review failed: ${error.message}`);
    }
  }

  /**
   * Apply automatic fixes for issues that support auto-fix
   */
  async applyFixes(issues: ReviewIssue[]): Promise<{ 
    fixed: number; 
    failed: number;
    results: Array<{ issue: ReviewIssue; success: boolean; error?: string }> 
  }> {
    const fixableIssues = issues.filter(i => i.autoFixAvailable);
    const results = [];
    let fixed = 0;
    let failed = 0;

    for (const issue of fixableIssues) {
      try {
        await this.provider.applyFix(issue);
        results.push({ issue, success: true });
        fixed++;
      } catch (error) {
        results.push({ issue, success: false, error: error.message });
        failed++;
      }
    }

    this.emit('fixes-applied', { fixed, failed });
    return { fixed, failed, results };
  }

  /**
   * Get review status and statistics
   */
  async getStatus(): Promise<{
    available: boolean;
    version: string;
    stats: {
      totalReviews: number;
      issuesCaught: number;
      timesSaved: string;
    }
  }> {
    const available = this.isInitialized;
    const stats = await this.provider.getStatistics();

    return {
      available,
      version: 'Coder1 AI Review v2.0.0',
      stats: {
        totalReviews: stats.totalReviews || 0,
        issuesCaught: stats.issuesCaught || 0,
        timesSaved: this.formatTimeSaved(stats.timeSaved || 0)
      }
    };
  }

  /**
   * Calculate summary statistics from review
   */
  private calculateSummary(review: any): ReviewResult['summary'] {
    const issues = review.issues || [];
    return {
      total: issues.length,
      errors: issues.filter((i: ReviewIssue) => i.severity === 'error').length,
      warnings: issues.filter((i: ReviewIssue) => i.severity === 'warning').length,
      suggestions: issues.filter((i: ReviewIssue) => i.severity === 'suggestion').length,
      security: issues.filter((i: ReviewIssue) => i.category === 'security').length
    };
  }

  /**
   * Calculate confidence score for the review
   */
  private calculateConfidence(review: any): number {
    // Complex algorithm that considers multiple factors
    const factors = {
      coverage: review.metrics?.coveragePercent || 0,
      filesAnalyzed: Math.min(review.metrics?.filesAnalyzed || 0, 100),
      executionSuccess: review.success ? 100 : 0
    };

    // Weighted average
    const confidence = (
      factors.coverage * 0.4 +
      factors.filesAnalyzed * 0.3 +
      factors.executionSuccess * 0.3
    );

    return Math.round(confidence);
  }

  /**
   * Format time saved in human-readable format
   */
  private formatTimeSaved(minutes: number): string {
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hours`;
    return `${Math.round(minutes / 1440)} days`;
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
export const codeReviewService = new CodeReviewService();