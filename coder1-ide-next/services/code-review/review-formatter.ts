/**
 * Review Formatter
 * 
 * Transforms raw review output into Coder1-branded format.
 * Ensures consistent presentation across all review results.
 */

import { ReviewIssue } from './code-review-service';

export interface FormattedReview {
  success: boolean;
  issues: ReviewIssue[];
  metrics: {
    filesAnalyzed: number;
    linesReviewed: number;
    coveragePercent: number;
  };
}

export class ReviewFormatter {
  /**
   * Format raw review results into Coder1 format
   */
  format(rawReview: any): FormattedReview {
    const issues = this.formatIssues(rawReview.issues || []);
    const metrics = this.formatMetrics(rawReview.metrics || {});

    return {
      success: rawReview.success,
      issues,
      metrics
    };
  }

  /**
   * Format individual issues with Coder1 categorization
   */
  private formatIssues(rawIssues: any[]): ReviewIssue[] {
    return rawIssues.map(issue => ({
      severity: this.mapSeverity(issue.severity || issue.level),
      category: this.mapCategory(issue.category || issue.type),
      file: issue.file || issue.path,
      line: issue.line || issue.start_line,
      column: issue.column || issue.start_column,
      message: this.enhanceMessage(issue.message || issue.description),
      suggestion: this.formatSuggestion(issue.suggestion || issue.fix),
      autoFixAvailable: Boolean(issue.fix || issue.auto_fix)
    }));
  }

  /**
   * Map external severity levels to Coder1 levels
   */
  private mapSeverity(severity: string): ReviewIssue['severity'] {
    const severityMap: Record<string, ReviewIssue['severity']> = {
      'error': 'error',
      'critical': 'error',
      'high': 'error',
      'warning': 'warning',
      'medium': 'warning',
      'info': 'info',
      'low': 'info',
      'suggestion': 'suggestion',
      'style': 'suggestion'
    };

    return severityMap[severity?.toLowerCase()] || 'info';
  }

  /**
   * Map external categories to Coder1 categories
   */
  private mapCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'security': 'Security',
      'performance': 'Performance',
      'bug': 'Bug Risk',
      'code_smell': 'Code Quality',
      'style': 'Style',
      'best_practice': 'Best Practice',
      'complexity': 'Complexity',
      'duplication': 'Duplication',
      'test': 'Testing',
      'documentation': 'Documentation'
    };

    return categoryMap[category?.toLowerCase()] || 'General';
  }

  /**
   * Enhance messages with Coder1 tone and clarity
   */
  private enhanceMessage(message: string): string {
    if (!message) return 'Issue detected';

    // Remove any external tool references
    let enhanced = message
      .replace(/CodeRabbit/gi, 'AI Review')
      .replace(/rabbit/gi, 'review')
      .trim();

    // Add helpful prefix based on content
    if (enhanced.toLowerCase().includes('security')) {
      enhanced = `🔒 ${enhanced}`;
    } else if (enhanced.toLowerCase().includes('performance')) {
      enhanced = `⚡ ${enhanced}`;
    } else if (enhanced.toLowerCase().includes('bug') || enhanced.toLowerCase().includes('error')) {
      enhanced = `🐛 ${enhanced}`;
    }

    return enhanced;
  }

  /**
   * Format suggestions in Coder1 style
   */
  private formatSuggestion(suggestion: string): string | undefined {
    if (!suggestion) return undefined;

    // Clean up and format
    return suggestion
      .replace(/CodeRabbit/gi, 'Coder1')
      .replace(/suggests?/gi, 'recommends')
      .trim();
  }

  /**
   * Format metrics with defaults
   */
  private formatMetrics(rawMetrics: any): FormattedReview['metrics'] {
    return {
      filesAnalyzed: rawMetrics.files_analyzed || rawMetrics.files || 0,
      linesReviewed: rawMetrics.lines_reviewed || rawMetrics.lines || 0,
      coveragePercent: rawMetrics.coverage || rawMetrics.coverage_percent || 100
    };
  }

  /**
   * Format review output for terminal display
   */
  formatForTerminal(review: FormattedReview): string {
    const lines: string[] = [];
    
    // Header
    lines.push('');
    lines.push('🚀 Coder1 AI Review');
    lines.push('━'.repeat(50));
    lines.push('');

    // Summary
    const errorCount = review.issues.filter(i => i.severity === 'error').length;
    const warningCount = review.issues.filter(i => i.severity === 'warning').length;
    const suggestionCount = review.issues.filter(i => i.severity === 'suggestion').length;

    if (review.issues.length === 0) {
      lines.push('✅ No issues found - code looks great!');
    } else {
      lines.push(`📊 Found ${review.issues.length} issue${review.issues.length !== 1 ? 's' : ''}:`);
      if (errorCount > 0) lines.push(`   ❌ ${errorCount} error${errorCount !== 1 ? 's' : ''}`);
      if (warningCount > 0) lines.push(`   ⚠️  ${warningCount} warning${warningCount !== 1 ? 's' : ''}`);
      if (suggestionCount > 0) lines.push(`   💡 ${suggestionCount} suggestion${suggestionCount !== 1 ? 's' : ''}`);
    }

    lines.push('');

    // Issues grouped by file
    const issuesByFile = this.groupIssuesByFile(review.issues);
    
    for (const [file, issues] of Object.entries(issuesByFile)) {
      lines.push(`📁 ${file}`);
      
      for (const issue of issues) {
        const icon = this.getSeverityIcon(issue.severity);
        const location = issue.line ? `:${issue.line}` : '';
        lines.push(`   ${icon} Line${location} - ${issue.message}`);
        
        if (issue.suggestion) {
          lines.push(`      💡 ${issue.suggestion}`);
        }
        
        if (issue.autoFixAvailable) {
          lines.push(`      🔧 Auto-fix available`);
        }
      }
      lines.push('');
    }

    // Footer
    lines.push('━'.repeat(50));
    lines.push(`📈 Analyzed ${review.metrics.filesAnalyzed} files (${review.metrics.linesReviewed} lines)`);
    lines.push('');
    lines.push('💡 Run `ai fix` to apply available auto-fixes');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Group issues by file for better organization
   */
  private groupIssuesByFile(issues: ReviewIssue[]): Record<string, ReviewIssue[]> {
    const grouped: Record<string, ReviewIssue[]> = {};
    
    for (const issue of issues) {
      const file = issue.file || 'General';
      if (!grouped[file]) grouped[file] = [];
      grouped[file].push(issue);
    }

    // Sort issues within each file by line number
    for (const file of Object.keys(grouped)) {
      grouped[file].sort((a, b) => (a.line || 0) - (b.line || 0));
    }

    return grouped;
  }

  /**
   * Get icon for severity level
   */
  private getSeverityIcon(severity: ReviewIssue['severity']): string {
    const icons = {
      'error': '❌',
      'warning': '⚠️',
      'info': 'ℹ️',
      'suggestion': '💡'
    };
    return icons[severity] || '•';
  }
}