import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const PROJECT_ROOT = process.env.PROJECT_ROOT || path.join(process.cwd(), '..');

// List of markdown files to include
const PROJECT_DOCS = [
  'ARCHITECTURE.md',
  'CLAUDE.md',
  'CONTEXT_FOLDERS_MEMORY_SYSTEM.md',
  'FUTURE_FEATURES_WORKFLOWS.md',
  'MAGIC_UI_STUDIO_TESTING_REPORT.md',
  'README.md',
  'REPOSITORY_STATUS.md',
  'AI_MASTERMIND_BIBLE.md',
  'MASTER_CONTEXT.md',
  'TEST_RESULTS.md'
];

export async function GET(request: NextRequest) {
  // SECURITY FIX (Oct 27, 2025): This endpoint exposed parent directory documentation
  // Disabled for alpha launch - project docs should not be publicly accessible
  return NextResponse.json(
    { 
      success: false,
      error: 'This endpoint has been disabled for security reasons',
      message: 'Project documentation is not publicly accessible'
    },
    { status: 403 }
  );
}

// GET specific document by name
export async function POST(request: NextRequest) {
  // SECURITY FIX (Oct 27, 2025): This endpoint exposed parent directory documentation
  // Disabled for alpha launch - project docs should not be publicly accessible
  return NextResponse.json(
    { 
      success: false,
      error: 'This endpoint has been disabled for security reasons',
      message: 'Project documentation is not publicly accessible'
    },
    { status: 403 }
  );
}