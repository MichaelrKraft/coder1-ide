import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { generatePRDPrompt } from '@/lib/prd-template';

export async function POST(request: NextRequest) {
  try {
    const { answers } = await request.json();

    // Validate all required answers
    const requiredFields = ['problem', 'users', 'features', 'metrics', 'constraints'];
    const missingFields = requiredFields.filter(field => !answers[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Generate the PRD prompt
    const prompt = generatePRDPrompt(answers);

    // Call Claude API
    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract the generated PRD
    const prdContent = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    if (!prdContent) {
      return NextResponse.json(
        { error: 'Failed to generate PRD' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      prd: prdContent,
      metadata: {
        model: message.model,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('PRD Generation Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PRD',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
