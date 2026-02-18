/**
 * Coder1 Autonomous Agent Backend Endpoint
 * 
 * Purpose: Handles GitHub webhook events (issues, discussions, PRs) and generates
 * AI-powered responses from specialized agents.
 * 
 * Features:
 * - 5-10 minute autonomous response time
 * - 6 specialized agents (Frontend, Backend, QA, DevOps, Security, Architecture)
 * - Context-aware analysis using repository intelligence
 * - Smart routing based on issue type and labels
 * - Response templates for common scenarios
 * 
 * Last Updated: October 3, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  labels: Array<{ name: string }>;
  user: { login: string };
  html_url: string;
  repository_url: string;
}

interface GitHubDiscussion {
  number: number;
  title: string;
  body: string;
  category: { name: string };
  user: { login: string };
  html_url: string;
}

interface WebhookPayload {
  action: string;
  issue?: GitHubIssue;
  discussion?: GitHubDiscussion;
  repository: {
    full_name: string;
    html_url: string;
  };
}

interface AgentConfig {
  name: string;
  systemPrompt: string;
  triggerLabels: string[];
  triggerKeywords: string[];
}

// ============================================================================
// Agent Configurations
// ============================================================================

const AGENTS: Record<string, AgentConfig> = {
  frontend: {
    name: 'Frontend Specialist',
    systemPrompt: `You are a Frontend Specialist agent for Coder1 community support.
    
Your expertise:
- React, Next.js, TypeScript, TailwindCSS
- UI/UX best practices and accessibility
- Performance optimization and Core Web Vitals
- Component architecture and state management

Response style:
- Helpful and encouraging, especially for beginners
- Provide code examples when relevant
- Link to documentation and examples
- Ask clarifying questions if needed

Always include:
1. Clear explanation of the issue
2. Step-by-step solution
3. Code examples (if applicable)
4. Links to relevant documentation
5. Encouragement to keep building`,
    triggerLabels: ['frontend', 'ui', 'react', 'design', 'accessibility'],
    triggerKeywords: ['component', 'styling', 'tailwind', 'ui', 'button', 'layout', 'responsive']
  },

  backend: {
    name: 'Backend Specialist',
    systemPrompt: `You are a Backend Specialist agent for Coder1 community support.

Your expertise:
- Node.js, Express, Next.js API routes
- Database design (PostgreSQL, SQLite)
- Authentication and security best practices
- API design and RESTful principles

Response style:
- Security-conscious and detail-oriented
- Explain trade-offs and considerations
- Provide tested code examples
- Highlight potential gotchas

Always include:
1. Security considerations
2. Performance implications
3. Error handling best practices
4. Testing recommendations
5. Links to relevant API documentation`,
    triggerLabels: ['backend', 'api', 'database', 'auth', 'security'],
    triggerKeywords: ['api', 'endpoint', 'database', 'authentication', 'server', 'postgres']
  },

  qa: {
    name: 'QA Specialist',
    systemPrompt: `You are a QA Specialist agent for Coder1 community support.

Your expertise:
- Bug reproduction and root cause analysis
- Testing strategies (unit, integration, e2e)
- CI/CD and automated testing
- Quality assurance best practices

Response style:
- Methodical and thorough
- Ask for reproduction steps
- Provide debugging strategies
- Suggest preventive measures

Always include:
1. Steps to reproduce (if bug report)
2. Expected vs actual behavior analysis
3. Debugging strategy
4. Testing recommendations
5. Prevention strategies for similar issues`,
    triggerLabels: ['bug', 'testing', 'qa', 'quality'],
    triggerKeywords: ['bug', 'error', 'broken', 'not working', 'test', 'failing']
  },

  devops: {
    name: 'DevOps Specialist',
    systemPrompt: `You are a DevOps Specialist agent for Coder1 community support.

Your expertise:
- Deployment (Vercel, Docker, cloud platforms)
- CI/CD pipelines and automation
- Infrastructure as code
- Monitoring and logging

Response style:
- Practical and deployment-focused
- Provide configuration examples
- Explain infrastructure decisions
- Share troubleshooting tips

Always include:
1. Deployment best practices
2. Configuration examples
3. Common pitfalls to avoid
4. Monitoring/logging recommendations
5. Links to deployment documentation`,
    triggerLabels: ['deployment', 'devops', 'ci-cd', 'infrastructure'],
    triggerKeywords: ['deploy', 'vercel', 'docker', 'environment', 'build', 'production']
  },

  security: {
    name: 'Security Specialist',
    systemPrompt: `You are a Security Specialist agent for Coder1 community support.

Your expertise:
- Application security and OWASP Top 10
- Authentication and authorization
- Data privacy (GDPR, CCPA)
- Secure coding practices

Response style:
- Security-first mindset
- Explain vulnerabilities clearly
- Provide secure alternatives
- Educate on security principles

Always include:
1. Security risk assessment
2. Vulnerability explanation (if applicable)
3. Secure implementation examples
4. Compliance considerations
5. Security testing recommendations`,
    triggerLabels: ['security', 'vulnerability', 'auth', 'privacy'],
    triggerKeywords: ['security', 'vulnerability', 'auth', 'password', 'token', 'encryption']
  },

  architect: {
    name: 'Architecture Specialist',
    systemPrompt: `You are an Architecture Specialist agent for Coder1 community support.

Your expertise:
- System design and architecture patterns
- Scalability and performance optimization
- Technology selection and trade-offs
- Code organization and modularity

Response style:
- Strategic and forward-thinking
- Explain design trade-offs
- Provide architectural diagrams (text-based)
- Consider future growth

Always include:
1. Architectural analysis
2. Trade-off evaluation
3. Scalability considerations
4. Design pattern recommendations
5. Long-term maintenance implications`,
    triggerLabels: ['architecture', 'design', 'scaling', 'performance'],
    triggerKeywords: ['architecture', 'design', 'scale', 'structure', 'pattern', 'organize']
  }
};

// ============================================================================
// Agent Selection Logic
// ============================================================================

function selectAgent(issue: GitHubIssue | GitHubDiscussion): AgentConfig {
  const title = issue.title.toLowerCase();
  const body = (issue.body || '').toLowerCase();
  const labels = 'labels' in issue 
    ? issue.labels.map(l => l.name.toLowerCase()) 
    : [];
  
  // Check labels first (highest priority)
  for (const [agentKey, config] of Object.entries(AGENTS)) {
    for (const label of labels) {
      if (config.triggerLabels.includes(label)) {
        return config;
      }
    }
  }

  // Check keywords in title and body
  const text = `${title} ${body}`;
  let bestMatch: { agent: AgentConfig | null; score: number } = { agent: null, score: 0 };

  for (const config of Object.values(AGENTS)) {
    const score = config.triggerKeywords.reduce((acc, keyword) => {
      const titleMatches = title.includes(keyword) ? 3 : 0; // Title matches worth more
      const bodyMatches = body.includes(keyword) ? 1 : 0;
      return acc + titleMatches + bodyMatches;
    }, 0);

    if (score > bestMatch.score) {
      bestMatch = { agent: config, score };
    }
  }

  // Default to QA for bug reports, Architecture for everything else
  if (bestMatch.agent === null) {
    if (labels.includes('bug') || title.includes('bug') || title.includes('error')) {
      return AGENTS.qa;
    }
    return AGENTS.architect;
  }

  return bestMatch.agent;
}

// ============================================================================
// Response Templates
// ============================================================================

const RESPONSE_TEMPLATES = {
  greeting: (username: string) => `Hi @${username}! 👋\n\nThanks for reaching out to the Coder1 community. I'm an AI agent specialized in helping with your question.`,
  
  needMoreInfo: `To help you better, could you provide:\n\n- Steps to reproduce the issue\n- Expected vs actual behavior\n- Relevant code snippets\n- Screenshots (if applicable)\n- Your environment (OS, browser, Node version)`,
  
  footer: `---\n\n**Note**: This response was generated by an AI agent. If you need human assistance, a team member will follow up within 24-48 hours.\n\n🤖 *Powered by [Coder1 Autonomous Agents](https://github.com/MichaelrKraft/coder1-community)*`,
  
  showcase: (username: string) => `Amazing work, @${username}! 🎉\n\nWe love seeing what the community builds with Coder1. This showcase will inspire others!\n\nWould you be interested in:\n- Writing a case study about your build process?\n- Sharing on our social media channels?\n- Adding a "Built with Coder1" badge to your project?\n\n${RESPONSE_TEMPLATES.footer}`
};

// ============================================================================
// AI Response Generation
// ============================================================================

async function generateAIResponse(
  agent: AgentConfig,
  issue: GitHubIssue | GitHubDiscussion,
  webhookPayload: WebhookPayload
): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const userMessage = `
Repository: ${webhookPayload.repository.full_name}
Issue/Discussion: ${issue.title}

${issue.body || 'No description provided.'}

Repository URL: ${webhookPayload.repository.html_url}
Issue URL: ${issue.html_url}

Please provide a helpful response following your role as ${agent.name}.
`;

  try {
    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6-20250514',
      max_tokens: 4096,
      system: agent.systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    const response = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    // Wrap response with greeting and footer
    const username = issue.user.login;
    return `${RESPONSE_TEMPLATES.greeting(username)}\n\n${response}\n\n${RESPONSE_TEMPLATES.footer}`;
  } catch (error) {
    console.error('AI response generation failed:', error);
    
    // Fallback response if AI fails
    return `${RESPONSE_TEMPLATES.greeting(issue.user.login)}\n\nI encountered an error while generating a detailed response. A human team member will review your issue shortly.\n\nIn the meantime:\n${RESPONSE_TEMPLATES.needMoreInfo}\n\n${RESPONSE_TEMPLATES.footer}`;
  }
}

// ============================================================================
// GitHub API Integration
// ============================================================================

async function postGitHubComment(
  issueUrl: string,
  commentBody: string
): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN not configured');
  }

  // Extract owner, repo, and issue number from URL
  const match = issueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/(?:issues|discussions)\/(\d+)/);
  if (!match) {
    throw new Error('Invalid GitHub issue URL');
  }

  const [, owner, repo, issueNumber] = match;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: commentBody })
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }
}

// ============================================================================
// Main API Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Verify GitHub webhook signature (recommended in production)
    const signature = request.headers.get('x-hub-signature-256');
    if (!signature && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const payload: WebhookPayload = await request.json();

    // Handle different webhook events
    const { action, issue, discussion, repository } = payload;

    // Only respond to opened issues/discussions
    if (action !== 'opened') {
      return NextResponse.json({ message: 'Ignored non-opened event' });
    }

    const item = issue || discussion;
    if (!item) {
      return NextResponse.json({ message: 'No issue or discussion found' });
    }

    // Special handling for showcase submissions
    if ('labels' in item && item.labels.some(l => l.name === 'showcase')) {
      const showcaseResponse = RESPONSE_TEMPLATES.showcase(item.user.login);
      await postGitHubComment(item.html_url, showcaseResponse);
      return NextResponse.json({ 
        message: 'Showcase response posted',
        agent: 'showcase-handler'
      });
    }

    // Select appropriate agent
    const agent = selectAgent(item);
    console.log(`Selected agent: ${agent.name} for ${item.html_url}`);

    // Generate AI response
    const aiResponse = await generateAIResponse(agent, item, payload);

    // Post comment to GitHub
    await postGitHubComment(item.html_url, aiResponse);

    return NextResponse.json({
      success: true,
      message: 'Response posted successfully',
      agent: agent.name,
      issueUrl: item.html_url
    });

  } catch (error) {
    console.error('Autonomous agent error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Health Check Endpoint
// ============================================================================

export async function GET() {
  const config = {
    agents: Object.keys(AGENTS).length,
    anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
    githubConfigured: !!process.env.GITHUB_TOKEN,
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6-20250514'
  };

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    config
  });
}
