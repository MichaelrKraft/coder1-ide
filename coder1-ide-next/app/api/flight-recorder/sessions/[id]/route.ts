import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getStorage() {
  const { FlightRecorderStorage } = require('@/lib/flight-recorder/storage');
  return FlightRecorderStorage.getInstance();
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const storage = getStorage();
    const session = storage.getSession(id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const eventCounts = storage.getEventCountByType(id);

    return NextResponse.json({ session, eventCounts });
  } catch (error) {
    console.error('[flight-recorder] Session detail error:', error);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const storage = getStorage();
    const session = storage.getSession(id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    storage.deleteSession(id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('[flight-recorder] Session delete error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json();
    const storage = getStorage();

    const session = storage.getSession(id);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const updates: { starred?: boolean; metadata?: string } = {};

    if (typeof body.starred === 'boolean') {
      updates.starred = body.starred;
    }
    if (body.metadata && typeof body.metadata === 'object') {
      updates.metadata = JSON.stringify(body.metadata);
    }

    storage.updateSession(id, updates);
    const updated = storage.getSession(id);

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error('[flight-recorder] Session update error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
