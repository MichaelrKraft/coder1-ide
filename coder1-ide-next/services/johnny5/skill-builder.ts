/**
 * Johnny5 Skill Builder Service
 *
 * Creates, validates, and manages Johnny5 skills.
 * Skills are reusable automation patterns that Johnny5 can execute.
 *
 * Features:
 * - Skill creation from templates
 * - Code generation for skills
 * - Skill validation and testing
 * - Skill versioning and updates
 */

import type { Johnny5Skill } from '@/types/johnny5';

// ================================================================================
// Types
// ================================================================================

export type SkillCategory = 'productivity' | 'research' | 'monitoring' | 'communication' | 'development';
export type SkillTrigger = 'scheduled' | 'event' | 'manual' | 'trend';
export type SkillCreatedBy = 'system' | 'user' | 'self_improvement';

export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  trigger: SkillTrigger;
  codeTemplate: string;
  requiredParams: string[];
  dependencies: string[];
}

export interface SkillValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SkillExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  duration: number;
}

// ================================================================================
// Skill Templates
// ================================================================================

const SKILL_TEMPLATES: SkillTemplate[] = [
  {
    id: 'daily_report',
    name: 'Daily Report Generator',
    description: 'Generate a daily summary report of activity',
    category: 'productivity',
    trigger: 'scheduled',
    requiredParams: ['reportType', 'recipients'],
    dependencies: ['calendar', 'email'],
    codeTemplate: `
async function execute(context) {
  const { reportType, recipients } = context.params;
  const today = new Date().toISOString().split('T')[0];

  // Gather data
  const tasks = await context.api.getTasks({ date: today });
  const commits = await context.api.getGitCommits({ since: today });

  // Generate report
  const report = {
    date: today,
    type: reportType,
    summary: {
      tasksCompleted: tasks.filter(t => t.status === 'completed').length,
      commitsCount: commits.length,
    },
    details: { tasks, commits }
  };

  // Send to recipients
  if (recipients && recipients.length > 0) {
    await context.api.sendNotification({
      to: recipients,
      subject: \`Daily Report - \${today}\`,
      body: JSON.stringify(report, null, 2)
    });
  }

  return report;
}
`,
  },
  {
    id: 'content_repurposer',
    name: 'Content Repurposer',
    description: 'Transform content from one format to another',
    category: 'productivity',
    trigger: 'manual',
    requiredParams: ['sourceContent', 'targetFormat'],
    dependencies: [],
    codeTemplate: `
async function execute(context) {
  const { sourceContent, targetFormat } = context.params;

  const formatPrompts = {
    'twitter_thread': 'Convert this to a Twitter thread with 5-7 tweets, each under 280 characters:',
    'newsletter': 'Transform this into an engaging newsletter format with headline and sections:',
    'linkedin_post': 'Rewrite this as a professional LinkedIn post with relevant hashtags:',
    'blog_outline': 'Create a detailed blog post outline from this content:'
  };

  const prompt = formatPrompts[targetFormat] || 'Summarize and restructure this content:';

  const result = await context.api.aiComplete({
    prompt: \`\${prompt}\\n\\n\${sourceContent}\`,
    maxTokens: 2000
  });

  return {
    original: sourceContent,
    format: targetFormat,
    transformed: result.text
  };
}
`,
  },
  {
    id: 'competitor_monitor',
    name: 'Competitor Monitor',
    description: 'Track competitor updates and announcements',
    category: 'monitoring',
    trigger: 'scheduled',
    requiredParams: ['competitors', 'keywords'],
    dependencies: ['web_search'],
    codeTemplate: `
async function execute(context) {
  const { competitors, keywords } = context.params;
  const alerts = [];

  for (const competitor of competitors) {
    const results = await context.api.webSearch({
      query: \`"\${competitor}" (\${keywords.join(' OR ')}) site:news\`,
      limit: 10,
      dateRange: '24h'
    });

    for (const result of results) {
      alerts.push({
        competitor,
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        foundAt: new Date()
      });
    }
  }

  return { alerts, checkedAt: new Date() };
}
`,
  },
  {
    id: 'auto_test_generator',
    name: 'Auto Test Generator',
    description: 'Generate tests for newly created code',
    category: 'development',
    trigger: 'event',
    requiredParams: ['filePath', 'framework'],
    dependencies: ['file_system'],
    codeTemplate: `
async function execute(context) {
  const { filePath, framework } = context.params;

  // Read the file content
  const fileContent = await context.api.readFile(filePath);

  // Generate tests based on framework
  const testPrompt = framework === 'jest'
    ? 'Generate Jest unit tests for this code. Include edge cases:'
    : 'Generate test cases for this code:';

  const tests = await context.api.aiComplete({
    prompt: \`\${testPrompt}\\n\\n\${fileContent}\`,
    maxTokens: 2000
  });

  // Determine test file path
  const testFilePath = filePath.replace(/\\.([^.]+)$/, '.test.$1');

  return {
    originalFile: filePath,
    testFile: testFilePath,
    tests: tests.text
  };
}
`,
  },
  {
    id: 'trend_alert',
    name: 'Trend Alert',
    description: 'Alert on trending topics in your industry',
    category: 'research',
    trigger: 'trend',
    requiredParams: ['topics', 'threshold'],
    dependencies: ['trend_api'],
    codeTemplate: `
async function execute(context) {
  const { topics, threshold } = context.params;
  const trendingTopics = [];

  for (const topic of topics) {
    const trendData = await context.api.getTrends(topic);

    if (trendData.score >= threshold) {
      trendingTopics.push({
        topic,
        score: trendData.score,
        velocity: trendData.velocity,
        sources: trendData.sources.slice(0, 5)
      });
    }
  }

  if (trendingTopics.length > 0) {
    await context.api.sendAlert({
      type: 'trend',
      title: 'Trending Topics Alert',
      items: trendingTopics
    });
  }

  return { trending: trendingTopics };
}
`,
  },
];

// ================================================================================
// Skill Builder Service
// ================================================================================

class SkillBuilderService {
  private skills: Map<string, Johnny5Skill> = new Map();
  private templates: Map<string, SkillTemplate> = new Map();

  constructor() {
    // Initialize templates
    for (const template of SKILL_TEMPLATES) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * Get all skills
   */
  getAllSkills(): Johnny5Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get skill by ID
   */
  getSkill(id: string): Johnny5Skill | undefined {
    return this.skills.get(id);
  }

  /**
   * Get skills by category
   */
  getSkillsByCategory(category: SkillCategory): Johnny5Skill[] {
    return Array.from(this.skills.values()).filter(s => s.category === category);
  }

  /**
   * Get skills by creator type
   */
  getSkillsByCreator(createdBy: SkillCreatedBy): Johnny5Skill[] {
    return Array.from(this.skills.values()).filter(s => s.createdBy === createdBy);
  }

  /**
   * Create a new skill
   */
  createSkill(skillData: Omit<Johnny5Skill, 'id' | 'createdAt' | 'usageCount' | 'successRate'>): Johnny5Skill {
    const id = `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const skill: Johnny5Skill = {
      ...skillData,
      id,
      createdAt: new Date(),
      usageCount: 0,
      successRate: 0,
    };

    this.skills.set(id, skill);
    return skill;
  }

  /**
   * Create skill from template
   */
  createFromTemplate(
    templateId: string,
    customizations: Partial<Johnny5Skill>
  ): Johnny5Skill | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    return this.createSkill({
      name: customizations.name || template.name,
      description: customizations.description || template.description,
      trigger: customizations.trigger || template.trigger,
      category: customizations.category || template.category,
      createdBy: customizations.createdBy || 'user',
      code: customizations.code || template.codeTemplate,
      dependencies: customizations.dependencies || template.dependencies,
      enabled: customizations.enabled ?? true,
    });
  }

  /**
   * Update an existing skill
   */
  updateSkill(id: string, updates: Partial<Johnny5Skill>): Johnny5Skill | null {
    const skill = this.skills.get(id);
    if (!skill) return null;

    const updated = { ...skill, ...updates };
    this.skills.set(id, updated);
    return updated;
  }

  /**
   * Toggle skill enabled state
   */
  toggleSkill(id: string): Johnny5Skill | null {
    const skill = this.skills.get(id);
    if (!skill) return null;

    skill.enabled = !skill.enabled;
    this.skills.set(id, skill);
    return skill;
  }

  /**
   * Delete a skill
   */
  deleteSkill(id: string): boolean {
    return this.skills.delete(id);
  }

  /**
   * Validate skill code
   */
  validateSkill(skill: Partial<Johnny5Skill>): SkillValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!skill.name || skill.name.trim().length === 0) {
      errors.push('Skill name is required');
    }

    if (!skill.description || skill.description.trim().length === 0) {
      errors.push('Skill description is required');
    }

    if (!skill.trigger) {
      errors.push('Skill trigger type is required');
    }

    if (!skill.category) {
      errors.push('Skill category is required');
    }

    // Check code
    if (skill.code) {
      if (!skill.code.includes('async function execute')) {
        errors.push('Skill code must contain an async execute function');
      }

      if (skill.code.includes('eval(') || skill.code.includes('Function(')) {
        errors.push('Skill code cannot use eval() or Function()');
      }

      // Warnings
      if (skill.code.length > 10000) {
        warnings.push('Skill code is very long. Consider breaking into smaller skills.');
      }

      if (!skill.code.includes('return')) {
        warnings.push('Skill code should return a result');
      }
    }

    // Check dependencies
    if (skill.dependencies && skill.dependencies.length > 10) {
      warnings.push('Skill has many dependencies. This may affect reliability.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate skill code from description
   */
  generateSkillCode(description: string, trigger: SkillTrigger): string {
    // In a real implementation, this would use AI to generate code
    // For now, return a template based on trigger type
    const templates: Record<SkillTrigger, string> = {
      scheduled: `
async function execute(context) {
  // ${description}
  const now = new Date();

  // Your scheduled task logic here
  const result = await context.api.performTask({
    description: "${description}",
    timestamp: now
  });

  return { success: true, result };
}
`,
      event: `
async function execute(context) {
  // ${description}
  const { event, payload } = context;

  // Handle the event
  const processed = await context.api.processEvent({
    type: event,
    data: payload
  });

  return { handled: true, processed };
}
`,
      manual: `
async function execute(context) {
  // ${description}
  const { params } = context;

  // Execute the manual task
  const output = await context.api.runTask({
    description: "${description}",
    params
  });

  return output;
}
`,
      trend: `
async function execute(context) {
  // ${description}
  const { trend, data } = context;

  // Analyze the trend
  const analysis = await context.api.analyzeTrend({
    trend,
    historicalData: data
  });

  return { trend, analysis };
}
`,
    };

    return templates[trigger] || templates.manual;
  }

  /**
   * Get available templates
   */
  getTemplates(): SkillTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Record skill usage
   */
  recordUsage(id: string, success: boolean): void {
    const skill = this.skills.get(id);
    if (!skill) return;

    skill.usageCount++;
    skill.lastUsed = new Date();

    // Update success rate (rolling average)
    const newSuccessRate = success ? 100 : 0;
    skill.successRate = Math.round(
      (skill.successRate * (skill.usageCount - 1) + newSuccessRate) / skill.usageCount
    );

    this.skills.set(id, skill);
  }

  /**
   * Get skill statistics
   */
  getStats(): {
    total: number;
    enabled: number;
    byCategory: Record<SkillCategory, number>;
    byCreator: Record<SkillCreatedBy, number>;
    avgSuccessRate: number;
  } {
    const skills = Array.from(this.skills.values());
    const categories: SkillCategory[] = ['productivity', 'research', 'monitoring', 'communication', 'development'];
    const creators: SkillCreatedBy[] = ['system', 'user', 'self_improvement'];

    const byCategory = {} as Record<SkillCategory, number>;
    const byCreator = {} as Record<SkillCreatedBy, number>;

    for (const cat of categories) {
      byCategory[cat] = skills.filter(s => s.category === cat).length;
    }

    for (const creator of creators) {
      byCreator[creator] = skills.filter(s => s.createdBy === creator).length;
    }

    const totalSuccessRate = skills.reduce((sum, s) => sum + (s.successRate || 0), 0);

    return {
      total: skills.length,
      enabled: skills.filter(s => s.enabled).length,
      byCategory,
      byCreator,
      avgSuccessRate: Math.round(totalSuccessRate / (skills.length || 1)),
    };
  }
}

// Singleton instance
export const skillBuilderService = new SkillBuilderService();

export default skillBuilderService;
