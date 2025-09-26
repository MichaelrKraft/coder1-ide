/**
 * Claude API Wrapper
 * Handles all interactions with Anthropic's Claude API
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');

class ClaudeAPI {
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠️ ANTHROPIC_API_KEY not found in environment');
    }
    
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    });

    this.costTracker = {
      monthlyUsage: 0,
      requestCount: 0,
      lastReset: new Date().getMonth(),
      dailyUsage: {}
    };
    this.loadSettings();
    this.loadCostTracker();
  }

  async loadSettings() {
    try {
      const settingsPath = path.join(__dirname, '..', '..', 'agent-config', 'settings.json');
      const data = await fs.readFile(settingsPath, 'utf8');
      this.settings = JSON.parse(data);
    } catch (error) {
      console.warn('Could not load agent settings, using defaults');
      this.settings = {
        ai: {
          model: 'claude-3-haiku-20240307',
          use_economy_for_simple: true,
          cost_alert_threshold: 10.00
        }
      };
    }
  }

  async loadCostTracker() {
    try {
      const trackerPath = path.join(__dirname, '..', 'data', 'cost-tracker.json');
      const data = await fs.readFile(trackerPath, 'utf8');
      this.costTracker = JSON.parse(data);
      
      const currentMonth = new Date().getMonth();
      if (this.costTracker.lastReset !== currentMonth) {
        this.costTracker.monthlyUsage = 0;
        this.costTracker.requestCount = 0;
        this.costTracker.lastReset = currentMonth;
        this.costTracker.dailyUsage = {};
        await this.saveCostTracker();
      }
    } catch (error) {
      console.log('📊 Initializing cost tracker');
      await this.saveCostTracker();
    }
  }

  async saveCostTracker() {
    try {
      const trackerPath = path.join(__dirname, '..', 'data', 'cost-tracker.json');
      await fs.mkdir(path.dirname(trackerPath), { recursive: true });
      await fs.writeFile(trackerPath, JSON.stringify(this.costTracker, null, 2));
    } catch (error) {
      console.error('Failed to save cost tracker:', error);
    }
  }

  calculateCost(inputTokens, outputTokens, model) {
    const pricing = {
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
      'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
      'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 }
    };

    const rates = pricing[model] || pricing['claude-3-haiku-20240307'];
    return ((inputTokens * rates.input) + (outputTokens * rates.output)) / 1000000;
  }

  async trackUsage(inputTokens, outputTokens, model) {
    const cost = this.calculateCost(inputTokens, outputTokens, model);
    const today = new Date().toISOString().split('T')[0];
    
    this.costTracker.monthlyUsage += cost;
    this.costTracker.requestCount += 1;
    this.costTracker.dailyUsage[today] = (this.costTracker.dailyUsage[today] || 0) + cost;
    
    await this.saveCostTracker();
    
    if (this.costTracker.monthlyUsage > this.settings.ai.cost_alert_threshold) {
      console.warn(`🚨 Cost Alert: Monthly usage ($${this.costTracker.monthlyUsage.toFixed(2)}) exceeds threshold ($${this.settings.ai.cost_alert_threshold})`);
    }
    
    return cost;
  }

  getModel(complexity = 'standard') {
    if (!this.settings.ai) return 'claude-3-haiku-20240307';
    
    if (complexity === 'simple' && this.settings.ai.use_economy_for_simple) {
      return this.settings.ai.model_options?.economy || 'claude-3-haiku-20240307';
    }
    
    return this.settings.ai.model || 'claude-3-haiku-20240307';
  }

  /**
   * Generate a response for a GitHub issue
   */
  async generateIssueResponse(issue) {
    const complexity = this.assessComplexity(issue);
    const model = this.getModel(complexity);
    
    const prompt = `You are a helpful GitHub community manager for Coder1 IDE, an AI-powered development environment with eternal memory features.

Please draft a friendly, helpful response to this GitHub issue:

Issue #${issue.number}
Title: ${issue.title}
Author: @${issue.user.login}
Body: ${issue.body}

Guidelines:
- Be friendly and professional
- Acknowledge the issue clearly
- Provide helpful information or next steps
- If it's a bug, acknowledge it and mention we'll investigate
- If it's a feature request, thank them for the suggestion
- Keep the response concise but thorough
- Don't make promises about specific timelines unless certain
- Sign off warmly

Draft your response:`;

    try {
      const response = await this.client.messages.create({
        model: model,
        max_tokens: this.settings.ai?.max_tokens || 500,
        temperature: this.settings.ai?.temperature || 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // Track usage and cost
      const inputTokens = prompt.length / 4; // Rough estimate
      const outputTokens = response.content[0].text.length / 4;
      const cost = await this.trackUsage(inputTokens, outputTokens, model);
      
      console.log(`💰 Request cost: $${cost.toFixed(4)} (${model})`);

      return {
        text: response.content[0].text,
        confidence: this.calculateConfidence(response.content[0].text),
        cost: cost,
        model: model
      };
    } catch (error) {
      console.error('Claude API error:', error);
      // Fallback to template response
      return this.getFallbackResponse(issue);
    }
  }

  /**
   * Assess the complexity of an issue to choose appropriate model
   */
  assessComplexity(issue) {
    const text = (issue.title + ' ' + issue.body).toLowerCase();
    
    // Simple issues get economy model
    const simplePatterns = [
      /typo|spelling|grammar/,
      /link|broken link/,
      /documentation|docs/,
      /thanks|thank you/,
      /question about|how to/
    ];
    
    if (simplePatterns.some(pattern => pattern.test(text))) {
      return 'simple';
    }
    
    // Complex issues get premium model
    const complexPatterns = [
      /crash|error|exception|stack trace/,
      /performance|slow|memory leak/,
      /security|vulnerability/,
      /data loss|corruption/,
      /feature request.*complex/
    ];
    
    if (complexPatterns.some(pattern => pattern.test(text))) {
      return 'complex';
    }
    
    return 'standard';
  }

  /**
   * Generate a blog post about Coder1
   */
  async generateBlogPost(topic) {
    const prompt = `Write a compelling blog post about Coder1 IDE on the topic: "${topic}"

Key features to potentially highlight:
- Eternal Memory system (7-day trial, $29/month for unlimited)
- Native Claude Code integration
- AI supervision in terminal
- Perfect for both beginners and professionals
- Free forever with optional memory upgrade

Make it informative, engaging, and authentic. About 500 words.`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Claude API error:', error);
      return null;
    }
  }

  /**
   * Calculate confidence score for a response
   */
  calculateConfidence(response) {
    // Simple heuristic - can be improved
    const factors = {
      hasGreeting: /^(hi|hello|thanks|thank you)/i.test(response),
      hasNextSteps: /(will|we'll|next|investigate|look into)/i.test(response),
      appropriateLength: response.length > 50 && response.length < 500,
      professional: !/sorry|apolog/i.test(response) || response.match(/sorry/gi)?.length < 2
    };
    
    const score = Object.values(factors).filter(Boolean).length / Object.keys(factors).length;
    return score;
  }

  /**
   * Fallback template response if API fails
   */
  getFallbackResponse(issue) {
    const isBug = /bug|error|crash|broken/i.test(issue.title + issue.body);
    const isFeature = /feature|request|add|implement/i.test(issue.title + issue.body);
    
    let template = `Thanks for reaching out, @${issue.user.login}! `;
    
    if (isBug) {
      template += `I see you're experiencing an issue with ${issue.title}. We take all bug reports seriously and will investigate this. Could you provide any additional details about your environment (OS, version, etc.) that might help us reproduce this?`;
    } else if (isFeature) {
      template += `Thank you for the feature suggestion! We really appreciate community input on how to make Coder1 better. I've noted this request and we'll consider it for our roadmap.`;
    } else {
      template += `Thank you for your message. We'll review this and get back to you soon with more information.`;
    }
    
    template += `\n\nIf you haven't already, feel free to join our Discord community for faster responses and discussions with other Coder1 users!`;
    
    return {
      text: template,
      confidence: 0.6 // Lower confidence for template
    };
  }
}

module.exports = ClaudeAPI;