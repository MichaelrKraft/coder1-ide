import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const VIEWPORT_WIDTH = 1440;
const VIEWPORT_HEIGHT = 900;
const MAX_CHUNKS = 4;
const PAGE_TIMEOUT_MS = 30000;

// Reuse SSRF blocking from extract-brand
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
    return BLOCKED_HOSTNAME_PATTERNS.some(p => p.test(parsed.hostname));
  } catch {
    return true;
  }
}

export async function POST(request: Request) {
  let browser = null;
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

    // Dynamic import so server starts even if puppeteer has issues
    const puppeteer = await import('puppeteer').catch(() => null);
    if (!puppeteer) {
      return NextResponse.json(
        { error: 'Screenshot capture service is unavailable.' },
        { status: 503 }
      );
    }

    browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });

    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: PAGE_TIMEOUT_MS,
    });

    // Get full page height
    const fullHeight = await page.evaluate(() => document.body.scrollHeight);
    const chunks = Math.min(MAX_CHUNKS, Math.ceil(fullHeight / VIEWPORT_HEIGHT));

    const images: { base64: string; mimeType: string }[] = [];

    for (let i = 0; i < chunks; i++) {
      const yOffset = i * VIEWPORT_HEIGHT;
      await page.evaluate((y: number) => window.scrollTo(0, y), yOffset);
      // Brief pause for lazy-loaded content
      await new Promise(r => setTimeout(r, 300));

      const screenshotBuffer = await page.screenshot({
        clip: {
          x: 0,
          y: yOffset,
          width: VIEWPORT_WIDTH,
          height: Math.min(VIEWPORT_HEIGHT, fullHeight - yOffset),
        },
        type: 'png',
      });

      images.push({
        base64: Buffer.from(screenshotBuffer).toString('base64'),
        mimeType: 'image/png',
      });
    }

    return NextResponse.json({ images });
  } catch (error) {
    logger.error('Error in capture-url:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('timeout') || message.includes('Navigation')) {
      return NextResponse.json({ error: 'Page took too long to load.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to capture screenshots.' }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
