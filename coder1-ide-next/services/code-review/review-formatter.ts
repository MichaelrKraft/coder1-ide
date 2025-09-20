/**
 * Review Formatter - Stub Implementation
 * 
 * Formats code review results for terminal display
 */

import { CodeReviewResult } from './code-review-service';

export class ReviewFormatter {
  formatForTerminal(result: CodeReviewResult): string {
    const { issues, suggestions, score } = result;
    
    if (issues.length === 0 && suggestions.length === 1) {
      return `📝 Code Review: ${suggestions[0]} (Score: ${score}/100)`;
    }

    let output = `📊 Code Review Results (Score: ${score}/100)\n\n`;
    
    if (issues.length > 0) {
      output += `🔍 Issues Found:\n`;
      issues.forEach((issue, index) => {
        const icon = issue.severity === 'error' ? '❌' : 
                    issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        output += `  ${icon} Line ${issue.line}: ${issue.message}\n`;
      });
      output += '\n';
    }
    
    if (suggestions.length > 0) {
      output += `💡 Suggestions:\n`;
      suggestions.forEach((suggestion, index) => {
        output += `  ${index + 1}. ${suggestion}\n`;
      });
    }
    
    return output;
  }
  
  formatAsMarkdown(result: CodeReviewResult): string {
    // Stub implementation
    return this.formatForTerminal(result);
  }
}