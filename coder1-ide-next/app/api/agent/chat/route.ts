import { NextRequest, NextResponse } from 'next/server';

// Simple chat response generator (placeholder for AI integration)
function generateChatResponse(message: string): string {
  const responses = [
    "I understand you want to work on: " + message,
    "That's an interesting request about: " + message,
    "Let me help you with: " + message,
    "I can assist you with: " + message
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Message is required and must be a string'
        },
        { status: 400 }
      );
    }
    
    if (message.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message must be less than 1000 characters'
        },
        { status: 400 }
      );
    }

    // REMOVED: // REMOVED: console.log(`💬 [Unified] Chat message received: "${message.substring(0, 50)}..."`);
    
    // Simple response generation (placeholder for more sophisticated AI integration)
    const response = generateChatResponse(message);
    
    return NextResponse.json({
      success: true,
      response,
      timestamp: new Date().toISOString(),
      server: 'unified-server'
    });
    
  } catch (error) {
    console.error('❌ [Unified] Chat error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}