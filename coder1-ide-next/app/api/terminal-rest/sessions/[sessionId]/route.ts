import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const EXPRESS_BACKEND_URL = process.env.EXPRESS_BACKEND_URL || 'http://localhost:3001';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  // DISABLED: Terminal session cleanup is handled by unified server in-memory management
  // The unified server (server.js) manages terminal sessions entirely through Socket.IO and 
  // automatic cleanup intervals. No REST API deletion needed.
  logger.info(`Terminal session cleanup disabled - sessions managed by unified server: ${params.sessionId}`);
  
  return NextResponse.json(
    { 
      message: 'Terminal session cleanup disabled - managed by unified server',
      sessionId: params.sessionId,
      note: 'Sessions are automatically cleaned up by the unified server memory management'
    },
    { status: 200 }
  );
}