import { NextResponse } from 'next/server';

export async function GET() {
  // Redirect to the live codebase wiki in the IDE
  // The real wiki component is integrated into the IDE's PreviewPanel
  return NextResponse.redirect('/ide', { status: 302 });
}