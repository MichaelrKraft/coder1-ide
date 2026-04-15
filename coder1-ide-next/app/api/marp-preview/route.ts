import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    // Dynamic import to avoid issues with edge runtime
    const { Marp } = await import('@marp-team/marp-core');
    const marp = new Marp({ html: true });
    const { html, css } = marp.render(content);

    // Count slides (each slide is a <section> element)
    const slideCount = (html.match(/<section/g) || []).length;

    // Build full HTML document — all slides stacked vertically for scrollable preview
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${css}
</style>
<style>
  body {
    margin: 0;
    padding: 20px;
    background: #1e1e2e;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    box-sizing: border-box;
  }
  section {
    flex-shrink: 0;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.6);
    border-radius: 6px;
    overflow: hidden;
  }
</style>
</head>
<body>
${html}
</body>
</html>`;

    return NextResponse.json({ html: fullHtml, slideCount });
  } catch (error) {
    console.error('Marp render error:', error);
    return NextResponse.json({ error: 'Failed to render slides' }, { status: 500 });
  }
}
