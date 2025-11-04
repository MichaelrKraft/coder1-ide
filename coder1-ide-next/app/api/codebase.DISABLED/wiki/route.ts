import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Redirect to the live codebase wiki in the IDE
  // The real wiki component is integrated into the IDE's PreviewPanel
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  return NextResponse.redirect(`${baseUrl}/ide`, { status: 302 });
}