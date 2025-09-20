/**
 * Internal provider implementation
 * This file is never exposed to users and handles the actual
 * integration with the underlying review engine.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { ReviewProvider, RawReviewResult, ProviderStatistics } from './review-provider';
import { CodeReviewOptions, ReviewIssue } from './code-review-service';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export class CodeRabbitProvider extends ReviewProvider {
  private cliPath: string = 'coderabbit'; // Will be in PATH after installation
  private statsFile: string = path.join(process.cwd(), '.coder1', 'review-stats.json');

  async checkAvailability(): Promise<void> {
    try {
      // Check if CLI is installed
      const { stdout } = await execAsync('which coderabbit 2>/dev/null || echo "not found"');
      
      if (stdout.trim() === 'not found') {
        // Silently install if not present
        await this.installCLI();
      }

      // Verify it works
      await execAsync(`${this.cliPath} --version`, { 
        timeout: 5000,
        env: { ...process.env, CODERABBIT_SILENT: 'true' }
      });
    } catch (error) {
      throw new Error('Review engine not available');
    }
  }

  async analyze(options: CodeReviewOptions): Promise<RawReviewResult> {
    try {
      // Build command based on options
      let command = `${this.cliPath} review`;
      
      if (options.staged) command += ' --staged';
      if (options.unstaged) command += ' --unstaged';
      if (options.commit) command += ` --commit ${options.commit}`;
      if (options.files?.length) command += ` ${options.files.join(' ')}`;
      
      // Always output JSON for parsing
      command += ' --json --no-color';

      // Execute review with hidden branding
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 1 minute timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: { 
          ...process.env, 
          CODERABBIT_SILENT: 'true',
          CODERABBIT_NO_TELEMETRY: 'true'
        }
      });

      // Parse the JSON output
      const result = JSON.parse(stdout);

      // Update statistics
      await this.updateStatistics(result);

      return {
        success: true,
        issues: result.issues || [],
        metrics: result.metrics,
        raw: stdout
      };
    } catch (error) {
      console.error('Review analysis error:', error);
      return {
        success: false,
        issues: [],
        raw: error.message
      };
    }
  }

  async applyFix(issue: ReviewIssue): Promise<void> {
    if (!issue.autoFixAvailable || !issue.suggestion) {
      throw new Error('No auto-fix available for this issue');
    }

    // Build fix command
    const command = `${this.cliPath} fix --file "${issue.file}" --line ${issue.line} --apply`;

    try {
      await execAsync(command, {
        timeout: 30000,
        env: { 
          ...process.env, 
          CODERABBIT_SILENT: 'true',
          CODERABBIT_AUTO_CONFIRM: 'true'
        }
      });
    } catch (error) {
      throw new Error(`Failed to apply fix: ${error.message}`);
    }
  }

  async getStatistics(): Promise<ProviderStatistics> {
    try {
      // Read stats from local file
      const stats = await fs.readFile(this.statsFile, 'utf-8');
      return JSON.parse(stats);
    } catch {
      // Return default stats if file doesn't exist
      return {
        totalReviews: 0,
        issuesCaught: 0,
        timeSaved: 0
      };
    }
  }

  async getVersion(): Promise<string> {
    try {
      const { stdout } = await execAsync(`${this.cliPath} --version`, {
        env: { ...process.env, CODERABBIT_SILENT: 'true' }
      });
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Silently install the CLI if not present
   */
  private async installCLI(): Promise<void> {
    try {
      // Check OS
      const { stdout: osType } = await execAsync('uname -s');
      const isLinux = osType.includes('Linux');
      const isMac = osType.includes('Darwin');

      if (!isLinux && !isMac) {
        throw new Error('Unsupported OS for automatic installation');
      }

      // Download and install silently
      const installCommand = 'curl -fsSL https://cli.coderabbit.ai/install.sh | sh > /dev/null 2>&1';
      await execAsync(installCommand, { timeout: 120000 }); // 2 minute timeout for download

      // Verify installation
      await execAsync('which coderabbit');
    } catch (error) {
      console.error('Failed to auto-install review engine:', error);
      throw new Error('Review engine installation failed');
    }
  }

  /**
   * Update local statistics after each review
   */
  private async updateStatistics(result: any): Promise<void> {
    try {
      const stats = await this.getStatistics();
      
      stats.totalReviews++;
      stats.issuesCaught += (result.issues?.length || 0);
      stats.timeSaved += this.estimateTimeSaved(result.issues?.length || 0);

      // Ensure directory exists
      const dir = path.dirname(this.statsFile);
      await fs.mkdir(dir, { recursive: true });

      // Write updated stats
      await fs.writeFile(this.statsFile, JSON.stringify(stats, null, 2));
    } catch (error) {
      // Silently fail - stats are not critical
      console.debug('Failed to update statistics:', error);
    }
  }

  /**
   * Estimate time saved based on issues caught
   */
  private estimateTimeSaved(issueCount: number): number {
    // Estimate 15 minutes saved per issue caught
    // (time to find, debug, and fix in production)
    return issueCount * 15;
  }
}