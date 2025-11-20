/**
 * Skills Service Tests
 * 
 * Tests for Progressive Disclosure Architecture (PDA) implementation
 */

import { SkillsService } from '../skills-service';
import {
  generateSessionSummaryWithSkills,
  executeAgentWithSkills,
  diagnoseErrorWithSkills,
  getSkillsPerformanceMetrics
} from '../skills-integration-utils';

describe('SkillsService', () => {
  let service: SkillsService;

  beforeEach(async () => {
    service = new SkillsService();
    await service.initialize();
  });

  afterEach(() => {
    service.clearCaches();
  });

  describe('Initialization', () => {
    it('should load all skill metadata', () => {
      const skills = service.getAllSkills();
      expect(skills.length).toBeGreaterThan(0);
    });

    it('should load session-summary skill', () => {
      const skills = service.getAllSkills();
      const sessionSummary = skills.find(s => s.id === 'session-summary');
      expect(sessionSummary).toBeDefined();
      expect(sessionSummary?.estimatedTokens).toBe(1500);
    });

    it('should load frontend-engineer skill', () => {
      const skills = service.getAllSkills();
      const frontendEngineer = skills.find(s => s.id === 'frontend-engineer');
      expect(frontendEngineer).toBeDefined();
      expect(frontendEngineer?.estimatedTokens).toBe(2000);
    });

    it('should load error-doctor skill', () => {
      const skills = service.getAllSkills();
      const errorDoctor = skills.find(s => s.id === 'error-doctor');
      expect(errorDoctor).toBeDefined();
      expect(errorDoctor?.estimatedTokens).toBe(1200);
    });
  });

  describe('Category Filtering', () => {
    it('should filter skills by category', () => {
      const agentSkills = service.getSkillsByCategory('agents');
      expect(agentSkills.length).toBeGreaterThan(0);
      agentSkills.forEach(skill => {
        expect(skill.category).toBe('agents');
      });
    });

    it('should filter skills by tag', () => {
      const reactSkills = service.getSkillsByTag('react');
      expect(reactSkills.length).toBeGreaterThan(0);
    });
  });

  describe('Tier 2 Loading', () => {
    it('should load skill instructions', async () => {
      const instructions = await service.loadSkillInstructions('session-summary');
      expect(instructions.skillId).toBe('session-summary');
      expect(instructions.content).toContain('Session Summary Generator');
      expect(instructions.references).toBeDefined();
    });

    it('should cache instructions after first load', async () => {
      // First load
      await service.loadSkillInstructions('session-summary');
      
      // Second load (should be cached)
      const start = Date.now();
      await service.loadSkillInstructions('session-summary');
      const loadTime = Date.now() - start;

      expect(loadTime).toBeLessThan(10); // Should be instant from cache
    });

    it('should extract references from instructions', async () => {
      const instructions = await service.loadSkillInstructions('session-summary');
      expect(instructions.references?.length).toBeGreaterThan(0);
      expect(instructions.references).toContain('summary-template.md');
    });
  });

  describe('Tier 3 Loading', () => {
    it('should load reference files', async () => {
      const reference = await service.loadReference('session-summary', 'summary-template.md');
      expect(reference.skillId).toBe('session-summary');
      expect(reference.referencePath).toBe('summary-template.md');
      expect(reference.content).toContain('Session Summary Template');
      expect(reference.estimatedTokens).toBeGreaterThan(0);
    });

    it('should cache references after first load', async () => {
      // First load
      await service.loadReference('session-summary', 'summary-template.md');
      
      // Second load (should be cached)
      const start = Date.now();
      await service.loadReference('session-summary', 'summary-template.md');
      const loadTime = Date.now() - start;

      expect(loadTime).toBeLessThan(10); // Should be instant from cache
    });
  });

  describe('Skill Execution', () => {
    it('should execute session-summary skill', async () => {
      const result = await service.executeSkill('session-summary', {
        sessionData: {
          duration: 45,
          commandHistory: ['npm install', 'npm run dev'],
          terminalHistory: 'Terminal output here...',
          errors: [],
          files: ['src/App.tsx'],
          activeFile: 'src/App.tsx'
        }
      });

      expect(result.success).toBe(true);
      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should track token usage', async () => {
      const result = await service.executeSkill('frontend-engineer', {
        task: 'Create a Button component',
        projectContext: {
          framework: 'react',
          language: 'typescript'
        },
        deliverables: ['component']
      });

      expect(result.tokensUsed).toBeLessThan(3000); // Should be under 3K tokens
    });
  });

  describe('Performance Metrics', () => {
    it('should record load metrics', async () => {
      await service.loadSkillInstructions('session-summary');
      const metrics = service.getMetrics();
      
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].skillId).toBe('session-summary');
      expect(metrics[0].tier).toBe(2);
    });

    it('should track cache hits', async () => {
      // First load (cache miss)
      await service.loadSkillInstructions('session-summary');
      
      // Second load (cache hit)
      await service.loadSkillInstructions('session-summary');
      
      const metrics = service.getMetrics();
      const cacheHit = metrics.find(m => m.cacheHit === true);
      expect(cacheHit).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', async () => {
      await service.loadSkillInstructions('session-summary');
      await service.loadReference('session-summary', 'summary-template.md');
      
      const stats = service.getCacheStats();
      expect(stats.tier2Size).toBeGreaterThan(0);
      expect(stats.tier3Size).toBeGreaterThan(0);
    });

    it('should clear caches', async () => {
      await service.loadSkillInstructions('session-summary');
      service.clearCaches();
      
      const stats = service.getCacheStats();
      expect(stats.tier2Size).toBe(0);
      expect(stats.tier3Size).toBe(0);
    });
  });

  describe('Preloading', () => {
    it('should preload multiple skills', async () => {
      await service.preloadSkills(['session-summary', 'frontend-engineer']);
      
      const stats = service.getCacheStats();
      expect(stats.tier2Size).toBe(2);
    });
  });
});

describe('Integration Utilities', () => {
  describe('Session Summary Integration', () => {
    it('should generate session summary with reduced tokens', async () => {
      const result = await generateSessionSummaryWithSkills({
        duration: 45,
        commandHistory: Array.from({ length: 100 }, (_, i) => `command ${i}`),
        terminalHistory: Array.from({ length: 5000 }, (_, i) => `line ${i}`).join('\n'),
        errors: [],
        files: ['file1.ts', 'file2.ts'],
        activeFile: 'file1.ts'
      });

      // Should use significantly fewer tokens than before (10,700 → 2,400)
      expect(result.tokensUsed).toBeLessThan(3000);
      expect(result.summary).toContain('Session Data');
    });

    it('should limit terminal history to last N lines', async () => {
      const result = await generateSessionSummaryWithSkills(
        {
          duration: 45,
          commandHistory: ['npm test'],
          terminalHistory: Array.from({ length: 5000 }, (_, i) => `line ${i}`).join('\n'),
          errors: [],
          files: [],
          activeFile: ''
        },
        { maxTerminalLines: 500 }
      );

      // Verify terminal history is limited
      const terminalSection = result.summary.match(/```\n([\s\S]*?)\n```/);
      if (terminalSection) {
        const lines = terminalSection[1].split('\n');
        expect(lines.length).toBeLessThanOrEqual(500);
      }
    });
  });

  describe('Agent Integration', () => {
    it('should execute agent with skills', async () => {
      const result = await executeAgentWithSkills('frontend-engineer', {
        task: 'Create a Button component',
        projectContext: {
          framework: 'react',
          language: 'typescript'
        },
        deliverables: ['component', 'tests']
      });

      expect(result.success).toBe(true);
      expect(result.tokensUsed).toBeLessThan(3000);
    });
  });

  describe('Error Doctor Integration', () => {
    it('should diagnose error with skills', async () => {
      const result = await diagnoseErrorWithSkills({
        error: {
          message: 'Cannot find module "lodash"',
          source: 'terminal'
        },
        recentFiles: ['src/App.tsx'],
        terminalHistory: ['npm install']
      });

      expect(result.diagnosis).toContain('Error Details');
      expect(result.tokensUsed).toBeLessThan(2000);
    });
  });

  describe('Performance Metrics', () => {
    it('should track performance improvements', async () => {
      // Simulate some operations
      await generateSessionSummaryWithSkills({
        duration: 30,
        commandHistory: ['npm test'],
        terminalHistory: 'test output',
        errors: [],
        files: [],
        activeFile: ''
      });

      const metrics = getSkillsPerformanceMetrics();
      expect(metrics.totalTokensSaved).toBeGreaterThan(0);
    });
  });
});

describe('Token Reduction Validation', () => {
  it('should achieve 70%+ token reduction for session summaries', async () => {
    const beforeTokens = 10700; // Current implementation
    
    const result = await generateSessionSummaryWithSkills({
      duration: 45,
      commandHistory: Array.from({ length: 50 }, (_, i) => `cmd${i}`),
      terminalHistory: Array.from({ length: 2000 }, (_, i) => `line${i}`).join('\n'),
      errors: [{ message: 'Error 1' }],
      files: ['file1.ts', 'file2.ts', 'file3.ts'],
      activeFile: 'file1.ts'
    });

    const tokenReduction = ((beforeTokens - result.tokensUsed) / beforeTokens) * 100;
    expect(tokenReduction).toBeGreaterThan(70); // Should achieve 70%+ reduction
  });

  it('should achieve 80%+ token reduction for agent orchestration', async () => {
    const beforeTokens = 30000; // Current AI Agent Orchestrator
    
    const result = await executeAgentWithSkills('frontend-engineer', {
      task: 'Build complete dashboard',
      projectContext: {
        framework: 'react',
        language: 'typescript',
        files: ['App.tsx', 'Dashboard.tsx']
      },
      deliverables: ['components', 'tests', 'styles']
    });

    const tokenReduction = ((beforeTokens - result.tokensUsed) / beforeTokens) * 100;
    expect(tokenReduction).toBeGreaterThan(80); // Should achieve 80%+ reduction
  });
});
