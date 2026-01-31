/**
 * Johnny5 Proactive Builder Service
 *
 * Auto-PR system that allows Johnny5 to autonomously build features and create PRs.
 * Implements strict safety rules to prevent destructive operations.
 *
 * Key Safety Principles:
 * - NEVER push to main/master
 * - NEVER merge PRs without human approval
 * - NEVER modify .env or security files
 * - ALWAYS create feature branches
 * - ALWAYS run tests before creating PRs
 * - ALWAYS wait for human approval
 */

import type {
  Johnny5PRRequest,
  Johnny5BuilderRules,
  Johnny5Task,
  Johnny5AuditEntry,
} from '@/types';

// ================================================================================
// Safety Rules Configuration
// ================================================================================

export const PROACTIVE_BUILDER_RULES: Johnny5BuilderRules = {
  maxPRsPerDay: 5,
  maxFilesPerPR: 20,
  maxLinesChanged: 500,
  requireTestsPass: true,
  forbidden: [
    'push to main/master',
    'merge PRs',
    'deploy to production',
    'modify .env files',
    'change auth/security code without review',
    'delete files without backup',
    'run destructive database operations',
  ],
  required: [
    'create feature branch',
    'run tests before PR',
    'include detailed PR description',
    'add screenshots for UI changes',
    'notify user of PR creation',
    'wait for human approval before merge',
  ],
};

// ================================================================================
// Types
// ================================================================================

export interface BuildTask {
  id: string;
  title: string;
  description: string;
  opportunity: string;
  estimatedImpact: {
    timeSaved?: string;
    revenuePotential?: string;
    qualityImprovement?: string;
  };
  filesAffected: string[];
  createdAt: Date;
  status: 'pending' | 'building' | 'testing' | 'ready_for_pr' | 'pr_created' | 'failed';
  reasoning: string;
  triggeredBy: 'conversation' | 'trend' | 'schedule' | 'self_improvement';
}

export interface BuildResult {
  success: boolean;
  pr?: Johnny5PRRequest;
  error?: string;
  testsOutput?: string;
  filesModified: string[];
  linesChanged: number;
}

export interface SafetyCheckResult {
  passed: boolean;
  violations: string[];
  warnings: string[];
}

// ================================================================================
// Proactive Builder Service
// ================================================================================

class ProactiveBuilderService {
  private dailyPRCount: number = 0;
  private lastResetDate: string = new Date().toDateString();
  private pendingTasks: BuildTask[] = [];
  private activeBuild: BuildTask | null = null;

  /**
   * Check safety rules before any build operation
   */
  checkSafety(task: BuildTask): SafetyCheckResult {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Check daily PR limit
    this.resetDailyCountIfNeeded();
    if (this.dailyPRCount >= PROACTIVE_BUILDER_RULES.maxPRsPerDay) {
      violations.push(`Daily PR limit reached (${PROACTIVE_BUILDER_RULES.maxPRsPerDay})`);
    }

    // Check file count limit
    if (task.filesAffected.length > PROACTIVE_BUILDER_RULES.maxFilesPerPR) {
      violations.push(
        `Too many files (${task.filesAffected.length}/${PROACTIVE_BUILDER_RULES.maxFilesPerPR})`
      );
    }

    // Check for forbidden file patterns
    const forbiddenPatterns = ['.env', '.env.local', '.env.production', 'secrets'];
    for (const file of task.filesAffected) {
      if (forbiddenPatterns.some((pattern) => file.includes(pattern))) {
        violations.push(`Cannot modify sensitive file: ${file}`);
      }
    }

    // Check for security-related files
    const securityPatterns = ['auth', 'security', 'password', 'token', 'credential'];
    for (const file of task.filesAffected) {
      if (securityPatterns.some((pattern) => file.toLowerCase().includes(pattern))) {
        warnings.push(`Security-related file detected: ${file} - requires extra review`);
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
    };
  }

  /**
   * Reset daily count if it's a new day
   */
  private resetDailyCountIfNeeded(): void {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyPRCount = 0;
      this.lastResetDate = today;
    }
  }

  /**
   * Queue a new build task
   */
  queueBuildTask(task: Omit<BuildTask, 'id' | 'createdAt' | 'status'>): BuildTask {
    const newTask: BuildTask = {
      ...task,
      id: `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      status: 'pending',
    };

    // Check safety before queuing
    const safetyCheck = this.checkSafety(newTask);
    if (!safetyCheck.passed) {
      console.warn('Build task failed safety check:', safetyCheck.violations);
      newTask.status = 'failed';
    }

    this.pendingTasks.push(newTask);
    return newTask;
  }

  /**
   * Get all pending build tasks
   */
  getPendingTasks(): BuildTask[] {
    return this.pendingTasks.filter((t) => t.status === 'pending');
  }

  /**
   * Get the current active build
   */
  getActiveBuild(): BuildTask | null {
    return this.activeBuild;
  }

  /**
   * Start building a task (mock implementation)
   */
  async startBuild(taskId: string): Promise<BuildResult> {
    const task = this.pendingTasks.find((t) => t.id === taskId);
    if (!task) {
      return { success: false, error: 'Task not found', filesModified: [], linesChanged: 0 };
    }

    // Safety check before starting
    const safetyCheck = this.checkSafety(task);
    if (!safetyCheck.passed) {
      task.status = 'failed';
      return {
        success: false,
        error: `Safety violations: ${safetyCheck.violations.join(', ')}`,
        filesModified: [],
        linesChanged: 0,
      };
    }

    task.status = 'building';
    this.activeBuild = task;

    // Simulate build process (in real implementation, this would call code generator)
    await this.simulateBuildProcess(task);

    // Run tests
    task.status = 'testing';
    const testsPass = await this.runTests();

    if (!testsPass && PROACTIVE_BUILDER_RULES.requireTestsPass) {
      task.status = 'failed';
      this.activeBuild = null;
      return {
        success: false,
        error: 'Tests failed - PR not created',
        filesModified: task.filesAffected,
        linesChanged: 0,
        testsOutput: 'FAILED: 2 tests failed (simulated)',
      };
    }

    // Create PR
    task.status = 'ready_for_pr';
    const pr = await this.createPR(task);
    task.status = 'pr_created';
    this.activeBuild = null;
    this.dailyPRCount++;

    return {
      success: true,
      pr,
      filesModified: task.filesAffected,
      linesChanged: Math.floor(Math.random() * 200) + 50,
      testsOutput: 'PASSED: All tests passed (simulated)',
    };
  }

  /**
   * Simulate the build process (mock)
   */
  private async simulateBuildProcess(task: BuildTask): Promise<void> {
    // In real implementation, this would call the code generator
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  /**
   * Run tests before creating PR (mock)
   */
  private async runTests(): Promise<boolean> {
    // In real implementation, this would run actual tests
    await new Promise((resolve) => setTimeout(resolve, 500));
    return Math.random() > 0.1; // 90% success rate for demo
  }

  /**
   * Create a PR for the completed build (mock)
   */
  private async createPR(task: BuildTask): Promise<Johnny5PRRequest> {
    const branchName = `johnny5/${task.id}`;

    return {
      id: `pr_${Date.now()}`,
      title: task.title,
      description: this.generatePRDescription(task),
      branch: branchName,
      status: 'pending',
      createdAt: new Date(),
      files: task.filesAffected,
      linesChanged: Math.floor(Math.random() * 200) + 50,
      testsPass: true,
      reasoning: task.reasoning,
      opportunity: task.opportunity,
      url: `https://github.com/example/repo/pull/${Math.floor(Math.random() * 1000)}`,
    };
  }

  /**
   * Generate PR description following template
   */
  private generatePRDescription(task: BuildTask): string {
    return `## Johnny5 Auto-Generated PR

### What I Built
${task.description}

### Why I Built It
- Noticed: ${task.opportunity}
- Estimated impact:
  ${task.estimatedImpact.timeSaved ? `  - Time saved: ${task.estimatedImpact.timeSaved}` : ''}
  ${task.estimatedImpact.revenuePotential ? `  - Revenue potential: ${task.estimatedImpact.revenuePotential}` : ''}
  ${task.estimatedImpact.qualityImprovement ? `  - Quality improvement: ${task.estimatedImpact.qualityImprovement}` : ''}

### Changes
${task.filesAffected.map((f) => `- \`${f}\``).join('\n')}

### Test Results
All tests passed.

### My Reasoning
${task.reasoning}

---
*Generated by Johnny5 Proactive Builder*
*Waiting for human approval before merge*`;
  }

  /**
   * Get all pending PRs
   */
  getPendingPRs(): Johnny5PRRequest[] {
    // Mock data for demo
    return MOCK_PENDING_PRS;
  }

  /**
   * Approve a PR (marks for merge, still requires human to actually merge)
   */
  approvePR(prId: string): boolean {
    // In real implementation, this would update the PR status
    return true;
  }

  /**
   * Reject a PR
   */
  rejectPR(prId: string, reason: string): boolean {
    // In real implementation, this would close the PR
    return true;
  }

  /**
   * Create an audit entry for builder actions
   */
  createAuditEntry(action: string, target: string, reasoning: string): Johnny5AuditEntry {
    return {
      id: `audit_${Date.now()}`,
      timestamp: new Date(),
      action: 'pr_created',
      target,
      source: 'ai',
      reasoning,
      risk: 'low',
      blocked: false,
    };
  }
}

// ================================================================================
// Mock Data for Demo
// ================================================================================

export const MOCK_PENDING_PRS: Johnny5PRRequest[] = [
  {
    id: 'pr_001',
    title: 'Add dark mode toggle to settings',
    description: 'Implements a dark mode toggle in the settings panel with system preference detection.',
    branch: 'johnny5/build_001',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    files: ['components/settings/ThemeToggle.tsx', 'lib/theme-context.ts', 'app/globals.css'],
    linesChanged: 127,
    testsPass: true,
    reasoning: 'User mentioned wanting dark mode 3 times in recent sessions. High-value UX improvement with minimal risk.',
    opportunity: 'User requested dark mode in conversations',
  },
  {
    id: 'pr_002',
    title: 'Optimize API response caching',
    description: 'Adds Redis caching layer for frequently accessed API endpoints to reduce latency.',
    branch: 'johnny5/build_002',
    status: 'pending',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    files: ['lib/cache.ts', 'app/api/data/route.ts', 'middleware.ts'],
    linesChanged: 89,
    testsPass: true,
    reasoning: 'Noticed repeated API calls in analytics. Caching could reduce load by 60%.',
    opportunity: 'Analytics showed repeated identical API calls',
  },
  {
    id: 'pr_003',
    title: 'Add keyboard shortcuts modal',
    description: 'Creates a help modal showing all available keyboard shortcuts with ? key trigger.',
    branch: 'johnny5/build_003',
    status: 'approved',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    files: ['components/KeyboardShortcutsModal.tsx', 'hooks/useKeyboardShortcuts.ts'],
    linesChanged: 156,
    testsPass: true,
    reasoning: 'Power users often ask about shortcuts. Self-documenting UI pattern.',
    opportunity: 'FAQ analysis showed keyboard shortcuts as top question',
    url: 'https://github.com/example/repo/pull/123',
  },
  {
    id: 'pr_004',
    title: 'Fix memory leak in WebSocket handler',
    description: 'Properly cleans up event listeners on component unmount to prevent memory leaks.',
    branch: 'johnny5/build_004',
    status: 'rejected',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    files: ['lib/socket.ts', 'components/terminal/Terminal.tsx'],
    linesChanged: 34,
    testsPass: false,
    reasoning: 'Memory profiling showed gradual heap growth. Traced to WebSocket listeners.',
    opportunity: 'Performance monitoring detected memory growth',
  },
];

export const MOCK_BUILD_TASKS: BuildTask[] = [
  {
    id: 'task_001',
    title: 'Implement auto-save feature',
    description: 'Add auto-save functionality to the editor with configurable interval.',
    opportunity: 'User lost work due to browser crash - mentioned in conversation',
    estimatedImpact: {
      timeSaved: '5-10 min per incident',
      qualityImprovement: 'Prevents data loss',
    },
    filesAffected: ['components/editor/MonacoEditor.tsx', 'hooks/useAutoSave.ts'],
    createdAt: new Date(),
    status: 'pending',
    reasoning: 'Auto-save is a standard feature that prevents frustrating data loss scenarios.',
    triggeredBy: 'conversation',
  },
  {
    id: 'task_002',
    title: 'Add export to PDF',
    description: 'Allow users to export their documents as PDF files.',
    opportunity: 'Trending feature request on GitHub issues',
    estimatedImpact: {
      revenuePotential: 'Premium feature potential',
    },
    filesAffected: ['lib/pdf-export.ts', 'components/ExportButton.tsx'],
    createdAt: new Date(),
    status: 'building',
    reasoning: 'PDF export is highly requested and relatively low complexity to implement.',
    triggeredBy: 'trend',
  },
];

// ================================================================================
// Export Singleton Instance
// ================================================================================

export const proactiveBuilder = new ProactiveBuilderService();
export default proactiveBuilder;
