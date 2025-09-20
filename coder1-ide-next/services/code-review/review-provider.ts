/**
 * Review Provider Interface
 * 
 * Abstract interface for code review providers.
 * This allows us to swap out the underlying implementation
 * without changing the service layer.
 */

import { CodeReviewOptions, ReviewIssue } from './code-review-service';

export interface RawReviewResult {
  success: boolean;
  issues: any[];
  metrics?: any;
  raw?: string;
}

export interface ProviderStatistics {
  totalReviews: number;
  issuesCaught: number;
  timeSaved: number; // in minutes
}

export abstract class ReviewProvider {
  /**
   * Check if the provider is available and properly configured
   */
  abstract checkAvailability(): Promise<void>;

  /**
   * Analyze code and return review results
   */
  abstract analyze(options: CodeReviewOptions): Promise<RawReviewResult>;

  /**
   * Apply a fix for a specific issue
   */
  abstract applyFix(issue: ReviewIssue): Promise<void>;

  /**
   * Get provider statistics
   */
  abstract getStatistics(): Promise<ProviderStatistics>;

  /**
   * Get provider version information
   */
  abstract getVersion(): Promise<string>;
}