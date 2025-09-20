import { NextRequest, NextResponse } from 'next/server';

// Store pairing codes in memory (in production, use Redis or database)
const pairingCodes = new Map<string, { userId: string; expires: number }>();

// Clean up expired codes periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of pairingCodes.entries()) {
    if (data.expires < now) {
      pairingCodes.delete(code);
    }
  }
}, 60000); // Clean every minute

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ 
      error: 'User ID required' 
    }, { status: 400 });
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store with 5 minute expiration
  pairingCodes.set(code, {
    userId,
    expires: Date.now() + 300000 // 5 minutes
  });

  return NextResponse.json({
    code,
    expiresIn: 300,
    message: 'Enter this code in your Coder1 Bridge CLI'
  });
}

// Export pairingCodes for use in pair endpoint
export { pairingCodes };