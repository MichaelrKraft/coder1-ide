/**
 * Supervision Facts API
 *
 * POST /api/johnny5/supervision-facts
 *
 * Saves supervision observations as facts in the extracted_facts table.
 * Called by useTerminalSupervision hook when critical/warning events occur.
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveFacts, type ExtractedFact } from '@/services/memory/fact-extraction-service';
import { extractUserId } from '@/lib/auth/extract-user-id';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const userId = extractUserId(request);

    const body = await request.json();
    const { type, key, value, confidence } = body;

    if (!key || !value) {
      return NextResponse.json({ success: false, error: 'key and value required' }, { status: 400 });
    }

    // ExtractedFact type only allows: 'personal' | 'preference' | 'project' | 'technical' | 'goal'
    // Use 'goal' as the closest match for supervision observations.
    // The key field contains 'supervision_' prefix to distinguish them.
    const validTypes = ['personal', 'preference', 'project', 'technical', 'goal'];
    const factType = (validTypes.includes(type) ? type : 'goal') as ExtractedFact['type'];

    const fact: ExtractedFact = {
      type: factType,
      key,
      value,
      confidence: confidence || 0.8,
    };

    // Save to DB using existing fact extraction service.
    // Session ID 'supervision' groups all supervision-sourced facts.
    await saveFacts('supervision', [fact], undefined, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Supervision] Error saving fact:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save fact' },
      { status: 500 }
    );
  }
}
