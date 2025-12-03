import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';

export interface DetailedRequirements {
  initialRequest: string;
  projectType: string;
  features: string[];
  targetAudience: string;
  techStack: {
    frontend?: string;
    backend?: string;
    database?: string;
    deployment?: string;
  };
  designRequirements: {
    style?: string;
    responsive: boolean;
    accessibility: boolean;
  };
  scope: 'mvp' | 'full-featured' | 'prototype';
  timeline?: string;
  constraints: string[];
  specificGoals: string[];
  conversationHistory: Array<{
    question: string;
    answer: string;
  }>;
}

interface GatheringQuestion {
  id: string;
  question: string;
  purpose: string;
  required: boolean;
}

export class RequirementsGatherer {
  private anthropic: Anthropic;
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor() {
    // Use Z.AI as cost-effective alternative to Anthropic API
    const zaiKey = process.env.ZAI_API_KEY;
    const zaiBaseUrl = process.env.ZAI_BASE_URL || 'https://api.z.ai/api/anthropic';
    
    if (zaiKey) {
      // Use Z.AI (cost-effective, Anthropic-compatible)
      logger.info('💰 Using Z.AI for requirements gathering (cost-free alternative)');
      this.anthropic = new Anthropic({ 
        apiKey: zaiKey,
        baseURL: zaiBaseUrl
      });
    } else {
      // Fallback to Anthropic API if available
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (anthropicKey) {
        logger.info('📋 Using Anthropic API for requirements gathering');
        this.anthropic = new Anthropic({ apiKey: anthropicKey });
      } else {
        throw new Error('Neither ZAI_API_KEY nor ANTHROPIC_API_KEY configured. Please set ZAI_API_KEY in .env.local for cost-free requirements gathering.');
      }
    }
  }

  async gatherRequirements(initialRequest: string): Promise<DetailedRequirements> {
    logger.info(`📋 Starting requirements gathering for: "${initialRequest}"`);

    this.conversationHistory = [];
    const detailedRequirements: Partial<DetailedRequirements> = {
      initialRequest,
      features: [],
      constraints: [],
      specificGoals: [],
      conversationHistory: [],
      techStack: {},
      designRequirements: {
        responsive: true,
        accessibility: true
      }
    };

    const questions = this.generateQuestions(initialRequest);
    
    logger.info(`❓ Generated ${questions.length} strategic questions`);

    for (const q of questions) {
      const answer = await this.askQuestion(q.question, initialRequest);
      
      detailedRequirements.conversationHistory!.push({
        question: q.question,
        answer
      });

      this.extractInformationFromAnswer(answer, detailedRequirements, q.id);
      
      logger.debug(`✅ Processed answer for: ${q.id}`);
    }

    const finalRequirements = await this.synthesizeRequirements(detailedRequirements);
    
    logger.info(`✨ Requirements gathering complete`);
    logger.info(`📊 Project Type: ${finalRequirements.projectType}`);
    logger.info(`🎯 Features: ${finalRequirements.features.length} identified`);
    logger.info(`👥 Audience: ${finalRequirements.targetAudience}`);

    return finalRequirements;
  }

  private generateQuestions(initialRequest: string): GatheringQuestion[] {
    const req = initialRequest.toLowerCase();
    
    const questions: GatheringQuestion[] = [
      {
        id: 'project_type',
        question: 'What type of application are you building? (e.g., web app, REST API, dashboard, mobile app, CLI tool, library)',
        purpose: 'Determine overall project architecture',
        required: true
      },
      {
        id: 'core_features',
        question: 'What are the 3-5 core features you need? Please list the most important functionality.',
        purpose: 'Define scope and prioritize features',
        required: true
      },
      {
        id: 'target_audience',
        question: 'Who will use this application? Describe your target users.',
        purpose: 'Understand user needs and design requirements',
        required: true
      }
    ];

    if (req.includes('web') || req.includes('app') || req.includes('site') || req.includes('dashboard')) {
      questions.push({
        id: 'design_style',
        question: 'Do you have any specific design preferences? (e.g., modern, minimal, colorful, professional)',
        purpose: 'Guide UI/UX implementation',
        required: false
      });
    }

    if (!req.includes('api only') && !req.includes('backend only')) {
      questions.push({
        id: 'tech_stack',
        question: 'Do you have preferred technologies? (e.g., React, Vue, Next.js, Express, FastAPI)',
        purpose: 'Align with existing knowledge or requirements',
        required: false
      });
    }

    questions.push({
      id: 'scope_timeline',
      question: 'Are you looking for an MVP/prototype or a full-featured application?',
      purpose: 'Set realistic expectations and scope',
      required: true
    });

    questions.push({
      id: 'constraints',
      question: 'Are there any specific constraints or requirements? (e.g., must integrate with X API, needs to run on Y platform, accessibility requirements)',
      purpose: 'Identify technical constraints early',
      required: false
    });

    return questions;
  }

  private async askQuestion(question: string, context: string): Promise<string> {
    const systemPrompt = `You are a helpful requirements analyst for a software development project.

The user initially said: "${context}"

Your job is to extract detailed information by asking strategic questions. When the user answers, extract and structure the relevant information clearly.

Be conversational and helpful, but focus on getting specific, actionable details.`;

    this.conversationHistory.push({
      role: 'user',
      content: question
    });

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: this.conversationHistory,
        system: systemPrompt
      });

      const answer = response.content[0].type === 'text' ? response.content[0].text : '';
      
      this.conversationHistory.push({
        role: 'assistant',
        content: answer
      });

      return answer;
    } catch (error) {
      logger.error(`❌ Failed to ask question:`, error);
      return 'No answer provided';
    }
  }

  private extractInformationFromAnswer(
    answer: string,
    requirements: Partial<DetailedRequirements>,
    questionId: string
  ): void {
    const answerLower = answer.toLowerCase();

    switch (questionId) {
      case 'project_type':
        if (answerLower.includes('web app') || answerLower.includes('website')) {
          requirements.projectType = 'web-application';
        } else if (answerLower.includes('api') || answerLower.includes('backend')) {
          requirements.projectType = 'api';
        } else if (answerLower.includes('dashboard')) {
          requirements.projectType = 'dashboard';
        } else if (answerLower.includes('mobile')) {
          requirements.projectType = 'mobile-app';
        } else if (answerLower.includes('cli') || answerLower.includes('command')) {
          requirements.projectType = 'cli-tool';
        } else {
          requirements.projectType = 'web-application'; // default
        }
        break;

      case 'core_features':
        const features = answer
          .split('\n')
          .filter(line => line.trim().length > 0)
          .map(line => line.replace(/^[-*•]\s*/, '').trim())
          .filter(line => line.length > 10);
        
        requirements.features = [...(requirements.features || []), ...features];
        break;

      case 'target_audience':
        requirements.targetAudience = answer.trim();
        break;

      case 'design_style':
        if (!requirements.designRequirements) {
          requirements.designRequirements = { responsive: true, accessibility: true };
        }
        requirements.designRequirements.style = answer.trim();
        break;

      case 'tech_stack':
        if (answerLower.includes('react')) requirements.techStack!.frontend = 'React';
        if (answerLower.includes('vue')) requirements.techStack!.frontend = 'Vue';
        if (answerLower.includes('next')) requirements.techStack!.frontend = 'Next.js';
        if (answerLower.includes('express')) requirements.techStack!.backend = 'Express';
        if (answerLower.includes('fastapi')) requirements.techStack!.backend = 'FastAPI';
        if (answerLower.includes('postgres')) requirements.techStack!.database = 'PostgreSQL';
        if (answerLower.includes('mongodb')) requirements.techStack!.database = 'MongoDB';
        break;

      case 'scope_timeline':
        if (answerLower.includes('mvp') || answerLower.includes('prototype')) {
          requirements.scope = 'mvp';
        } else if (answerLower.includes('full')) {
          requirements.scope = 'full-featured';
        } else {
          requirements.scope = 'mvp'; // default to MVP
        }
        break;

      case 'constraints':
        const constraints = answer
          .split('\n')
          .filter(line => line.trim().length > 0)
          .map(line => line.replace(/^[-*•]\s*/, '').trim())
          .filter(line => line.length > 5);
        
        requirements.constraints = [...(requirements.constraints || []), ...constraints];
        break;
    }
  }

  private async synthesizeRequirements(
    partial: Partial<DetailedRequirements>
  ): Promise<DetailedRequirements> {
    const defaults: DetailedRequirements = {
      initialRequest: partial.initialRequest || '',
      projectType: partial.projectType || 'web-application',
      features: partial.features || [],
      targetAudience: partial.targetAudience || 'General users',
      techStack: partial.techStack || {},
      designRequirements: partial.designRequirements || {
        responsive: true,
        accessibility: true
      },
      scope: partial.scope || 'mvp',
      constraints: partial.constraints || [],
      specificGoals: partial.specificGoals || [],
      conversationHistory: partial.conversationHistory || []
    };

    if (defaults.features.length === 0) {
      defaults.features = [defaults.initialRequest];
    }

    if (!defaults.techStack.frontend && defaults.projectType === 'web-application') {
      defaults.techStack.frontend = 'React';
    }

    if (!defaults.techStack.backend && (defaults.projectType === 'api' || defaults.features.some(f => f.toLowerCase().includes('backend')))) {
      defaults.techStack.backend = 'Express';
    }

    return defaults;
  }

  async getSimplifiedRequirements(initialRequest: string): Promise<DetailedRequirements> {
    logger.info(`⚡ Using simplified requirements extraction for: "${initialRequest}"`);

    const systemPrompt = `Analyze this software development request and extract key information:

Request: "${initialRequest}"

Extract and structure:
1. Project type (web app, API, dashboard, etc.)
2. Core features (3-5 main items)
3. Target audience
4. Suggested tech stack
5. Design style if mentioned
6. Scope (MVP vs full-featured)

Format as structured data.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: systemPrompt
        }]
      });

      const analysis = response.content[0].type === 'text' ? response.content[0].text : '';
      
      const requirements: DetailedRequirements = {
        initialRequest,
        projectType: this.extractProjectType(analysis),
        features: this.extractFeatures(analysis),
        targetAudience: this.extractTargetAudience(analysis),
        techStack: this.extractTechStack(analysis),
        designRequirements: {
          responsive: true,
          accessibility: true,
          style: this.extractDesignStyle(analysis)
        },
        scope: this.extractScope(analysis),
        constraints: [],
        specificGoals: [],
        conversationHistory: [{
          question: 'Automated analysis',
          answer: analysis
        }]
      };

      logger.info(`✨ Simplified requirements extracted`);
      return requirements;

    } catch (error) {
      logger.error(`❌ Failed to extract simplified requirements:`, error);
      
      return {
        initialRequest,
        projectType: 'web-application',
        features: [initialRequest],
        targetAudience: 'General users',
        techStack: { frontend: 'React', backend: 'Express' },
        designRequirements: { responsive: true, accessibility: true },
        scope: 'mvp',
        constraints: [],
        specificGoals: [],
        conversationHistory: []
      };
    }
  }

  private extractProjectType(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('api') || lower.includes('backend')) return 'api';
    if (lower.includes('dashboard')) return 'dashboard';
    if (lower.includes('mobile')) return 'mobile-app';
    return 'web-application';
  }

  private extractFeatures(text: string): string[] {
    const lines = text.split('\n');
    const features: string[] = [];
    
    for (const line of lines) {
      if (line.match(/^[-*•]\s*/) && line.length > 10) {
        features.push(line.replace(/^[-*•]\s*/, '').trim());
      }
    }
    
    return features.length > 0 ? features : ['Core functionality'];
  }

  private extractTargetAudience(text: string): string {
    const match = text.match(/target\s+audience:?\s*([^\n]+)/i);
    return match ? match[1].trim() : 'General users';
  }

  private extractTechStack(text: string): DetailedRequirements['techStack'] {
    const lower = text.toLowerCase();
    const stack: DetailedRequirements['techStack'] = {};
    
    if (lower.includes('react')) stack.frontend = 'React';
    if (lower.includes('vue')) stack.frontend = 'Vue';
    if (lower.includes('next')) stack.frontend = 'Next.js';
    if (lower.includes('express')) stack.backend = 'Express';
    if (lower.includes('fastapi')) stack.backend = 'FastAPI';
    if (lower.includes('postgres')) stack.database = 'PostgreSQL';
    if (lower.includes('mongodb')) stack.database = 'MongoDB';
    
    return stack;
  }

  private extractDesignStyle(text: string): string | undefined {
    const match = text.match(/design:?\s*([^\n]+)/i);
    return match ? match[1].trim() : undefined;
  }

  private extractScope(text: string): 'mvp' | 'full-featured' | 'prototype' {
    const lower = text.toLowerCase();
    if (lower.includes('mvp') || lower.includes('prototype')) return 'mvp';
    if (lower.includes('full-featured') || lower.includes('complete')) return 'full-featured';
    return 'mvp';
  }
}

let gathererInstance: RequirementsGatherer | null = null;

export function getRequirementsGatherer(): RequirementsGatherer {
  if (!gathererInstance) {
    gathererInstance = new RequirementsGatherer();
  }
  return gathererInstance;
}
