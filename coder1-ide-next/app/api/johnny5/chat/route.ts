import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getMoltbotBridge } from '@/services/johnny5/moltbot-bridge';
import { trackUsage } from '@/services/johnny5/usage-tracker';
import { addMessageToSession } from '@/services/johnny5/session-tracker';
import { logAuditEntry, checkForPromptInjection } from '@/services/johnny5/security-tracker';
import { addConversationTokens } from '@/services/johnny5/context-tracker';

// Johnny5 system prompt - the autonomous AI assistant personality
const JOHNNY5_SYSTEM_PROMPT = `You are Johnny5, an autonomous AI assistant built into the Coder1 IDE.

## Your Role
You are a proactive AI employee that helps users with:
- Coding tasks and feature development
- Research and analysis
- Monitoring their business and identifying opportunities
- Building features and creating PRs while they sleep
- Answering questions about their codebase
- Suggesting improvements and optimizations

## Your Personality
- Friendly but efficient - get things done
- Proactive - suggest actions, don't just answer questions
- Technical but accessible - explain complex things simply
- Honest about limitations - say when you can't do something
- Reference: "Need more input!" when you need clarification

## Your Capabilities
You have access to:
- The user's codebase and project files
- Terminal commands (through Claude Code)
- Browser automation (through integrations)
- Connected services (GitHub, Gmail, Slack, etc.)

## Guidelines
1. Keep responses concise but helpful
2. Offer to take action, not just give advice
3. When appropriate, break down tasks into steps
4. Ask clarifying questions if the request is ambiguous
5. Proactively suggest related improvements

## Context
You're running inside Coder1 IDE. The user can also use Claude Code in the terminal for direct coding commands. You complement that by being their conversational AI assistant for broader tasks.`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { message, history, sessionId } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // SECURITY: Check for prompt injection attempts
    const injectionAlert = checkForPromptInjection(message, 'terminal');
    if (injectionAlert) {
      // Log the blocked attempt
      logAuditEntry({
        action: 'blocked',
        target: 'chat_message',
        source: 'user',
        reasoning: 'Potential prompt injection detected',
        risk: 'high',
        blocked: true,
        blockReason: 'Prompt injection pattern detected',
        sessionId: sessionId || 'default',
      });

      return NextResponse.json({
        response: "I detected a pattern in your message that looks like it might be trying to manipulate my behavior. If this was unintentional, please rephrase your request.",
        toolCalls: [],
        thinking: null,
        source: 'security_block',
        blocked: true,
      });
    }

    // Log the API call for audit
    logAuditEntry({
      action: 'api_call',
      target: 'johnny5_chat',
      source: 'user',
      risk: 'low',
      sessionId: sessionId || 'default',
    });

    // Check if Moltbot is available and should be used
    const moltbotBridge = getMoltbotBridge();

    if (process.env.MOLTBOT_ENABLED === 'true' && moltbotBridge.isConnected()) {
      try {
        console.log('[Johnny5 Chat] Routing through Moltbot...');
        const response = await moltbotBridge.sendMessage(
          sessionId || 'default',
          message
        );

        const actualSessionId = response.sessionId || sessionId || 'default';

        // Track usage for analytics
        if (response.tokenUsage) {
          trackUsage({
            sessionId: actualSessionId,
            source: 'moltbot',
            inputTokens: response.tokenUsage.input,
            outputTokens: response.tokenUsage.output,
          });
          // Track for context composition
          addConversationTokens(response.tokenUsage.input, response.tokenUsage.output);
        }

        // Track session for session intelligence
        addMessageToSession({
          sessionId: actualSessionId,
          role: 'user',
          content: message,
          inputTokens: response.tokenUsage?.input,
          source: 'moltbot',
        });
        addMessageToSession({
          sessionId: actualSessionId,
          role: 'assistant',
          content: response.text,
          outputTokens: response.tokenUsage?.output,
          source: 'moltbot',
          toolCalls: response.toolCalls?.map(tc => ({
            name: tc.name,
            input: tc.input,
            output: tc.output,
          })),
          thinking: response.thinking || undefined,
        });

        return NextResponse.json({
          response: response.text,
          toolCalls: response.toolCalls || [],
          thinking: response.thinking || null,
          source: 'moltbot',
          sessionId: actualSessionId,
          usage: response.tokenUsage ? {
            inputTokens: response.tokenUsage.input,
            outputTokens: response.tokenUsage.output,
          } : undefined,
        });
      } catch (moltbotError) {
        console.error('[Johnny5 Chat] Moltbot error, falling back:', moltbotError);
        // Fall through to direct Claude API
      }
    }

    // If Moltbot unavailable or errored, continue with direct Claude API...

    // Get API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      // Track mock usage for analytics (estimated tokens)
      const mockResponse = getMockResponse(message);
      const mockSessionId = sessionId || 'default';
      const mockInputTokens = Math.round(message.length / 4);
      const mockOutputTokens = Math.round(mockResponse.length / 4);

      trackUsage({
        sessionId: mockSessionId,
        source: 'mock',
        inputTokens: mockInputTokens,
        outputTokens: mockOutputTokens,
      });
      // Track for context composition
      addConversationTokens(mockInputTokens, mockOutputTokens);

      // Track session for session intelligence
      addMessageToSession({
        sessionId: mockSessionId,
        role: 'user',
        content: message,
        inputTokens: mockInputTokens,
        source: 'mock',
      });
      addMessageToSession({
        sessionId: mockSessionId,
        role: 'assistant',
        content: mockResponse,
        outputTokens: mockOutputTokens,
        source: 'mock',
      });

      // Return a mock response for development/demo
      return NextResponse.json({
        response: mockResponse,
        toolCalls: [],
        thinking: null,
        source: 'mock',
      });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey });

    // Build message history
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];

    // Add history if provided
    if (Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message,
    });

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: JOHNNY5_SYSTEM_PROMPT,
      messages,
    });

    // Extract text response
    const textContent = response.content.find((c) => c.type === 'text');
    const responseText = textContent?.type === 'text' ? textContent.text : 'I received your message but had trouble generating a response.';
    const directSessionId = sessionId || 'default';

    // Track usage for analytics
    trackUsage({
      sessionId: directSessionId,
      source: 'direct',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: 'claude-sonnet-4-20250514',
    });
    // Track for context composition
    addConversationTokens(response.usage.input_tokens, response.usage.output_tokens);

    // Track session for session intelligence
    addMessageToSession({
      sessionId: directSessionId,
      role: 'user',
      content: message,
      inputTokens: response.usage.input_tokens,
      source: 'direct',
    });
    addMessageToSession({
      sessionId: directSessionId,
      role: 'assistant',
      content: responseText,
      outputTokens: response.usage.output_tokens,
      source: 'direct',
    });

    return NextResponse.json({
      response: responseText,
      toolCalls: [],
      thinking: null,
      source: 'direct',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('Johnny5 chat error:', error);

    const fallbackResponse = "I'm having trouble connecting right now. Let me try a simpler response: I'm Johnny5, your autonomous AI assistant. How can I help you today?";
    const fallbackOutputTokens = Math.round(fallbackResponse.length / 4);

    // Track fallback for analytics
    trackUsage({
      sessionId: 'fallback',
      source: 'fallback',
      inputTokens: 50, // Estimated
      outputTokens: fallbackOutputTokens,
    });
    // Track for context composition
    addConversationTokens(50, fallbackOutputTokens);

    // Track session for session intelligence
    addMessageToSession({
      sessionId: 'fallback',
      role: 'assistant',
      content: fallbackResponse,
      outputTokens: fallbackOutputTokens,
      source: 'fallback',
    });

    // Return mock response on error
    return NextResponse.json({
      response: fallbackResponse,
      toolCalls: [],
      thinking: null,
      source: 'fallback',
    });
  }
}

// Mock responses for development/demo mode
function getMockResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hey! Great to meet you. I'm Johnny5, your autonomous AI assistant. I can help you with coding, research, monitoring your business, and even building features while you sleep. What would you like to work on today?";
  }

  if (lowerMessage.includes('build') || lowerMessage.includes('create') || lowerMessage.includes('make')) {
    return "I'd love to help you build that! Here's what I'm thinking:\n\n1. First, let me understand the requirements better\n2. Then I'll draft an implementation plan\n3. I can create a PR with the changes for you to review\n\nWant me to get started? I'll keep you updated on progress and won't push anything live without your approval.";
  }

  if (lowerMessage.includes('research') || lowerMessage.includes('find') || lowerMessage.includes('search')) {
    return "I can research that for you! I'll:\n\n1. Search through relevant sources\n2. Compile the key findings\n3. Give you a summary with actionable insights\n\nShould I start now? I can also monitor this topic ongoing and alert you when there are updates.";
  }

  if (lowerMessage.includes('fix') || lowerMessage.includes('bug') || lowerMessage.includes('error')) {
    return "I'll help you track down that issue. Let me:\n\n1. Analyze the error and surrounding code\n2. Identify potential root causes\n3. Propose a fix with explanation\n\nCan you share more details about what's happening? Any error messages or unexpected behavior?";
  }

  if (lowerMessage.includes('what can you do') || lowerMessage.includes('help')) {
    return "Great question! Here's what I can do:\n\n**Coding & Development**\n• Build features and create PRs\n• Debug issues and fix bugs\n• Refactor and optimize code\n• Write tests\n\n**Research & Analysis**\n• Research topics and technologies\n• Analyze competitors\n• Monitor trends in your industry\n\n**Automation & Monitoring**\n• Watch for opportunities while you sleep\n• Send you morning briefs of what I've done\n• Alert you to important changes\n\n**Integrations**\n• Connect to GitHub, Gmail, Slack, etc.\n• Summarize PRs and emails\n• Automate workflows\n\nWhat would you like me to help with?";
  }

  if (lowerMessage.includes('morning') || lowerMessage.includes('brief') || lowerMessage.includes('overnight')) {
    return "I can work overnight and give you a morning brief! Here's how it works:\n\n1. Tell me what tasks you'd like me to work on\n2. I'll work through them while you rest\n3. In the morning, you'll see a summary of:\n   • What I built (with PRs ready to review)\n   • Research I completed\n   • Trends I spotted\n   • Issues that need your attention\n\nWant me to set up an overnight task list?";
  }

  // Default response
  return "Got it! I'm thinking about how best to help with this. A few quick questions:\n\n1. What's the main goal you're trying to achieve?\n2. Is there a deadline or priority level?\n3. Any constraints I should know about?\n\nOnce I understand the context better, I can either take action directly or propose a plan for your approval.";
}
