import { NextRequest, NextResponse } from 'next/server';
import { getExistingFacts, getRelevantFacts } from '@/services/memory/fact-extraction-service';
import { extractUserId } from '@/lib/auth/extract-user-id';

export async function GET(request: NextRequest) {
  try {
    const userId = extractUserId(request);

    const { searchParams } = new URL(request.url);
    const task = searchParams.get('task') || '';

    // Get all high-confidence facts about the user
    const allFacts = await getExistingFacts(undefined, 30, userId);

    // Get task-relevant facts if a task description is provided
    const relevantFacts = task ? await getRelevantFacts(task, 10, userId) : [];

    // Build context string
    const sections: string[] = [];

    // User profile section
    const personalFacts = allFacts.filter(f =>
      f.fact_key.startsWith('user_') ||
      f.fact_key.includes('name') ||
      f.fact_key.includes('role') ||
      f.fact_key.includes('location')
    );
    if (personalFacts.length > 0) {
      sections.push('## User Profile');
      for (const f of personalFacts) {
        sections.push(`- ${f.fact_key}: ${f.fact_value}`);
      }
    }

    // Preferences section
    const prefFacts = allFacts.filter(f =>
      f.fact_key.includes('prefer') ||
      f.fact_key.includes('favorite') ||
      f.fact_key.includes('likes') ||
      f.fact_key.includes('dislikes')
    );
    if (prefFacts.length > 0) {
      sections.push('\n## Preferences');
      for (const f of prefFacts) {
        sections.push(`- ${f.fact_key}: ${f.fact_value}`);
      }
    }

    // Technical context
    const techFacts = allFacts.filter(f =>
      f.fact_key.includes('project') ||
      f.fact_key.includes('tech') ||
      f.fact_key.includes('framework') ||
      f.fact_key.includes('language')
    );
    if (techFacts.length > 0) {
      sections.push('\n## Technical Context');
      for (const f of techFacts) {
        sections.push(`- ${f.fact_key}: ${f.fact_value}`);
      }
    }

    // Supervision notes
    const supFacts = allFacts.filter(f => f.fact_key.startsWith('supervision_'));
    if (supFacts.length > 0) {
      sections.push('\n## Recent Supervision Notes');
      for (const f of supFacts.slice(0, 5)) {
        sections.push(`- ${f.fact_value}`);
      }
    }

    // Task-specific context
    if (relevantFacts.length > 0) {
      sections.push('\n## Relevant to Current Task');
      for (const f of relevantFacts) {
        sections.push(`- ${f.key}: ${f.value}`);
      }
    }

    const context = sections.length > 0
      ? `# Context from Johnny5 (AI Assistant)\n\n${sections.join('\n')}`
      : '';

    // Cap at 3000 chars to avoid overwhelming Claude Code's context
    const cappedContext = context.slice(0, 3000);

    return NextResponse.json({
      success: true,
      context: cappedContext,
      factCount: allFacts.length,
      hasContext: cappedContext.length > 0,
    });
  } catch (error) {
    console.error('[Johnny5] Error generating Claude context:', error);
    return NextResponse.json({ success: false, context: '', factCount: 0, hasContext: false });
  }
}
