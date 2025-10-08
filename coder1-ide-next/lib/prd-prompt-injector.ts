/**
 * PRD Prompt Injector
 * 
 * Formats Product Requirements Documents into optimal Claude Code prompts
 * for seamless handoff from PRD Generator to IDE
 */

export interface PRDHandoffData {
  prdContent: string;
  productName: string;
  patterns?: string[];
  sessionId?: string;
}

export interface FormattedPrompt {
  prompt: string;
  contextSummary: string;
  recommendedFirstSteps: string[];
}

/**
 * Format PRD content into an optimal Claude Code prompt
 */
export function formatPRDPrompt(handoffData: PRDHandoffData): FormattedPrompt {
  const { prdContent, productName, patterns } = handoffData;
  
  // Extract key sections from PRD for summary
  const contextSummary = extractContextSummary(prdContent, productName);
  
  // Generate recommended first steps based on PRD content
  const recommendedFirstSteps = generateRecommendedSteps(prdContent, patterns);
  
  // Build the complete Claude prompt
  const prompt = buildClaudePrompt(prdContent, productName, patterns, recommendedFirstSteps);
  
  return {
    prompt,
    contextSummary,
    recommendedFirstSteps
  };
}

/**
 * Extract a concise summary of the PRD for context display
 */
function extractContextSummary(prdContent: string, productName: string): string {
  // Extract executive summary or first meaningful paragraph
  const summaryMatch = prdContent.match(/## Executive Summary\s+([\s\S]*?)(?=\n##|$)/i);
  
  if (summaryMatch && summaryMatch[1]) {
    return summaryMatch[1].trim().substring(0, 300) + '...';
  }
  
  // Fallback: Use first paragraph
  const firstParagraph = prdContent.split('\n\n')[0];
  return firstParagraph.substring(0, 200) + '...';
}

/**
 * Generate recommended first steps based on PRD analysis
 */
function generateRecommendedSteps(prdContent: string, patterns?: string[]): string[] {
  const steps: string[] = [];
  
  // Check for tech stack mentions
  if (prdContent.toLowerCase().includes('react') || prdContent.toLowerCase().includes('next.js')) {
    steps.push('Initialize Next.js project with TypeScript');
  } else if (prdContent.toLowerCase().includes('node') || prdContent.toLowerCase().includes('express')) {
    steps.push('Initialize Node.js/Express backend');
  }
  
  // Check for database mentions
  if (prdContent.toLowerCase().includes('database') || prdContent.toLowerCase().includes('postgresql')) {
    steps.push('Set up database schema and migrations');
  }
  
  // Check for API mentions
  if (prdContent.toLowerCase().includes('api') || prdContent.toLowerCase().includes('endpoint')) {
    steps.push('Design and implement core API endpoints');
  }
  
  // Check for authentication
  if (prdContent.toLowerCase().includes('auth') || prdContent.toLowerCase().includes('login')) {
    steps.push('Implement authentication system');
  }
  
  // Pattern-specific steps
  if (patterns && patterns.length > 0) {
    if (patterns.some(p => p.toLowerCase().includes('saas'))) {
      steps.push('Set up subscription/billing infrastructure');
    }
    if (patterns.some(p => p.toLowerCase().includes('marketplace'))) {
      steps.push('Create vendor/buyer matching system');
    }
  }
  
  // Default steps if none detected
  if (steps.length === 0) {
    steps.push(
      'Review PRD and plan architecture',
      'Set up project structure',
      'Implement core features from MVP section'
    );
  }
  
  return steps.slice(0, 5); // Limit to 5 steps
}

/**
 * Build the complete Claude Code prompt
 */
function buildClaudePrompt(
  prdContent: string,
  productName: string,
  patterns?: string[],
  recommendedSteps?: string[]
): string {
  const patternsText = patterns && patterns.length > 0 
    ? `\n\n**Selected Patterns:** ${patterns.join(', ')}`
    : '';
  
  const stepsText = recommendedSteps && recommendedSteps.length > 0
    ? `\n\n**Recommended First Steps:**\n${recommendedSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`
    : '';
  
  return `I have a complete Product Requirements Document for "${productName}" that I'd like to implement.${patternsText}

Here is the full PRD:

---

${prdContent}

---

${stepsText}

Please help me implement this project step by step. Let's start by:
1. Reviewing the PRD together to ensure we understand all requirements
2. Planning the technical architecture and tech stack
3. Setting up the initial project structure
4. Implementing the core features systematically

I'm ready to begin when you are!`;
}

/**
 * Auto-inject formatted prompt into terminal
 * This should be called from the IDE page when a PRD handoff is detected
 */
export function injectPRDPromptIntoTerminal(
  terminalElement: HTMLElement | null,
  formattedPrompt: FormattedPrompt
): void {
  if (!terminalElement) {
    console.warn('Terminal element not found for prompt injection');
    return;
  }
  
  // Create a pre-filled command but don't execute it
  // User will see it and can press Enter when ready
  const event = new CustomEvent('terminal:inject-text', {
    detail: {
      text: `claude "${formattedPrompt.prompt.replace(/"/g, '\\"')}"`
    }
  });
  
  window.dispatchEvent(event);
  
  console.log('✨ PRD prompt injected into terminal:', {
    productName: formattedPrompt.contextSummary.substring(0, 50),
    promptLength: formattedPrompt.prompt.length,
    stepsCount: formattedPrompt.recommendedFirstSteps.length
  });
}

/**
 * Create session metadata for PRD handoff
 */
export function createPRDSessionMetadata(handoffData: PRDHandoffData): any {
  return {
    sessionType: 'prd-implementation',
    context: {
      source: 'smart-prd-generator',
      productName: handoffData.productName,
      patterns: handoffData.patterns || [],
      originalPRDSessionId: handoffData.sessionId,
      prdContent: handoffData.prdContent,
      handoffTimestamp: new Date().toISOString()
    },
    tags: ['prd-implementation', ...(handoffData.patterns || [])],
    progress: {
      status: 'planning',
      completionPercentage: 0,
      milestones: []
    }
  };
}
