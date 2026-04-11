/**
 * ambient-share-card.ts
 * Client-side Canvas generator for "Share Your Dev Day" cards.
 * Produces a 1200×630 PNG blob — standard OG image dimensions.
 * Must only be imported in browser contexts.
 */

import type { VaultNote } from '@/lib/vault-types';

const W = 1200;
const H = 630;

// Coder1 brand colors
const BG_DARK    = '#0a0a0f';
const BG_CARD    = '#13131a';
const PURPLE     = '#8b5cf6';
const PURPLE_DIM = '#4c1d95';
const CYAN       = '#06b6d4';
const WHITE      = '#f8fafc';
const MUTED      = '#94a3b8';
const BORDER     = '#1e1e2e';

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function computeStats(note: VaultNote) {
  const wordCount = note.content.trim().split(/\s+/).filter(Boolean).length;
  const lineCount = note.content.split('\n').length;
  const tagCount  = note.tags.length;
  // Try to extract project from frontmatter or path
  const project   = (note.frontmatter.project as string) ||
                    note.path.split('/')[0] ||
                    'daily';
  return { wordCount, lineCount, tagCount, project };
}

/**
 * Generate a shareable PNG card from an Ambient daily note.
 * Returns a Blob that can be downloaded or written to the clipboard.
 */
export async function generateShareCard(note: VaultNote): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = BG_DARK;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial glow — top-left purple
  const glow = ctx.createRadialGradient(200, 150, 0, 200, 150, 500);
  glow.addColorStop(0, 'rgba(139,92,246,0.18)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Bottom-right cyan glow
  const glow2 = ctx.createRadialGradient(1050, 520, 0, 1050, 520, 380);
  glow2.addColorStop(0, 'rgba(6,182,212,0.12)');
  glow2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // ── Card panel ──────────────────────────────────────────────────────────────
  const pad = 56;
  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 24, BG_CARD, BORDER);

  // ── Top bar: logo + date ─────────────────────────────────────────────────────
  const innerX = pad + 48;
  const innerY = pad + 48;

  // Logo pill: "◆ Ambient"
  ctx.fillStyle = PURPLE;
  ctx.font = 'bold 18px system-ui, sans-serif';
  const pillW = 120;
  const pillH = 32;
  roundRect(ctx, innerX, innerY - 4, pillW, pillH, 8, PURPLE_DIM);
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('◆ Ambient', innerX + 12, innerY + 14);

  // Date — right aligned
  ctx.fillStyle = MUTED;
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(formatDate(note.updatedAt), W - pad - 48, innerY + 12);
  ctx.textAlign = 'left';

  // ── Title ────────────────────────────────────────────────────────────────────
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 48px system-ui, sans-serif';
  const title = truncate(note.title || 'My Dev Day', 46);
  ctx.fillText(title, innerX, innerY + 90);

  // Purple underline accent
  const titleWidth = Math.min(ctx.measureText(title).width, W - pad * 2 - 96);
  const gradLine = ctx.createLinearGradient(innerX, 0, innerX + titleWidth, 0);
  gradLine.addColorStop(0, PURPLE);
  gradLine.addColorStop(1, CYAN);
  ctx.fillStyle = gradLine;
  ctx.fillRect(innerX, innerY + 100, titleWidth, 3);

  // ── Excerpt ──────────────────────────────────────────────────────────────────
  const excerpt = truncate(
    note.content.replace(/^#.*$/mg, '').replace(/\n+/g, ' ').trim(),
    180,
  );
  ctx.fillStyle = MUTED;
  ctx.font = '18px system-ui, sans-serif';
  wrapText(ctx, excerpt, innerX, innerY + 148, W - pad * 2 - 96, 28, 2);

  // ── Stats row ────────────────────────────────────────────────────────────────
  const { wordCount, tagCount, project } = computeStats(note);
  const stats = [
    { label: 'Words',   value: wordCount.toLocaleString() },
    { label: 'Tags',    value: tagCount.toString() },
    { label: 'Project', value: truncate(project, 14) },
  ];
  const statY = innerY + 240;
  const statW = 160;
  stats.forEach((s, i) => {
    const sx = innerX + i * (statW + 24);
    roundRect(ctx, sx, statY, statW, 72, 12, 'rgba(139,92,246,0.08)', 'rgba(139,92,246,0.25)');
    ctx.fillStyle = PURPLE;
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText(s.value, sx + 16, statY + 38);
    ctx.fillStyle = MUTED;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(s.label, sx + 16, statY + 57);
  });

  // ── Tags ─────────────────────────────────────────────────────────────────────
  const visibleTags = note.tags.slice(0, 5);
  let tagX = innerX;
  const tagY = statY + 100;
  ctx.font = '13px system-ui, sans-serif';
  for (const tag of visibleTags) {
    const label = '#' + tag;
    const tw = ctx.measureText(label).width + 20;
    roundRect(ctx, tagX, tagY, tw, 26, 6, 'rgba(6,182,212,0.1)', 'rgba(6,182,212,0.3)');
    ctx.fillStyle = CYAN;
    ctx.fillText(label, tagX + 10, tagY + 17);
    tagX += tw + 8;
    if (tagX > W - pad * 2 - 96) break;
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const footerY = H - pad - 48 - 20;

  // Divider
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(innerX, footerY);
  ctx.lineTo(W - pad - 48, footerY);
  ctx.stroke();

  ctx.fillStyle = MUTED;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Built with Ambient for Coder1  ·  coder1.app/ambient', innerX, footerY + 22);

  ctx.fillStyle = PURPLE;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('coder1.app', W - pad - 48, footerY + 22);
  ctx.textAlign = 'left';

  // ── Export ───────────────────────────────────────────────────────────────────
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas export failed')),
      'image/png',
    );
  });
}

/**
 * Download a share card as PNG and open a pre-filled Twitter share dialog.
 */
export async function shareNote(note: VaultNote): Promise<void> {
  const blob = await generateShareCard(note);

  // Download PNG
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `ambient-${new Date().toISOString().slice(0, 10)}.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  // Open Twitter intent
  const excerpt = note.content.replace(/^#.*$/mg, '').replace(/\n+/g, ' ').trim().slice(0, 100);
  const tweet   = encodeURIComponent(
    `My dev day, automated by Ambient for @Coder1IDE\n\n"${excerpt}"\n\ncoder1.app/ambient`
  );
  window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank', 'noopener');
}

// ── Canvas helpers ─────────────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
  fill?: string, stroke?: string,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  if (fill)   { ctx.fillStyle = fill;     ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  maxWidth: number, lineHeight: number, maxLines: number,
): void {
  const words = text.split(' ');
  let line = '';
  let lineNum = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineNum * lineHeight);
      line = word;
      lineNum++;
      if (lineNum >= maxLines) { ctx.fillText(line + '…', x, y + lineNum * lineHeight); return; }
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y + lineNum * lineHeight);
}
