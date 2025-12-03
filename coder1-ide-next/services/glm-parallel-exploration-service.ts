/**
 * GLM Parallel Exploration Service
 * 
 * GLM-4.6 adapter for ParallelExplorationService.
 * Provides cost-effective alternative to Claude API (30x cheaper at $0.10/M tokens).
 * 
 * Key Differences from Claude:
 * - No prompt caching (but still cheaper overall)
 * - Single model (glm-4.6) with temperature variation for budget tiers
 * - OpenAI-compatible API format
 */

import { ParallelExplorationService, ParallelExplorationConfig, ExplorationStrategy } from './parallel-exploration-service';
import { GLMAPIClient, GLMMessage } from '@/lib/glm-api';

// Global type declaration for singleton persistence across Next.js API routes
declare global {
  var __PARALLEL_EXPLORATION_SERVICE__: ParallelExplorationService | undefined;
}

export class GLMParallelExplorationService extends ParallelExplorationService {
  private glmClient: GLMAPIClient;

  // Temperature mapping for budget tiers (all use glm-4.6 model)
  private temperatureByBudget = {
    'cost-optimized': 0.6,    // Faster, more deterministic responses
    'balanced': 0.8,           // Good balance of creativity and consistency
    'quality-optimized': 0.95  // More creative and diverse outputs
  };

  constructor(apiKey?: string) {
    super();
    console.log('[GLMService] 🔑 Initializing with API key:', apiKey ? 'PROVIDED' : 'FROM_ENV');
    this.glmClient = new GLMAPIClient(apiKey);
    
    if (!this.glmClient.isConfigured()) {
      throw new Error('GLM_API_KEY not configured. Please provide API key or add it to your .env.local file.');
    }
    console.log('[GLMService] ✅ GLM client configured successfully');
  }

  /**
   * Override: Skip cache warming for GLM (not supported)
   * GLM doesn't have prompt caching, but it's still 30x cheaper than Claude
   */
  protected async warmCache(task: string, domain: string): Promise<void> {
    // GLM doesn't support prompt caching - skip this step
    // Still cost-effective: $0.10/M vs Claude's $3-15/M tokens
    console.log('[GLM] Skipping cache warming (not supported, but still cost-effective)');
    return Promise.resolve();
  }

  /**
   * Override: Generate strategies using GLM-4.6
   */
  protected async generateStrategies(options: {
    task: string;
    domain: string;
    count: number;
    budget: 'cost-optimized' | 'balanced' | 'quality-optimized';
  }): Promise<ExplorationStrategy[]> {
    const { task, domain, count, budget } = options;
    const temperature = this.temperatureByBudget[budget];

    console.log(`[GLM] Generating ${count} strategies with temperature ${temperature}`);

    const systemPrompt = `You are an AI orchestrator for parallel exploration. Your role is to generate ${count} DISTINCT strategies for solving a development task.

Each strategy must be FUNDAMENTALLY DIFFERENT from the others across these dimensions:
1. Primary approach (architecture, framework, paradigm)
2. Technology choices (libraries, tools, patterns)
3. Implementation philosophy (complexity, optimization target)
4. Target audience (developers, users, scale)

Domain: ${domain}

Return a JSON array of ${count} strategy objects with this exact structure:
{
  "strategies": [
    {
      "id": "strategy-1",
      "name": "Brief Strategy Name",
      "primaryDimension": {
        "axis": "Architecture|Framework|Paradigm|Pattern",
        "value": "Specific approach"
      },
      "secondaryDimension": {
        "axis": "Optimization|Complexity|Scale|UX",
        "value": "Specific characteristic"
      },
      "distinctiveElements": ["element1", "element2", "element3"],
      "targetAudience": "Who this approach serves best",
      "resources": ["Required libraries", "Tools", "Dependencies"]
    }
  ]
}

CRITICAL: Each strategy must be MAXIMALLY DIFFERENT. No overlap in technology stack or approach.`;

    const messages: GLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Task: ${task}\n\nGenerate ${count} completely different strategies.` }
    ];

    try {
      const response = await this.glmClient.chat(messages, {
        model: 'glm-4.6',
        temperature,
        max_tokens: 4000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from GLM API');
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in GLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const strategies = parsed.strategies || [];

      if (strategies.length < count) {
        throw new Error(`GLM generated only ${strategies.length} strategies, expected ${count}`);
      }

      console.log(`[GLM] Successfully generated ${strategies.length} strategies`);
      console.log(`[GLM] Cost: ~$${(response.usage.total_tokens / 1_000_000 * 0.10).toFixed(4)}`);

      return strategies.slice(0, count);

    } catch (error) {
      console.error('[GLM] Strategy generation failed:', error);
      throw new Error(`Failed to generate strategies: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Override: Detect domain using GLM-4.6 (optional - can also use parent's keyword matching)
   */
  protected async detectDomain(task: string, providedDomain?: string): Promise<{ domain: string; confidence: number }> {
    if (providedDomain) {
      return { domain: providedDomain, confidence: 1.0 };
    }

    // Use GLM for intelligent domain detection
    const messages: GLMMessage[] = [
      {
        role: 'system',
        content: `You are a domain classifier. Analyze the task and classify it into one of these domains:
- frontend-ui-design
- backend-architecture
- database-design
- api-development
- mobile-development
- devops-infrastructure
- data-science
- general-software-engineering

Return JSON: {"domain": "domain-name", "confidence": 0.0-1.0}`
      },
      {
        role: 'user',
        content: `Classify this task: ${task}`
      }
    ];

    try {
      const response = await this.glmClient.chat(messages, {
        model: 'glm-4.6',
        temperature: 0.3, // Low temperature for consistent classification
        max_tokens: 100
      });

      const content = response.choices[0]?.message?.content;
      const jsonMatch = content?.match(/\{[\s\S]*?\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`[GLM] Domain detected: ${parsed.domain} (confidence: ${parsed.confidence})`);
        return parsed;
      }
    } catch (error) {
      console.warn('[GLM] Domain detection failed, falling back to keyword matching');
    }

    // Fallback to parent's keyword matching
    return super.detectDomain(task, providedDomain);
  }
}

// NOTE: Using global.__PARALLEL_EXPLORATION_SERVICE__ instead of module-level variable
// to persist across Next.js API route module reloads (see agent-terminal-manager.ts for pattern)

/**
 * Factory function to create the appropriate service based on configuration
 * @param apiKey - Optional API key from client-side storage
 * @param provider - Optional provider ('glm' or 'anthropic')
 */
export function createParallelExplorationService(
  apiKey?: string, 
  provider?: 'glm' | 'anthropic'
): ParallelExplorationService {
  console.log('[Service Factory] 🏭 Creating service:', { 
    provider, 
    hasApiKey: !!apiKey, 
    hasGlobalSingleton: !!global.__PARALLEL_EXPLORATION_SERVICE__ 
  });
  
  // Return existing global singleton if available (survives module reloads)
  if (global.__PARALLEL_EXPLORATION_SERVICE__) {
    console.log('[Service Factory] ♻️ Returning existing global singleton');
    return global.__PARALLEL_EXPLORATION_SERVICE__;
  }
  
  let instance: ParallelExplorationService;
  
  // Create new instance based on provider
  if (provider === 'glm' && apiKey) {
    console.log('[Service Factory] ✅ Creating GLM service with client-provided API key');
    instance = new GLMParallelExplorationService(apiKey);
  } else if (provider === 'anthropic' && apiKey) {
    console.log('[Service Factory] ✅ Creating Anthropic service with client-provided API key');
    instance = new ParallelExplorationService(apiKey);
  } else {
    // Fallback to environment-based detection
    const useGLM = process.env.USE_GLM_BACKEND === 'true' || 
                   (!process.env.ANTHROPIC_API_KEY && process.env.GLM_API_KEY);

    if (useGLM) {
      try {
        console.log('[Service Factory] Creating GLM Parallel Exploration Service from env ($0.10/M tokens)');
        instance = new GLMParallelExplorationService();
      } catch (error) {
        console.warn('[Service Factory] GLM service creation failed, falling back to Claude');
        console.warn(error);
        instance = new ParallelExplorationService();
      }
    } else {
      console.log('[Service Factory] Creating Claude Parallel Exploration Service ($3-15/M tokens)');
      instance = new ParallelExplorationService();
    }
  }
  
  // Store in global registry (survives Next.js module reloads)
  global.__PARALLEL_EXPLORATION_SERVICE__ = instance;
  console.log('[Service Factory] 🌍 Registered service in global registry');
  
  return instance;
}

/**
 * Get the current singleton instance (used by status endpoint)
 */
export function getParallelExplorationService(): ParallelExplorationService {
  if (!global.__PARALLEL_EXPLORATION_SERVICE__) {
    throw new Error('No service instance available. Call createParallelExplorationService first.');
  }
  console.log('[Service Factory] ✅ Retrieved service from global registry');
  return global.__PARALLEL_EXPLORATION_SERVICE__;
}
