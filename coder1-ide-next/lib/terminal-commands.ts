/**
 * Terminal Command Handler
 * 
 * Intercepts and processes special terminal commands
 * like "ai review" before sending to the backend.
 */

import { codeReviewService } from '@/services/code-review/code-review-service';
import { ReviewFormatter } from '@/services/code-review/review-formatter';

export interface CommandResult {
  handled: boolean;
  output?: string;
  error?: string;
}

export class TerminalCommandHandler {
  private formatter: ReviewFormatter;

  constructor() {
    this.formatter = new ReviewFormatter();
  }

  /**
   * Process a terminal command and determine if it should be handled specially
   */
  async processCommand(command: string): Promise<CommandResult> {
    const trimmedCommand = command.trim().toLowerCase();

    // Check for AI review commands
    if (trimmedCommand.startsWith('ai review') || trimmedCommand.startsWith('ai:review')) {
      return this.handleReviewCommand(command);
    }

    if (trimmedCommand.startsWith('ai fix') || trimmedCommand.startsWith('ai:fix')) {
      return this.handleFixCommand(command);
    }

    if (trimmedCommand === 'ai status' || trimmedCommand === 'ai:status') {
      return this.handleStatusCommand();
    }

    if (trimmedCommand === 'ai help' || trimmedCommand === 'ai:help') {
      return this.handleHelpCommand();
    }

    // Command not handled - let it pass through to backend
    return { handled: false };
  }

  /**
   * Handle "ai review" command
   */
  private async handleReviewCommand(command: string): Promise<CommandResult> {
    try {
      // Parse command options
      const parts = command.trim().split(/\s+/);
      const options: any = {};

      // Check for flags
      if (parts.includes('--staged')) options.staged = true;
      if (parts.includes('--unstaged')) options.unstaged = true;
      if (parts.includes('--fix')) options.autoFix = true;

      // Extract files if specified
      const fileIndex = parts.findIndex(p => !p.startsWith('--') && p !== 'ai' && p !== 'review');
      if (fileIndex !== -1) {
        options.files = parts.slice(fileIndex);
      }

      // Initialize service if needed
      if (!codeReviewService.isAvailable()) {
        await codeReviewService.initialize();
      }

      // Show starting message
      const startMessage = '\n🚀 Starting Coder1 AI Review...\n';

      // Perform review
      const result = await codeReviewService.reviewCode(options);

      // Format output
      const output = this.formatter.formatForTerminal({
        success: true,
        issues: result.issues,
        metrics: result.metrics
      });

      return {
        handled: true,
        output: startMessage + output
      };
    } catch (error) {
      return {
        handled: true,
        error: `\n❌ AI Review failed: ${error.message}\n\nTry running 'ai help' for usage information.\n`
      };
    }
  }

  /**
   * Handle "ai fix" command
   */
  private async handleFixCommand(command: string): Promise<CommandResult> {
    try {
      // Get the last review results
      const lastReview = await codeReviewService.reviewCode({ staged: true });
      
      if (lastReview.issues.length === 0) {
        return {
          handled: true,
          output: '\n✅ No issues to fix - your code looks great!\n'
        };
      }

      const fixableIssues = lastReview.issues.filter(i => i.autoFixAvailable);
      
      if (fixableIssues.length === 0) {
        return {
          handled: true,
          output: `\n⚠️  Found ${lastReview.issues.length} issues, but none have auto-fixes available.\n\nPlease fix them manually based on the review suggestions.\n`
        };
      }

      // Apply fixes
      const { fixed, failed } = await codeReviewService.applyFixes(fixableIssues);

      const output = [
        '',
        '🔧 Coder1 AI Fix Results',
        '━'.repeat(50),
        '',
        `✅ Fixed: ${fixed} issue${fixed !== 1 ? 's' : ''}`,
        failed > 0 ? `❌ Failed: ${failed} issue${failed !== 1 ? 's' : ''}` : '',
        '',
        fixed > 0 ? '🎉 Auto-fixes applied successfully!' : '⚠️  Some fixes could not be applied automatically.',
        '',
        'Run `ai review` again to verify all issues are resolved.',
        ''
      ].filter(Boolean).join('\n');

      return {
        handled: true,
        output
      };
    } catch (error) {
      return {
        handled: true,
        error: `\n❌ AI Fix failed: ${error.message}\n`
      };
    }
  }

  /**
   * Handle "ai status" command
   */
  private async handleStatusCommand(): Promise<CommandResult> {
    try {
      const status = await codeReviewService.getStatus();

      const output = [
        '',
        '📊 Coder1 AI Review Status',
        '━'.repeat(50),
        '',
        `✅ Service: ${status.available ? 'Available' : 'Not Available'}`,
        `📦 Version: ${status.version}`,
        '',
        '📈 Statistics:',
        `   • Total Reviews: ${status.stats.totalReviews}`,
        `   • Issues Caught: ${status.stats.issuesCaught}`,
        `   • Time Saved: ${status.stats.timesSaved}`,
        '',
        '💡 Run `ai help` for available commands',
        ''
      ].join('\n');

      return {
        handled: true,
        output
      };
    } catch (error) {
      return {
        handled: true,
        error: `\n❌ Failed to get status: ${error.message}\n`
      };
    }
  }

  /**
   * Handle "ai help" command
   */
  private handleHelpCommand(): CommandResult {
    const output = [
      '',
      '🤖 Coder1 AI Commands',
      '━'.repeat(50),
      '',
      '📝 Review Commands:',
      '   ai review              Review all changes',
      '   ai review --staged     Review staged changes only',
      '   ai review --unstaged   Review unstaged changes only',
      '   ai review [files...]   Review specific files',
      '',
      '🔧 Fix Commands:',
      '   ai fix                 Apply auto-fixes for issues',
      '',
      '📊 Status Commands:',
      '   ai status              Show AI Review status',
      '   ai help                Show this help message',
      '',
      '💡 Tips:',
      '   • Reviews catch bugs, security issues, and performance problems',
      '   • Auto-fixes are available for many common issues',
      '   • Run review before committing for best results',
      '',
      '🚀 Powered by Coder1 AI Engine',
      ''
    ].join('\n');

    return {
      handled: true,
      output
    };
  }
}

// Export singleton instance
export const terminalCommandHandler = new TerminalCommandHandler();