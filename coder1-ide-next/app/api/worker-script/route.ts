import { NextRequest, NextResponse } from 'next/server';

// Stub endpoint to prevent MODULE_NOT_FOUND errors during file processing
// This prevents the server from crashing when certain operations trigger worker script requests
export async function POST(request: NextRequest) {
  console.log('⚡ Worker script stub called - preventing crash');
  
  // Return a simple success response
  return NextResponse.json({
    success: true,
    message: 'Worker script processed',
    stub: true, // Indicate this is a stub implementation
    timestamp: new Date().toISOString()
  });
}

export async function GET(request: NextRequest) {
  console.log('⚡ Worker script stub GET called');
  
  return NextResponse.json({
    status: 'ok',
    message: 'Worker script endpoint active',
    stub: true,
    timestamp: new Date().toISOString()
  });
}