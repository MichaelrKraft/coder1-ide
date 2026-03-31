import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { flightRecorderExporter } = require('@/lib/flight-recorder/exporter');
    const exportData = await flightRecorderExporter.exportSession(id);

    const json = JSON.stringify(exportData, null, 2);
    const fileName = `recording-${id.substring(0, 8)}-${Date.now()}.coder1-recording`;

    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('[flight-recorder] Export error:', error);
    if (error instanceof Error && error.message === 'Session not found') {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to export session' }, { status: 500 });
  }
}
