import { NextResponse } from 'next/server';
import { claimAlphaTesterNumber } from '@/lib/johnny5-db';

export async function POST() {
  try {
    const number = await claimAlphaTesterNumber();
    return NextResponse.json({ number });
  } catch (error) {
    console.error('[alpha-tester] claim error:', error);
    return NextResponse.json({ error: 'Failed to claim number' }, { status: 500 });
  }
}
