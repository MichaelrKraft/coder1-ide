import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { buildScreenshotToCodePrompt } from '@/lib/screenshot-to-code/prompt';

// ~5MB image = ~6.7MB base64
const MAX_BASE64_BYTES = 7 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGES = 5;

interface ImageInput {
  base64: string;
  mimeType: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      images,
      framework = 'react',
      uiLibrary = 'none',
      brandContext,
      palette,
      previousCode,
      refinement,
    } = body;

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'images array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (images.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IMAGES} screenshots allowed` },
        { status: 400 }
      );
    }

    // Validate each image
    for (let i = 0; i < images.length; i++) {
      const img: ImageInput = images[i];
      if (!img.base64 || !img.mimeType) {
        return NextResponse.json(
          { error: `Image ${i + 1}: base64 and mimeType are required` },
          { status: 400 }
        );
      }
      if (!ALLOWED_MIME_TYPES.includes(img.mimeType)) {
        return NextResponse.json(
          { error: `Image ${i + 1}: Unsupported type. Use PNG, JPEG, or WebP.` },
          { status: 400 }
        );
      }
      if (img.base64.length > MAX_BASE64_BYTES) {
        return NextResponse.json(
          { error: `Image ${i + 1}: Too large. Please use images under 5MB.` },
          { status: 400 }
        );
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured on server' },
        { status: 503 }
      );
    }

    const prompt = buildScreenshotToCodePrompt(
      framework,
      images.length,
      uiLibrary,
      typeof brandContext === 'string' && brandContext.length > 0 ? brandContext : undefined,
      Array.isArray(palette) && palette.length > 0 ? palette : undefined,
      typeof previousCode === 'string' && previousCode.length > 0 ? previousCode : undefined,
      typeof refinement === 'string' && refinement.length > 0 ? refinement : undefined
    );

    // Build content blocks: label + image for each screenshot, then the text prompt
    const imageBlocks = (images as ImageInput[]).flatMap((img, i) => [
      { type: 'text' as const, text: `Screenshot ${i + 1} of ${images.length}:` },
      {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: img.mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
          data: img.base64,
        },
      },
    ]);

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        stream: true,
        messages: [
          {
            role: 'user',
            content: [
              ...imageBlocks,
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      logger.error('Claude API error in screenshot-to-code:', errorText);
      let claudeMessage = `Claude API error: ${anthropicResponse.status}`;
      try {
        const errJson = JSON.parse(errorText);
        if (errJson?.error?.message) claudeMessage = errJson.error.message;
      } catch { /* ignore parse errors */ }
      return NextResponse.json(
        { error: claudeMessage, raw: errorText },
        { status: anthropicResponse.status }
      );
    }

    // Stream tokens back to the client as SSE
    const stream = new ReadableStream({
      async start(controller) {
        const reader = anthropicResponse.body!.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (!data || data === '[DONE]') continue;
              try {
                const event = JSON.parse(data);
                if (
                  event.type === 'content_block_delta' &&
                  event.delta?.type === 'text_delta' &&
                  event.delta.text
                ) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: event.delta.text })}\n\n`));
                }
              } catch { /* ignore malformed SSE chunks */ }
            }
          }
        } catch (err) {
          logger.error('Stream read error in screenshot-to-code:', err);
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    logger.error('Error in screenshot-to-code:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
