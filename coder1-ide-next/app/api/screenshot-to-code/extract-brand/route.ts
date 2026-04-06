import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const MAX_CONTENT_CHARS = 3000;

// Block requests to private/local addresses (SSRF prevention)
const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^192\.168\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

function isBlockedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;
    const hostname = parsed.hostname;
    return BLOCKED_HOSTNAME_PATTERNS.some(p => p.test(hostname));
  } catch {
    return true;
  }
}

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CONTENT_CHARS);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    if (isBlockedUrl(url)) {
      return NextResponse.json(
        { error: 'Private or invalid URLs are not allowed.' },
        { status: 400 }
      );
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Coder1-BrandExtractor/1.0' },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Could not fetch URL: ${response.status} ${response.statusText}` },
        { status: 400 }
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      return NextResponse.json(
        { error: 'URL must point to an HTML page.' },
        { status: 400 }
      );
    }

    const html = await response.text();
    const text = extractTextFromHtml(html);

    if (text.length < 20) {
      return NextResponse.json(
        { error: 'Could not extract meaningful content from this URL.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ text, charCount: text.length });
  } catch (error) {
    logger.error('Error in extract-brand:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Surface fetch/timeout errors clearly
    if (message.includes('fetch') || message.includes('timeout') || message.includes('ENOTFOUND')) {
      return NextResponse.json({ error: `Could not reach URL: ${message}` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to extract brand content.' }, { status: 500 });
  }
}
