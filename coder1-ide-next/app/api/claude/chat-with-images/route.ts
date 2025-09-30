import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

interface ImageData {
  base64: string;
  mimeType: string;
}

export async function POST(request: Request) {
  try {
    const { message, images, sessionId } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get API key from server-side environment
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    
    if (!apiKey) {
      logger.warn('No API key configured, returning mock response');
      return NextResponse.json({
        response: `I received your message: "${message}" with ${images?.length || 0} image(s), but I cannot analyze them without an API key configured.`,
        success: false
      });
    }

    // Build the content array for Claude
    const content: any[] = [];
    
    // Add images first if present
    if (images && images.length > 0) {
      images.forEach((img: ImageData, index: number) => {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mimeType,
            data: img.base64
          }
        });
      });
    }
    
    // Add the text message
    content.push({
      type: 'text',
      text: message
    });

    logger.info(`Claude API request with ${images?.length || 0} images for session ${sessionId}`);

    // Call Claude API with images
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: content
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Claude API error:', error);
      return NextResponse.json(
        { error: `Claude API error: ${response.status}`, details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    const responseText = data.content[0].text;
    
    logger.info(`Claude response received for session ${sessionId}`);
    
    return NextResponse.json({
      response: responseText,
      success: true,
      usage: data.usage
    });

  } catch (error) {
    logger.error('Error in chat-with-images:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}