import { NextRequest, NextResponse } from 'next/server';

const EXPRESS_BACKEND_URL = 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${EXPRESS_BACKEND_URL}/api/sessions`);
    
    if (!response.ok) {
      console.error('Failed to fetch sessions from Express backend');
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Sessions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${EXPRESS_BACKEND_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to create session:', error);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Create session API error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}