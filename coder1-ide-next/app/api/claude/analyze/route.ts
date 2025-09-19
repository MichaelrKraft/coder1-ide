import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { input } = await request.json();

    if (!input) {
      return NextResponse.json(
        { error: 'Input is required' },
        { status: 400 }
      );
    }

    // Get API key from server-side environment
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    
    if (!apiKey) {
      logger.warn('No API key configured, using mock response');
      // Return mock response if no API key
      return NextResponse.json({
        isTeamSuggestion: false,
        response: 'I understand your request. Let me help with that.',
        memoryInsights: []
      });
    }

    const systemPrompt = `You are an AI agent orchestrator for Coder1 IDE. Analyze user requests and determine:
1. If the task requires a single agent or a team of agents
2. What type of agents would be best suited
3. The complexity and estimated time
4. Relevant insights from development patterns

For complex tasks (building apps, full features, multi-step workflows), suggest a team.
For simple tasks (fix bug, add comment, explain code), suggest a single agent.

Respond in JSON format:
{
  "isTeamSuggestion": boolean,
  "response": "string - your response to the user",
  "teamSuggestion": {
    "triggered": boolean,
    "reason": "why a team is needed",
    "confidence": 0.0-1.0,
    "recommendedTeam": {
      "name": "Team name",
      "agents": ["agent1", "agent2", ...],
      "description": "What this team does"
    },
    "benefits": ["benefit1", "benefit2", ...]
  },
  "memoryInsights": [
    {
      "type": "pattern|success|warning|suggestion",
      "content": "insight text",
      "confidence": 0.0-1.0,
      "source": "where this insight comes from"
    }
  ]
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Analyze this request and determine agent requirements: "${input}"`
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Claude API error:', error);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(content);
      return NextResponse.json(validateAndNormalizeResponse(parsed));
    } catch {
      // If Claude didn't return valid JSON, create a structured response
      return NextResponse.json(createStructuredResponse(input, content));
    }

  } catch (error) {
    logger.error('Failed to analyze with Claude:', error);
    // Return mock response on error
    return NextResponse.json({
      isTeamSuggestion: false,
      response: 'I understand your request. Let me help with that.',
      memoryInsights: []
    });
  }
}

function validateAndNormalizeResponse(response: any) {
  return {
    isTeamSuggestion: response.isTeamSuggestion || false,
    response: response.response || 'I understand your request. Let me help with that.',
    teamSuggestion: response.teamSuggestion ? {
      triggered: response.teamSuggestion.triggered || false,
      reason: response.teamSuggestion.reason || 'Complex task requiring multiple skills',
      confidence: response.teamSuggestion.confidence || 0.75,
      recommendedTeam: {
        name: response.teamSuggestion.recommendedTeam?.name || 'Development Team',
        agents: response.teamSuggestion.recommendedTeam?.agents || ['architect', 'developer', 'tester'],
        description: response.teamSuggestion.recommendedTeam?.description || 'Team for your request'
      },
      benefits: response.teamSuggestion.benefits || ['Faster development', 'Better quality', 'Comprehensive solution']
    } : undefined,
    memoryInsights: response.memoryInsights || []
  };
}

function createStructuredResponse(input: string, claudeText: string) {
  const isComplex = /complex|multiple|team|coordinate|full.?stack|application/i.test(claudeText);
  
  return {
    isTeamSuggestion: isComplex,
    response: claudeText,
    teamSuggestion: isComplex ? {
      triggered: true,
      reason: 'This request involves multiple components that would benefit from specialized agents',
      confidence: 0.8,
      recommendedTeam: {
        name: 'Development Team',
        agents: ['architect', 'frontend-developer', 'backend-developer', 'qa-engineer'],
        description: 'A comprehensive team to handle all aspects of your request'
      },
      benefits: [
        'Parallel development across components',
        'Specialized expertise for each area',
        'Integrated solution with proper architecture'
      ]
    } : undefined,
    memoryInsights: [
      {
        type: 'pattern',
        content: 'Claude AI is analyzing your request in real-time',
        confidence: 1.0,
        source: 'Live AI analysis'
      }
    ]
  };
}