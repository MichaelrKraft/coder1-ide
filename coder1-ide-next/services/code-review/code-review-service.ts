/**
 * Code Review Service - Stub Implementation
 * 
 * Temporary stub to unblock terminal loading while implementing Phase 2 agent terminals
 */

export interface CodeReviewResult {
  issues: Array<{
    line: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    rule?: string;
  }>;
  suggestions: string[];
  score: number;
}

export class CodeReviewService {
  async reviewCode(code: string, filename?: string): Promise<CodeReviewResult> {
    // Stub implementation - returns empty review
    return {
      issues: [],
      suggestions: ['Code review service is not yet implemented'],
      score: 85
    };
  }

  async reviewFile(filePath: string): Promise<CodeReviewResult> {
    // Stub implementation
    return this.reviewCode('', filePath);
  }
}

// Export singleton instance
export const codeReviewService = new CodeReviewService();