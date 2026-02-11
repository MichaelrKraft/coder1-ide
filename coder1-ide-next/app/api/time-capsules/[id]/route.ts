import { NextRequest, NextResponse } from 'next/server';
import { features } from '@/lib/feature-flags';
import { getTimeCapsuleById, deleteTimeCapsule } from '@/lib/time-capsule-db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/time-capsules/:id
 * Get full Time Capsule details by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!features().timeCapsules) {
    return NextResponse.json(
      { error: 'Time Capsules feature is not enabled' },
      { status: 404 }
    );
  }

  try {
    const capsule = await getTimeCapsuleById(params.id);

    if (!capsule) {
      return NextResponse.json(
        { error: 'Time Capsule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, capsule });
  } catch (error) {
    console.error('[Time Capsule API] GET by ID error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/time-capsules/:id
 * Delete a Time Capsule. Requires user_id in request body for ownership check.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!features().timeCapsules) {
    return NextResponse.json(
      { error: 'Time Capsules feature is not enabled' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const userId = body.user_id;

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required for deletion' },
        { status: 400 }
      );
    }

    const deleted = await deleteTimeCapsule(params.id, userId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Time Capsule not found or not owned by user' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Time Capsule API] DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
