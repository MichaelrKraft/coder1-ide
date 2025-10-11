import { NextRequest, NextResponse } from 'next/server';

/**
 * Eternal Memory Save API - Premium Feature
 * 
 * This is a premium feature that requires an active trial or Pro subscription.
 * 
 * Features:
 * - Persistent session memory across Claude sessions
 * - Intelligent context preservation
 * - 30-day memory retention after trial expiry
 * 
 * To use this feature:
 * 1. Start your 7-day free trial
 * 2. Or upgrade to Pro ($29/month)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await request.json();
    
    // Premium API endpoint (closed source, not included in open source version)
    const premiumEndpoint = process.env.PREMIUM_API_URL || 'http://localhost:3003';
    
    // Check if premium API is configured
    if (!premiumEndpoint) {
      return NextResponse.json({ 
        success: false,
        requiresPremium: true,
        message: 'Eternal Memory is a premium feature',
        action: 'start_trial',
        trialDays: 7,
        proPrice: '$29/month'
      }, { status: 403 });
    }
    
    // Forward request to premium API
    const response = await fetch(`${premiumEndpoint}/api/premium/memory/store`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-User-Id': request.headers.get('X-User-Id') || 'unknown'
      },
      body: JSON.stringify({
        userId: request.headers.get('X-User-Id') || 'unknown',
        sessionId: session.sessionId,
        sessionData: session
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // Handle premium feature access denied
      if (response.status === 403) {
        return NextResponse.json({ 
          success: false,
          requiresPremium: true,
          message: errorData.message || 'Eternal Memory requires active trial or Pro subscription',
          action: 'start_trial',
          trialDays: 7,
          proPrice: '$29/month'
        }, { status: 403 });
      }
      
      throw new Error(errorData.message || 'Premium API error');
    }
    
    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error saving session to premium memory:', error);
    
    // Return premium feature message on any error
    return NextResponse.json({ 
      success: false,
      requiresPremium: true,
      message: 'Eternal Memory is a premium feature. Start your 7-day trial to enable persistent memory.',
      action: 'start_trial',
      trialDays: 7,
      proPrice: '$29/month',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 403 });
  }
}
