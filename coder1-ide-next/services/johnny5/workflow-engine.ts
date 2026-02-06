/**
 * Johnny5 Workflow Engine
 *
 * Client-side singleton service that manages multi-step workflows for guided
 * Claude Code sessions. Provides built-in workflow templates (feature, bugfix,
 * refactor, test, deploy) and supports custom workflows. Persists to
 * localStorage and emits `johnny5:workflowUpdate` CustomEvents on changes.
 *
 * Browser-only: no Node.js imports (fs, path, child_process, etc.).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  promptTemplate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: Date;
  notes?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  category: 'feature' | 'bugfix' | 'refactor' | 'test' | 'deploy' | 'custom';
  steps: WorkflowStep[];
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
  completedSteps: number;
  totalSteps: number;
}

export interface WorkflowTemplatePlaceholder {
  key: string;
  label: string;
  description: string;
}

export interface WorkflowTemplateStep {
  title: string;
  description: string;
  promptTemplate: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: Workflow['category'];
  placeholders: WorkflowTemplatePlaceholder[];
  steps: WorkflowTemplateStep[];
}

// ---------------------------------------------------------------------------
// Serialization types (for localStorage)
// ---------------------------------------------------------------------------

interface SerializedWorkflow {
  id: string;
  name: string;
  description: string;
  category: Workflow['category'];
  steps: Array<{
    id: string;
    title: string;
    description: string;
    promptTemplate: string;
    status: WorkflowStep['status'];
    completedAt?: string;
    notes?: string;
  }>;
  status: Workflow['status'];
  createdAt: string;
  updatedAt: string;
  completedSteps: number;
  totalSteps: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'johnny5_workflows';
const MAX_WORKFLOWS = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateStepId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Built-in Templates
// ---------------------------------------------------------------------------

const BUILTIN_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'template-feature',
    name: 'Add a New Feature',
    description: 'Guided workflow for planning, implementing, testing, and shipping a new feature.',
    category: 'feature',
    placeholders: [
      { key: 'featureName', label: 'Feature Name', description: 'Short name for the feature (e.g., "user settings page")' },
      { key: 'featureDescription', label: 'Feature Description', description: 'What the feature should do and why' },
      { key: 'targetFiles', label: 'Target Files/Dirs', description: 'Files or directories to modify (e.g., "src/components/")' },
    ],
    steps: [
      {
        title: 'Plan the feature',
        description: 'Analyze the codebase and create an implementation plan before writing any code.',
        promptTemplate: 'I want to add a new feature: {featureName}. Description: {featureDescription}. Please analyze the relevant code in {targetFiles} and create a detailed implementation plan. List the files that need to be created or modified, and outline the approach step by step. Do NOT write any code yet.',
      },
      {
        title: 'Create new files',
        description: 'Scaffold the necessary files and boilerplate for the feature.',
        promptTemplate: 'Based on the plan we just discussed for {featureName}, please create the necessary new files with proper boilerplate, types, and exports. Focus on file structure and interfaces first, not full implementation.',
      },
      {
        title: 'Implement the feature',
        description: 'Write the core implementation logic for the feature.',
        promptTemplate: 'Now implement the core logic for {featureName}. Fill in the implementation for all the files we created. Make sure the code follows existing patterns in {targetFiles} and handles edge cases properly.',
      },
      {
        title: 'Write tests',
        description: 'Add unit and integration tests for the new feature.',
        promptTemplate: 'Write comprehensive tests for {featureName}. Include unit tests for individual functions and integration tests for the overall feature. Cover happy paths and edge cases.',
      },
      {
        title: 'Review and refine',
        description: 'Review the implementation for quality, performance, and adherence to project standards.',
        promptTemplate: 'Review all the code we just wrote for {featureName}. Check for: TypeScript errors, missing error handling, performance issues, accessibility concerns, and adherence to project conventions. Fix any issues you find.',
      },
      {
        title: 'Create pull request',
        description: 'Prepare the changes for a PR with a clear description.',
        promptTemplate: 'Create a git branch for {featureName}, stage all relevant changes, and write a clear commit message. Then prepare a PR description summarizing what was added, why, and how to test it.',
      },
    ],
  },
  {
    id: 'template-bugfix',
    name: 'Fix a Bug',
    description: 'Systematic workflow for reproducing, investigating, fixing, and verifying a bug.',
    category: 'bugfix',
    placeholders: [
      { key: 'bugDescription', label: 'Bug Description', description: 'What is going wrong? Include error messages if available.' },
      { key: 'expectedBehavior', label: 'Expected Behavior', description: 'What should happen instead?' },
      { key: 'affectedArea', label: 'Affected Area', description: 'Which part of the app is affected (e.g., "login page", "terminal component")' },
    ],
    steps: [
      {
        title: 'Reproduce the bug',
        description: 'Understand how to consistently trigger the bug and document reproduction steps.',
        promptTemplate: 'I have a bug to fix. Description: {bugDescription}. Expected behavior: {expectedBehavior}. Affected area: {affectedArea}. Please analyze the relevant code and help me understand the reproduction steps. What conditions trigger this bug?',
      },
      {
        title: 'Investigate root cause',
        description: 'Trace through the code to find the root cause of the bug.',
        promptTemplate: 'Now investigate the root cause of this bug: {bugDescription}. Read through the relevant source files in {affectedArea}, trace the data flow, and identify exactly where and why the bug occurs. Explain the root cause clearly.',
      },
      {
        title: 'Implement the fix',
        description: 'Write the minimal, targeted fix for the root cause.',
        promptTemplate: 'Based on the root cause analysis, implement a fix for: {bugDescription}. Make the fix as minimal and targeted as possible. Do not refactor unrelated code. Explain what you changed and why.',
      },
      {
        title: 'Add regression test',
        description: 'Write a test that would have caught this bug to prevent regression.',
        promptTemplate: 'Write a regression test for the bug we just fixed: {bugDescription}. The test should fail before the fix and pass after. This prevents the bug from coming back.',
      },
      {
        title: 'Verify the fix',
        description: 'Run tests and verify the fix does not break anything else.',
        promptTemplate: 'Run the test suite to verify our fix for {bugDescription} does not break anything. Check that: 1) The regression test passes, 2) All existing tests still pass, 3) There are no TypeScript errors. Report the results.',
      },
    ],
  },
  {
    id: 'template-refactor',
    name: 'Refactor Code',
    description: 'Safe workflow for analyzing, planning, executing, and verifying a code refactor.',
    category: 'refactor',
    placeholders: [
      { key: 'targetCode', label: 'Code to Refactor', description: 'Which file, module, or pattern to refactor (e.g., "useIDEStore.ts")' },
      { key: 'refactorGoal', label: 'Refactor Goal', description: 'Why refactor? (e.g., "reduce complexity", "improve type safety", "extract shared logic")' },
    ],
    steps: [
      {
        title: 'Analyze current code',
        description: 'Read and understand the code to refactor before making changes.',
        promptTemplate: 'I want to refactor {targetCode}. Goal: {refactorGoal}. Please read the code and provide an analysis: current structure, complexity hotspots, dependencies, and anything that makes refactoring risky. Do NOT change any code yet.',
      },
      {
        title: 'Plan the refactor',
        description: 'Create a step-by-step refactoring plan that minimizes risk.',
        promptTemplate: 'Based on your analysis of {targetCode}, create a detailed refactoring plan for: {refactorGoal}. Break it into small, safe steps. Each step should leave the code in a working state. Identify any breaking changes.',
      },
      {
        title: 'Execute the refactor',
        description: 'Implement the refactoring changes according to the plan.',
        promptTemplate: 'Execute the refactoring plan for {targetCode} step by step. After each step, verify the code still compiles. Goal: {refactorGoal}. Keep changes minimal and focused.',
      },
      {
        title: 'Run all tests',
        description: 'Verify the refactor did not break existing functionality.',
        promptTemplate: 'Run the full test suite to verify our refactoring of {targetCode} did not break anything. If any tests fail, fix them. Also run the TypeScript compiler to check for type errors.',
      },
      {
        title: 'Clean up',
        description: 'Remove dead code, update imports, and ensure consistency.',
        promptTemplate: 'Final cleanup for the refactor of {targetCode}: remove any dead code, unused imports, or leftover comments. Make sure naming is consistent and documentation is updated. Run a final type check.',
      },
    ],
  },
  {
    id: 'template-test',
    name: 'Add Test Coverage',
    description: 'Workflow for identifying coverage gaps and writing comprehensive tests.',
    category: 'test',
    placeholders: [
      { key: 'targetModule', label: 'Module to Test', description: 'File or module to add tests for (e.g., "lib/claude-service.ts")' },
      { key: 'testFramework', label: 'Test Framework', description: 'Which test runner to use (e.g., "jest", "vitest", "playwright")' },
    ],
    steps: [
      {
        title: 'Identify coverage gaps',
        description: 'Analyze the module and find untested code paths and edge cases.',
        promptTemplate: 'Analyze {targetModule} and identify all untested or under-tested code paths. List every function, branch, and edge case that needs test coverage. Check if test files already exist for this module.',
      },
      {
        title: 'Write unit tests',
        description: 'Write unit tests for individual functions and methods.',
        promptTemplate: 'Write unit tests for {targetModule} using {testFramework}. Cover all public functions, handle edge cases (null, undefined, empty arrays, error conditions), and mock external dependencies. Follow existing test patterns in the project.',
      },
      {
        title: 'Write integration tests',
        description: 'Write integration tests that verify components work together.',
        promptTemplate: 'Write integration tests for {targetModule} using {testFramework}. Test how it interacts with its dependencies (not mocked). Cover the main user-facing workflows and verify side effects.',
      },
      {
        title: 'Verify coverage',
        description: 'Run tests with coverage reporting and verify targets are met.',
        promptTemplate: 'Run the tests for {targetModule} with coverage reporting enabled. Report the coverage numbers (statements, branches, functions, lines). If any critical paths are still uncovered, add tests for them.',
      },
    ],
  },
  {
    id: 'template-deploy',
    name: 'Deploy to Production',
    description: 'Step-by-step workflow for building, testing, and deploying changes safely.',
    category: 'deploy',
    placeholders: [
      { key: 'deployTarget', label: 'Deploy Target', description: 'Where to deploy (e.g., "Vercel", "AWS", "production server")' },
      { key: 'branchName', label: 'Branch Name', description: 'Git branch with the changes to deploy' },
    ],
    steps: [
      {
        title: 'Build the project',
        description: 'Run a production build and verify it succeeds without errors.',
        promptTemplate: 'Run a production build of the project (npm run build). Fix any build errors, TypeScript errors, or warnings. Report the build output and bundle size.',
      },
      {
        title: 'Run full test suite',
        description: 'Run all tests to ensure nothing is broken before deploying.',
        promptTemplate: 'Run the complete test suite (npm test). All tests must pass before we deploy. If any tests fail, investigate and fix them. Report the test results.',
      },
      {
        title: 'Create pull request',
        description: 'Open a PR from the feature branch to main for review.',
        promptTemplate: 'Create a pull request from {branchName} to main. Write a clear PR title and description that summarizes all changes included in this deployment. List any breaking changes or migration steps.',
      },
      {
        title: 'Review changes',
        description: 'Do a final review of all changes that will be deployed.',
        promptTemplate: 'Do a final review of all changes in {branchName} that will be deployed to {deployTarget}. Check for: hardcoded secrets, debug logging, TODO comments, performance regressions, and missing error handling. Report any concerns.',
      },
      {
        title: 'Deploy',
        description: 'Execute the deployment and verify it succeeded.',
        promptTemplate: 'Deploy the changes from {branchName} to {deployTarget}. Run the deployment command, monitor for errors, and verify the deployment succeeded by checking the deployed site. Report the deployment status.',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Workflow Engine
// ---------------------------------------------------------------------------

class WorkflowEngine {
  private workflows: Workflow[] = [];
  private loaded = false;

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Return all built-in workflow templates. */
  getTemplates(): WorkflowTemplate[] {
    return BUILTIN_TEMPLATES;
  }

  /** Create a workflow from a built-in template, replacing placeholders. */
  createFromTemplate(templateId: string, params: Record<string, string>): Workflow {
    this.ensureLoaded();

    const template = BUILTIN_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const steps: WorkflowStep[] = template.steps.map((s) => {
      let prompt = s.promptTemplate;
      for (const [key, value] of Object.entries(params)) {
        prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value || `[${key}]`);
      }
      return {
        id: generateStepId(),
        title: s.title,
        description: s.description,
        promptTemplate: prompt,
        status: 'pending' as const,
      };
    });

    // Replace placeholders in template name/description too
    let name = template.name;
    let description = template.description;
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        name = name.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        description = description.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
    }

    const now = new Date();
    const workflow: Workflow = {
      id: generateId(),
      name,
      description,
      category: template.category,
      steps,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      completedSteps: 0,
      totalSteps: steps.length,
    };

    this.addWorkflow(workflow);
    return workflow;
  }

  /** Create a custom workflow with user-defined steps. */
  createCustom(
    name: string,
    description: string,
    steps: Array<Omit<WorkflowStep, 'id' | 'status'>>,
  ): Workflow {
    this.ensureLoaded();

    const workflowSteps: WorkflowStep[] = steps.map((s) => ({
      id: generateStepId(),
      title: s.title,
      description: s.description,
      promptTemplate: s.promptTemplate,
      status: 'pending' as const,
    }));

    const now = new Date();
    const workflow: Workflow = {
      id: generateId(),
      name,
      description,
      category: 'custom',
      steps: workflowSteps,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      completedSteps: 0,
      totalSteps: workflowSteps.length,
    };

    this.addWorkflow(workflow);
    return workflow;
  }

  /** Return all workflows. */
  getWorkflows(): Workflow[] {
    this.ensureLoaded();
    return [...this.workflows];
  }

  /** Return the current active workflow (most recently updated active one). */
  getActiveWorkflow(): Workflow | null {
    this.ensureLoaded();
    const active = this.workflows
      .filter((w) => w.status === 'active')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return active[0] ?? null;
  }

  /** Update the status of a step within a workflow. */
  updateStepStatus(
    workflowId: string,
    stepId: string,
    status: WorkflowStep['status'],
    notes?: string,
  ): void {
    this.ensureLoaded();

    const workflow = this.workflows.find((w) => w.id === workflowId);
    if (!workflow) return;

    const step = workflow.steps.find((s) => s.id === stepId);
    if (!step) return;

    step.status = status;
    if (notes !== undefined) {
      step.notes = notes;
    }
    if (status === 'completed') {
      step.completedAt = new Date();
    }

    workflow.completedSteps = workflow.steps.filter(
      (s) => s.status === 'completed' || s.status === 'skipped',
    ).length;
    workflow.updatedAt = new Date();

    this.saveToStorage();
    this.emitUpdate(workflow);
  }

  /** Mark a workflow as completed. */
  completeWorkflow(workflowId: string): void {
    this.ensureLoaded();

    const workflow = this.workflows.find((w) => w.id === workflowId);
    if (!workflow) return;

    workflow.status = 'completed';
    workflow.updatedAt = new Date();

    this.saveToStorage();
    this.emitUpdate(workflow);
  }

  /** Delete a workflow by ID. */
  deleteWorkflow(workflowId: string): void {
    this.ensureLoaded();

    this.workflows = this.workflows.filter((w) => w.id !== workflowId);

    this.saveToStorage();
    this.emitUpdate(null);
  }

  /** Pause a workflow. */
  pauseWorkflow(workflowId: string): void {
    this.ensureLoaded();

    const workflow = this.workflows.find((w) => w.id === workflowId);
    if (!workflow || workflow.status !== 'active') return;

    workflow.status = 'paused';
    workflow.updatedAt = new Date();

    this.saveToStorage();
    this.emitUpdate(workflow);
  }

  /** Resume a paused workflow. */
  resumeWorkflow(workflowId: string): void {
    this.ensureLoaded();

    const workflow = this.workflows.find((w) => w.id === workflowId);
    if (!workflow || workflow.status !== 'paused') return;

    workflow.status = 'active';
    workflow.updatedAt = new Date();

    this.saveToStorage();
    this.emitUpdate(workflow);
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private addWorkflow(workflow: Workflow): void {
    this.workflows.unshift(workflow);

    // Enforce max limit by removing oldest completed workflows first.
    if (this.workflows.length > MAX_WORKFLOWS) {
      const completedIdx = this.workflows
        .map((w, i) => ({ w, i }))
        .filter(({ w }) => w.status === 'completed')
        .sort((a, b) => a.w.updatedAt.getTime() - b.w.updatedAt.getTime());

      if (completedIdx.length > 0) {
        this.workflows.splice(completedIdx[0].i, 1);
      } else {
        this.workflows.pop();
      }
    }

    this.saveToStorage();
    this.emitUpdate(workflow);
  }

  private emitUpdate(workflow: Workflow | null): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('johnny5:workflowUpdate', { detail: workflow }),
    );
  }

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loadFromStorage();
    this.loaded = true;
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const serialized: SerializedWorkflow[] = this.workflows.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        category: w.category,
        steps: w.steps.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          promptTemplate: s.promptTemplate,
          status: s.status,
          completedAt: s.completedAt ? s.completedAt.toISOString() : undefined,
          notes: s.notes,
        })),
        status: w.status,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
        completedSteps: w.completedSteps,
        totalSteps: w.totalSteps,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    } catch {
      // Storage full or unavailable -- ignore silently.
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: SerializedWorkflow[] = JSON.parse(raw);
      this.workflows = parsed.map((entry) => ({
        id: entry.id,
        name: entry.name,
        description: entry.description,
        category: entry.category,
        steps: entry.steps.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          promptTemplate: s.promptTemplate,
          status: s.status,
          completedAt: s.completedAt ? new Date(s.completedAt) : undefined,
          notes: s.notes,
        })),
        status: entry.status,
        createdAt: new Date(entry.createdAt),
        updatedAt: new Date(entry.updatedAt),
        completedSteps: entry.completedSteps,
        totalSteps: entry.totalSteps,
      }));
    } catch {
      // Corrupted data -- start fresh.
      this.workflows = [];
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: WorkflowEngine | null = null;

export function getWorkflowEngine(): WorkflowEngine {
  if (!instance) {
    instance = new WorkflowEngine();
  }
  return instance;
}

export default WorkflowEngine;
