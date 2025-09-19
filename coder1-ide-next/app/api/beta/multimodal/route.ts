import { NextRequest, NextResponse } from 'next/server';
import { multimodalProcessor } from '@/services/beta/multimodal-processor';
import { Anthropic } from '@anthropic-ai/sdk';

// Initialize Anthropic client
let anthropic: Anthropic | null = null;

function getAnthropicClient() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  return anthropic;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files: File[] = [];
    const message = formData.get('message') as string || '';
    const sessionId = formData.get('sessionId') as string || 'default';
    
    // Extract files from form data
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0 && !message) {
      return NextResponse.json(
        { error: 'No files or message provided' },
        { status: 400 }
      );
    }

    // Process files with multimodal processor
    const processedContent = await multimodalProcessor.processFiles(files);
    
    // Build full message
    const fullMessage = message ? 
      `${message}\n\n${processedContent.text}` : 
      processedContent.text || 'Please analyze the provided files.';

    // Check if we have Claude API access
    const client = getAnthropicClient();
    if (!client) {
      // Fallback response if no API key
      return NextResponse.json({
        content: `📎 Received ${files.length} file(s):\n${processedContent.text}\n\n(Note: Claude API key not configured for full analysis)`,
        files: processedContent.files?.map(f => ({
          name: f.name,
          type: f.type,
          size: f.size,
          language: f.language,
          summary: f.summary
        })),
        images: processedContent.images?.map(img => ({
          name: img.originalName,
          dimensions: img.width && img.height ? `${img.width}x${img.height}` : 'unknown'
        }))
      });
    }

    // Build Claude message with vision support
    const claudeContent = multimodalProcessor.buildClaudeMessage(processedContent);
    
    // Add user message to the content
    if (message) {
      claudeContent.unshift({
        type: 'text',
        text: message
      });
    }

    // Send to Claude with vision capabilities
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: claudeContent
        }
      ],
      system: `You are an AI assistant integrated into Coder1 IDE with multimodal capabilities. 
You can analyze images, read code files, and provide comprehensive assistance.
When analyzing images, describe what you see and provide relevant insights.
When reviewing code, provide constructive feedback and suggestions.
Always be helpful, concise, and technically accurate.`
    });

    // Extract text response
    const textResponse = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');

    return NextResponse.json({
      content: textResponse,
      usage: response.usage,
      model: response.model,
      files: processedContent.files?.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size,
        language: f.language,
        summary: f.summary
      })),
      images: processedContent.images?.map(img => ({
        name: img.originalName,
        dimensions: img.width && img.height ? `${img.width}x${img.height}` : 'unknown'
      }))
    });

  } catch (error: any) {
    console.error('Multimodal API error:', error);
    
    // Handle specific error types
    if (error?.status === 413) {
      return NextResponse.json(
        { error: 'Files too large. Please reduce file size or number of files.' },
        { status: 413 }
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to process multimodal request',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}