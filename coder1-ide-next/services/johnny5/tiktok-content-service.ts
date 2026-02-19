/**
 * Johnny5 TikTok Content Service
 *
 * End-to-end pipeline for generating TikTok photo carousel content:
 * 1. Generate 6 AI images using OpenAI gpt-image-1 ("locked architecture" pattern)
 * 2. Add text overlay to slide 1 using Sharp SVG composite
 * 3. Generate caption + hashtags
 * 4. Upload to Postiz as TikTok draft (or dry-run to local files)
 * 5. Notify via Telegram
 * 6. Log performance to MEMORY.md
 */

import OpenAI from 'openai';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@/lib/logger';
import { appendToLivingFile } from '@/lib/living-files';

// ============================================================================
// Types
// ============================================================================

export interface SlideshowConfig {
  hook: string;
  basePrompt: string;
  slides: SlideConfig[];
  app: string;
  hashtags?: string[];
  captionContext?: string;
  quality?: 'low' | 'medium' | 'high';
  dryRun?: boolean;
}

export interface SlideConfig {
  styleOverride: string;
  overlayText?: string;
}

export interface SlideshowResult {
  success: boolean;
  postId?: string;
  caption: string;
  imageCount: number;
  cost: number;
  error?: string;
  taskId?: string;
  localPaths: string[];
  hashtags: string[];
}

interface GeneratedImage {
  buffer: Buffer;
  localPath: string;
  index: number;
  prompt: string;
}

interface OverlayOptions {
  fontSize?: number;
  maxLines?: number;
  yPosition?: number;
}

interface PostizUpload {
  id: string;
  path: string;
}

// ============================================================================
// Constants
// ============================================================================

const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 1536;
const DEFAULT_FONT_SIZE = Math.round(IMAGE_WIDTH * 0.065); // ~66px
const MAX_OVERLAY_WIDTH = Math.round(IMAGE_WIDTH * 0.80);   // 80% of width
const OVERLAY_Y_POSITION = Math.round(IMAGE_HEIGHT * 0.35); // 35% from top (safe zone)
const MAX_OVERLAY_LINES = 2;
const INTER_IMAGE_DELAY_MS = 2000;
const MIN_IMAGES_TO_PROCEED = 4;
const MAX_RETRIES_PER_IMAGE = 2;
const POSTIZ_BASE_URL = 'https://api.postiz.com/public/v1';

// Cost per image by quality (gpt-image-1 at 1024x1536)
const COST_PER_IMAGE: Record<string, number> = {
  low: 0.04,
  medium: 0.08,
  high: 0.16,
};

// ============================================================================
// Default Prompts (from skill file)
// ============================================================================

const DEFAULT_BASE_PROMPT = `Stylized digital illustration in portrait orientation (2:3 aspect ratio). A developer sitting at a modern home office desk, facing a 27-inch curved monitor showing a dark-themed code editor. MacBook Pro open to the right as second screen. Mechanical keyboard with subtle RGB backlighting. White ceramic coffee mug with rising steam, positioned to the left of the keyboard. Over-ear headphones around the developer's neck. Warm brass desk lamp, illuminated. Minimalist workspace with clean cable management. Small succulent plant in concrete pot near the monitor base. Phone face-down on the desk. Single framed minimal art print on the wall behind. Professional indirect lighting creating slightly moody, focused atmosphere. Shot from slightly above eye level, looking over developer's right shoulder toward the monitor.`;

const DEFAULT_SLIDES: SlideConfig[] = [
  {
    styleOverride: `The developer looks frustrated, chin resting on hand. Monitor shows cluttered code with red error highlighting, 20+ browser tabs open, terminal showing failed tests. Expression: tired, overwhelmed.`,
  },
  {
    styleOverride: `Developer sits upright, looking intrigued. Monitor shows Coder1 IDE clean dark interface with an AI chat panel on the right side, suggesting a code refactor. Expression: curious, leaning forward slightly.`,
  },
  {
    styleOverride: `Developer smiling slightly. Monitor shows Coder1 with AI actively writing code, green diff highlights showing new clean code replacing the messy code. Terminal shows passing tests.`,
  },
  {
    styleOverride: `Developer gesturing toward screen excitedly. Monitor shows Coder1 with multiple colored cursors for team members, live collaboration in progress. Small video chat thumbnails visible in corner.`,
  },
  {
    styleOverride: `Developer leaning back confidently. Monitor shows Coder1 terminal with successful deployment logs, green checkmarks. Dashboard showing metrics.`,
  },
  {
    styleOverride: `Developer with satisfied smile, arms slightly raised in subtle celebration. Monitor shows clean, well-organized codebase. Phone on desk now face-up showing notification of successful deploy.`,
  },
];

// ============================================================================
// TikTok Content Service
// ============================================================================

class TikTokContentService {
  private openai: OpenAI | null = null;
  private dailySpend = 0;
  private dailySpendDate = '';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.warn('[TikTok] OPENAI_API_KEY not configured - image generation unavailable');
    } else {
      this.openai = new OpenAI({ apiKey });
    }
  }

  // --------------------------------------------------------------------------
  // Main Pipeline
  // --------------------------------------------------------------------------

  async generateSlideshow(config: SlideshowConfig): Promise<SlideshowResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const quality = config.quality || 'medium';
    const isDryRun = config.dryRun || !process.env.POSTIZ_API_KEY;

    logger.info(`[TikTok] Starting slideshow generation: "${config.hook.substring(0, 60)}..." (quality: ${quality}, dryRun: ${isDryRun})`);

    // Check budget
    if (!this.checkBudget(config.slides.length, quality)) {
      return {
        success: false,
        caption: '',
        imageCount: 0,
        cost: 0,
        error: 'Daily budget exceeded. Try again tomorrow or use lower quality.',
        localPaths: [],
        hashtags: [],
      };
    }

    // 1. Generate images
    const images = await this.generateImages(
      config.basePrompt || DEFAULT_BASE_PROMPT,
      config.slides.length > 0 ? config.slides : DEFAULT_SLIDES,
      quality
    );

    if (images.length < MIN_IMAGES_TO_PROCEED) {
      const error = `Only ${images.length}/${config.slides.length || 6} images generated. Minimum ${MIN_IMAGES_TO_PROCEED} required.`;
      logger.error(`[TikTok] ${error}`);
      return {
        success: false,
        caption: '',
        imageCount: images.length,
        cost: images.length * COST_PER_IMAGE[quality],
        error,
        localPaths: images.map(img => img.localPath),
        hashtags: [],
      };
    }

    if (images.length < (config.slides.length || 6)) {
      errors.push(`Warning: ${(config.slides.length || 6) - images.length} slides failed, proceeding with ${images.length}`);
    }

    // 2. Add text overlay to slide 1
    try {
      const overlayText = config.slides[0]?.overlayText || config.hook;
      images[0].buffer = await this.addTextOverlay(images[0].buffer, overlayText);
      // Re-save slide 1 with overlay
      fs.writeFileSync(images[0].localPath, images[0].buffer);
      logger.info('[TikTok] Text overlay applied to slide 1');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Text overlay failed (non-fatal): ${msg}`);
      logger.warn(`[TikTok] Text overlay failed: ${msg}`);
    }

    // 3. Generate caption + hashtags
    let caption = '';
    let hashtags: string[] = config.hashtags || [];
    try {
      const captionResult = await this.generateCaption(config.hook, config.app, config.captionContext);
      caption = captionResult.caption;
      if (!config.hashtags?.length) {
        hashtags = captionResult.hashtags;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Caption generation failed, using fallback: ${msg}`);
      caption = `${config.hook}\n\nTry Coder1 IDE - the first agentic IDE built for Claude Code users.\n\nLink in bio`;
      hashtags = ['#aicoding', '#devtools', '#programming', '#coder1', '#tech'];
    }

    // 4. Upload to Postiz (or skip in dry-run)
    let postId: string | undefined;
    if (!isDryRun) {
      try {
        const uploadResult = await this.uploadToPostiz(images);
        postId = uploadResult.postId;
        logger.info(`[TikTok] Postiz draft created: ${postId}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Postiz upload failed (content saved locally): ${msg}`);
        logger.error(`[TikTok] Postiz upload failed: ${msg}`);
      }
    } else {
      logger.info(`[TikTok] Dry-run mode - images saved locally only`);
    }

    // 5. Calculate cost and update budget tracking
    const cost = images.length * COST_PER_IMAGE[quality];
    this.trackSpend(cost);

    // 6. Log performance
    await this.logPerformance(config.hook, postId || null, {
      cost,
      slideCount: images.length,
      quality,
      dryRun: isDryRun,
    });

    const durationMs = Date.now() - startTime;
    logger.info(`[TikTok] Slideshow complete in ${durationMs}ms: ${images.length} slides, $${cost.toFixed(2)} cost`);

    if (errors.length > 0) {
      logger.warn(`[TikTok] Warnings: ${errors.join('; ')}`);
    }

    return {
      success: true,
      postId,
      caption: `${caption}\n\n${hashtags.join(' ')}`,
      imageCount: images.length,
      cost,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      localPaths: images.map(img => img.localPath),
      hashtags,
    };
  }

  // --------------------------------------------------------------------------
  // Image Generation
  // --------------------------------------------------------------------------

  private async generateImages(
    basePrompt: string,
    slides: SlideConfig[],
    quality: 'low' | 'medium' | 'high'
  ): Promise<GeneratedImage[]> {
    if (!this.openai) {
      logger.error('[TikTok] OpenAI client not configured');
      return [];
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outputDir = path.join('/tmp', 'tiktok-content', timestamp);
    fs.mkdirSync(outputDir, { recursive: true });

    const images: GeneratedImage[] = [];

    for (let i = 0; i < slides.length; i++) {
      const fullPrompt = `${basePrompt}\n\n${slides[i].styleOverride}`;
      const ext = i === 0 ? 'png' : 'jpeg';
      const localPath = path.join(outputDir, `slide-${i}.${ext}`);

      let retries = 0;
      while (retries < MAX_RETRIES_PER_IMAGE) {
        try {
          logger.info(`[TikTok] Generating slide ${i + 1}/${slides.length} (attempt ${retries + 1})...`);

          const response = await this.openai.images.generate({
            model: 'gpt-image-1',
            prompt: fullPrompt,
            n: 1,
            size: '1024x1536',
            quality,
          });

          const imageData = response.data?.[0];
          if (!imageData) {
            throw new Error('No image data in response');
          }

          // gpt-image-1 returns base64 data
          let buffer: Buffer;
          if (imageData.b64_json) {
            buffer = Buffer.from(imageData.b64_json, 'base64');
          } else if (imageData.url) {
            // Fallback: download from URL
            const imgResponse = await fetch(imageData.url);
            buffer = Buffer.from(await imgResponse.arrayBuffer());
          } else {
            throw new Error('No b64_json or url in image response');
          }

          // Validate image size (suspiciously small = failed generation)
          if (buffer.length < 10240) { // < 10KB is suspicious for a 1024x1536 image
            throw new Error(`Image too small (${buffer.length} bytes), likely failed generation`);
          }

          // Save to disk
          fs.writeFileSync(localPath, buffer);

          images.push({
            buffer,
            localPath,
            index: i,
            prompt: fullPrompt,
          });

          logger.info(`[TikTok] Slide ${i + 1} generated (${(buffer.length / 1024).toFixed(0)}KB)`);
          break;
        } catch (err: unknown) {
          retries++;
          const msg = err instanceof Error ? err.message : String(err);
          logger.warn(`[TikTok] Slide ${i + 1} failed (attempt ${retries}): ${msg}`);

          if (retries >= MAX_RETRIES_PER_IMAGE) {
            logger.error(`[TikTok] Slide ${i + 1} failed after ${MAX_RETRIES_PER_IMAGE} retries`);
          } else {
            await this.sleep(5000 * retries); // Exponential backoff: 5s, 10s
          }
        }
      }

      // Delay between images to avoid rate limits
      if (i < slides.length - 1) {
        await this.sleep(INTER_IMAGE_DELAY_MS);
      }
    }

    return images;
  }

  // --------------------------------------------------------------------------
  // Text Overlay (Sharp SVG Composite)
  // --------------------------------------------------------------------------

  async addTextOverlay(
    imageBuffer: Buffer,
    text: string,
    options: OverlayOptions = {}
  ): Promise<Buffer> {
    const fontSize = options.fontSize || DEFAULT_FONT_SIZE;
    const maxLines = options.maxLines || MAX_OVERLAY_LINES;
    const yPosition = options.yPosition || OVERLAY_Y_POSITION;

    // Word-wrap the text
    const lines = this.wordWrap(text, MAX_OVERLAY_WIDTH, fontSize);
    const displayLines = lines.slice(0, maxLines);

    // If text was truncated, add ellipsis to last visible line
    if (lines.length > maxLines) {
      const lastLine = displayLines[displayLines.length - 1];
      displayLines[displayLines.length - 1] = lastLine.substring(0, lastLine.length - 3) + '...';
    }

    // Build SVG overlay
    const lineHeight = fontSize * 1.3;
    const totalTextHeight = displayLines.length * lineHeight;
    const startY = yPosition - (totalTextHeight / 2) + fontSize; // Center vertically around yPosition

    const svgLines = displayLines.map((line, i) => {
      const y = startY + (i * lineHeight);
      return `<text x="50%" y="${y}" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}" font-weight="bold" fill="white"
        stroke="black" stroke-width="3" paint-order="stroke">
        ${this.escapeXml(line)}
      </text>`;
    }).join('\n');

    const svg = `<svg width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}">
      ${svgLines}
    </svg>`;

    return sharp(imageBuffer)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .toBuffer();
  }

  // --------------------------------------------------------------------------
  // Caption Generation
  // --------------------------------------------------------------------------

  private async generateCaption(
    hook: string,
    app: string,
    captionContext?: string
  ): Promise<{ caption: string; hashtags: string[] }> {
    // Use OpenAI for caption generation (we already have the client)
    if (!this.openai) {
      return this.fallbackCaption(hook, app);
    }

    try {
      const systemPrompt = `You are a TikTok content writer for ${app}, an agentic IDE built for Claude Code users. Write engaging, casual captions for developer content.

Rules:
- Story-style narrative, 150-300 characters
- Relate directly to the hook's conflict
- Mention ${app} naturally within the story (NOT "Download ${app} now!")
- Include "link in bio" CTA at end
- Exactly 5 hashtags: 2 niche (#aicoding, #devtools) + 3 broad (#coding, #programming, #tech)
- Tone: casual developer, NOT corporate marketing copy
- No emojis in first line

Return JSON: { "caption": "...", "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"] }`;

      const userPrompt = `Hook: "${hook}"${captionContext ? `\nContext: ${captionContext}` : ''}

Write a TikTok caption for this hook.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from caption generation');
      }

      const parsed = JSON.parse(content);
      return {
        caption: parsed.caption || this.fallbackCaption(hook, app).caption,
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 5) : this.fallbackCaption(hook, app).hashtags,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[TikTok] Caption generation failed, using fallback: ${msg}`);
      return this.fallbackCaption(hook, app);
    }
  }

  private fallbackCaption(hook: string, app: string): { caption: string; hashtags: string[] } {
    return {
      caption: `${hook}\n\nTry ${app} - the first agentic IDE built for Claude Code users.\n\nLink in bio`,
      hashtags: ['#aicoding', '#devtools', '#programming', '#coder1', '#tech'],
    };
  }

  // --------------------------------------------------------------------------
  // Postiz Integration
  // --------------------------------------------------------------------------

  private async uploadToPostiz(images: GeneratedImage[]): Promise<{ postId: string }> {
    const apiKey = process.env.POSTIZ_API_KEY;
    const integrationId = process.env.POSTIZ_TIKTOK_INTEGRATION_ID;

    if (!apiKey || !integrationId) {
      throw new Error('POSTIZ_API_KEY or POSTIZ_TIKTOK_INTEGRATION_ID not configured');
    }

    // Upload each image
    const uploads: PostizUpload[] = [];
    for (const image of images) {
      const ext = image.index === 0 ? 'png' : 'jpeg';
      const filename = `slide-${image.index}.${ext}`;

      const formData = new FormData();
      formData.append('file', new Blob([image.buffer]), filename);

      const response = await fetch(`${POSTIZ_BASE_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': apiKey },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Postiz upload failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      uploads.push({ id: data.id, path: data.path });

      // Small delay between uploads
      await this.sleep(500);
    }

    // Create TikTok draft post
    const postBody = {
      type: 'now',
      date: new Date().toISOString(),
      shortLink: false,
      tags: [],
      posts: [{
        integrationId,
        value: '',
        image: uploads.map(u => ({ id: u.id, path: u.path })),
        settings: {
          __type: 'tiktok',
          privacy_level: 'SELF_ONLY',
          duet: false,
          stitch: false,
          comment: true,
          autoAddMusic: 'no',
          brand_content_toggle: false,
          brand_organic_toggle: false,
          video_made_with_ai: true,
          content_posting_method: 'UPLOAD',
        },
      }],
    };

    const postResponse = await fetch(`${POSTIZ_BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postBody),
    });

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      throw new Error(`Postiz post creation failed (${postResponse.status}): ${errorText}`);
    }

    const postData = await postResponse.json();
    return { postId: postData.id || postData.postId || 'unknown' };
  }

  // --------------------------------------------------------------------------
  // Performance Logging
  // --------------------------------------------------------------------------

  private async logPerformance(
    hook: string,
    postId: string | null,
    metadata: { cost: number; slideCount: number; quality: string; dryRun: boolean }
  ): Promise<void> {
    const date = new Date().toISOString().slice(0, 10);
    const entry = `- ${date} | Hook: "${hook.substring(0, 80)}" | Slides: ${metadata.slideCount} | Quality: ${metadata.quality} | Cost: $${metadata.cost.toFixed(2)} | PostID: ${postId || 'dry-run'} | Views: PENDING`;

    try {
      appendToLivingFile('MEMORY.md', `\n## TikTok Performance Log\n${entry}`, 'default');
      logger.info(`[TikTok] Performance logged to MEMORY.md`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[TikTok] Failed to log performance: ${msg}`);
    }
  }

  // --------------------------------------------------------------------------
  // Budget Management
  // --------------------------------------------------------------------------

  private checkBudget(slideCount: number, quality: string): boolean {
    const budgetLimit = parseFloat(process.env.TIKTOK_DAILY_BUDGET || '5.00');
    const today = new Date().toISOString().slice(0, 10);

    // Reset daily counter if new day
    if (this.dailySpendDate !== today) {
      this.dailySpend = 0;
      this.dailySpendDate = today;
    }

    const estimatedCost = slideCount * COST_PER_IMAGE[quality];
    if (this.dailySpend + estimatedCost > budgetLimit) {
      logger.warn(`[TikTok] Daily budget exceeded: $${this.dailySpend.toFixed(2)} spent, $${estimatedCost.toFixed(2)} estimated, limit $${budgetLimit.toFixed(2)}`);
      return false;
    }

    return true;
  }

  private trackSpend(cost: number): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.dailySpendDate !== today) {
      this.dailySpend = 0;
      this.dailySpendDate = today;
    }
    this.dailySpend += cost;
  }

  // --------------------------------------------------------------------------
  // Utility Functions
  // --------------------------------------------------------------------------

  private wordWrap(text: string, maxWidth: number, fontSize: number): string[] {
    // Approximate character width (conservative: ~0.6 of font size for proportional fonts)
    const charWidth = fontSize * 0.55;
    const maxCharsPerLine = Math.floor(maxWidth / charWidth);

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length > maxCharsPerLine && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Singleton
// ============================================================================

let instance: TikTokContentService | null = null;

export function getTikTokContentService(): TikTokContentService {
  if (!instance) {
    instance = new TikTokContentService();
  }
  return instance;
}

// ============================================================================
// Helper: Build config from simplified request body
// ============================================================================

export function buildSlideshowConfig(body: {
  hook: string;
  basePrompt?: string;
  slides?: SlideConfig[];
  app?: string;
  hashtags?: string[];
  captionContext?: string;
  quality?: 'low' | 'medium' | 'high';
  dryRun?: boolean;
}): SlideshowConfig {
  return {
    hook: body.hook,
    basePrompt: body.basePrompt || DEFAULT_BASE_PROMPT,
    slides: body.slides?.length ? body.slides : DEFAULT_SLIDES.map((slide, i) => ({
      ...slide,
      overlayText: i === 0 ? body.hook : undefined,
    })),
    app: body.app || 'Coder1',
    hashtags: body.hashtags,
    captionContext: body.captionContext,
    quality: body.quality || 'medium',
    dryRun: body.dryRun ?? !process.env.POSTIZ_API_KEY,
  };
}

export { TikTokContentService, DEFAULT_BASE_PROMPT, DEFAULT_SLIDES };
