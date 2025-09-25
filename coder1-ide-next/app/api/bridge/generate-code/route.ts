import { NextRequest, NextResponse } from 'next/server';
import { bridgeStore } from '@/lib/bridge-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ 
      error: 'User ID required' 
    }, { status: 400 });
  }

  // Generate code using shared store
  const code = bridgeStore.generateCode(userId);

  return NextResponse.json({
    code,
    expiresIn: 300,
    message: 'Enter this code in your Coder1 Bridge CLI'
  });
}