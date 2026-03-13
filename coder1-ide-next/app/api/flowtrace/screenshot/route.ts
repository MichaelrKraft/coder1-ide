/**
 * GET /api/flowtrace/screenshot?path=<encoded-path>
 *
 * Securely serves a screenshot file from ~/.screenpipe/frames/.
 * HARD rejects any path that doesn't start with the expected directory.
 */

import { NextRequest } from 'next/server';
import { createReadStream, existsSync } from 'fs';
import { homedir } from 'os';
import { resolve, normalize } from 'path';

const SCREENPIPE_FRAMES_DIR = resolve(homedir(), '.screenpipe', 'frames');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawPath = searchParams.get('path');

  if (!rawPath) {
    return new Response('path is required', { status: 400 });
  }

  // Decode and normalize to prevent traversal attacks
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return new Response('Invalid path encoding', { status: 400 });
  }

  const resolvedPath = normalize(resolve(decodedPath));

  // Security: hard reject anything outside ~/.screenpipe/frames/
  if (!resolvedPath.startsWith(SCREENPIPE_FRAMES_DIR + '/') &&
      resolvedPath !== SCREENPIPE_FRAMES_DIR) {
    return new Response('Forbidden', { status: 403 });
  }

  if (!existsSync(resolvedPath)) {
    return new Response('Not found', { status: 404 });
  }

  // Stream the image file
  try {
    const stream = createReadStream(resolvedPath);
    const readable = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return new Response('Failed to read file', { status: 500 });
  }
}
