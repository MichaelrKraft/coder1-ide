import { NextResponse } from 'next/server';

export async function GET() {
  const enabled = process.env.FLOWTRACE_ENABLED === 'true';
  const configured = !!process.env.GEMINI_API_KEY;
  const cloudStorage = !!process.env.PINECONE_API_KEY;

  return NextResponse.json({
    running: false,
    enabled,
    configured,
    cloudStorage,
    screenpipeRunning: false,
  });
}
