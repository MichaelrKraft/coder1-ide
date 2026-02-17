import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { Johnny5APIResponse, SkillVersion } from '@/types/johnny5';
import {
  getSkillVersions,
  insertSkillVersion,
  getLatestSkillVersion,
  getSkillFeedback,
  markFeedbackApplied,
  getSkillRecord,
} from '@/lib/johnny5-db';
import { DATA_DIR } from '@/lib/data-paths';
import { initializeSkillsService } from '@/lib/skills-service';
import { shouldUseSkills } from '@/lib/skills-integration-utils';

/**
 * GET /api/johnny5/skills/[skillId]/versions
 * Returns version history for a skill
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { skillId: string } }
) {
  const { skillId } = params;

  const versionRecords = getSkillVersions(skillId);
  const versions: SkillVersion[] = versionRecords.map(r => ({
    id: r.id,
    skillId: r.skill_id,
    version: r.version,
    skillMdContent: r.skill_md_content,
    changeSummary: r.change_summary ?? undefined,
    feedbackId: r.feedback_id ?? undefined,
    createdAt: new Date(r.created_at),
  }));

  return NextResponse.json({
    success: true,
    data: versions,
    timestamp: new Date(),
  } as Johnny5APIResponse<SkillVersion[]>);
}

/**
 * POST /api/johnny5/skills/[skillId]/versions
 * Create a new version of a skill based on feedback.
 * Expects { updatedContent: string, changeSummary: string, feedbackId?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { skillId: string } }
) {
  const { skillId } = params;

  try {
    const body = await request.json();

    if (!body.updatedContent) {
      return NextResponse.json(
        { success: false, error: 'updatedContent is required', timestamp: new Date() },
        { status: 400 }
      );
    }

    const skillDir = path.join(DATA_DIR, 'skills', skillId);
    const skillMdPath = path.join(skillDir, 'SKILL.md');

    // Save the current SKILL.md as a version before updating
    let currentContent = '';
    try {
      currentContent = await fs.readFile(skillMdPath, 'utf-8');
    } catch {
      // No existing SKILL.md - this is the first version
    }

    const currentVersion = getLatestSkillVersion(skillId);

    // If there's existing content and no versions yet, save version 1
    if (currentContent && currentVersion === 0) {
      const v1Id = `sv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      insertSkillVersion({
        id: v1Id,
        skill_id: skillId,
        version: 1,
        skill_md_content: currentContent,
        change_summary: 'Initial version (before feedback)',
      });
    }

    // Create the new version
    const newVersion = (currentVersion === 0 && currentContent ? 1 : currentVersion) + 1;
    const versionId = `sv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    insertSkillVersion({
      id: versionId,
      skill_id: skillId,
      version: newVersion,
      skill_md_content: body.updatedContent,
      change_summary: body.changeSummary || 'Updated from feedback',
      feedback_id: body.feedbackId,
    });

    // Mark feedback as applied
    if (body.feedbackId) {
      markFeedbackApplied(body.feedbackId);
    }

    // Write the updated SKILL.md to disk
    try {
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(skillMdPath, body.updatedContent, 'utf-8');

      // Refresh SkillsService cache
      if (shouldUseSkills()) {
        try {
          const service = await initializeSkillsService();
          await service.refreshSkills();
        } catch {
          // Non-fatal
        }
      }
    } catch (diskError) {
      console.error('[Skills] Failed to write updated SKILL.md:', diskError);
    }

    const version: SkillVersion = {
      id: versionId,
      skillId,
      version: newVersion,
      skillMdContent: body.updatedContent,
      changeSummary: body.changeSummary || 'Updated from feedback',
      feedbackId: body.feedbackId,
      createdAt: new Date(),
    };

    return NextResponse.json({
      success: true,
      data: version,
      timestamp: new Date(),
    } as Johnny5APIResponse<SkillVersion>, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body', timestamp: new Date() },
      { status: 400 }
    );
  }
}
