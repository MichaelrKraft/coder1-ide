import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { Johnny5Skill, Johnny5APIResponse } from '@/types/johnny5';
import { getSkillRecord, updateSkillEnabled, deleteSkillRecord, upsertSkill, type SkillRecord } from '@/lib/johnny5-db';
import { initializeSkillsService } from '@/lib/skills-service';
import { shouldUseSkills } from '@/lib/skills-integration-utils';
import { DATA_DIR } from '@/lib/data-paths';

function toJohnny5Skill(record: SkillRecord): Johnny5Skill {
  return {
    id: record.id,
    name: record.name,
    description: record.description || '',
    trigger: (record.trigger_type as Johnny5Skill['trigger']) || 'manual',
    createdBy: (record.created_by as Johnny5Skill['createdBy']) || 'user',
    createdAt: new Date(record.installed_at),
    lastUsed: record.last_used_at ? new Date(record.last_used_at) : undefined,
    usageCount: record.usage_count,
    successRate: record.usage_count > 0 ? Math.round((record.success_count / record.usage_count) * 100) : 100,
    dependencies: [],
    enabled: record.enabled === 1,
    source: record.source as 'local' | 'clawhub',
    clawhubSlug: record.clawhub_slug || undefined,
    securityScore: (record.security_score as 'safe' | 'warning' | 'dangerous') || undefined,
  };
}

/**
 * GET /api/johnny5/skills/[skillId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { skillId: string } }
) {
  const { skillId } = params;

  // Try DB first
  const dbRecord = getSkillRecord(skillId);
  if (dbRecord) {
    return NextResponse.json({
      success: true,
      data: toJohnny5Skill(dbRecord),
      timestamp: new Date(),
    } as Johnny5APIResponse<Johnny5Skill>);
  }

  // Try SkillsService (local filesystem skills)
  if (shouldUseSkills()) {
    try {
      const service = await initializeSkillsService();
      const allSkills = service.getAllSkills();
      const meta = allSkills.find(s => s.id === skillId);
      if (meta) {
        const skill: Johnny5Skill = {
          id: meta.id,
          name: meta.name,
          description: meta.description,
          trigger: 'manual',
          createdBy: 'system',
          createdAt: new Date(),
          usageCount: 0,
          successRate: 100,
          dependencies: [],
          enabled: true,
          source: 'local',
        };
        return NextResponse.json({
          success: true,
          data: skill,
          timestamp: new Date(),
        } as Johnny5APIResponse<Johnny5Skill>);
      }
    } catch {
      // SkillsService not available
    }
  }

  return NextResponse.json(
    { success: false, error: 'Skill not found', timestamp: new Date() },
    { status: 404 }
  );
}

/**
 * PATCH /api/johnny5/skills/[skillId]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { skillId: string } }
) {
  const { skillId } = params;

  try {
    const body = await request.json();

    // Ensure skill exists in DB (create if only in SkillsService)
    let dbRecord = getSkillRecord(skillId);
    if (!dbRecord) {
      // Check SkillsService
      if (shouldUseSkills()) {
        try {
          const service = await initializeSkillsService();
          const meta = service.getAllSkills().find(s => s.id === skillId);
          if (meta) {
            upsertSkill({
              id: meta.id,
              name: meta.name,
              description: meta.description,
              source: 'local',
              created_by: 'system',
            });
            dbRecord = getSkillRecord(skillId);
          }
        } catch {
          // SkillsService not available
        }
      }
    }

    if (!dbRecord) {
      return NextResponse.json(
        { success: false, error: 'Skill not found', timestamp: new Date() },
        { status: 404 }
      );
    }

    // Update enabled state
    if (typeof body.enabled === 'boolean') {
      updateSkillEnabled(skillId, body.enabled);
    }

    // Update other fields via upsert
    if (body.name || body.description || body.trigger) {
      upsertSkill({
        id: skillId,
        name: body.name || dbRecord.name,
        description: body.description || dbRecord.description || undefined,
        trigger_type: body.trigger || dbRecord.trigger_type,
      });
    }

    // Update SKILL.md on disk if code or content changed
    if (body.code || body.name || body.description) {
      const skillDir = path.join(DATA_DIR, 'skills', skillId);
      try {
        await fs.access(skillDir);
        // Update metadata.json
        const metadataPath = path.join(skillDir, 'metadata.json');
        try {
          const existing = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
          const updated = {
            ...existing,
            name: body.name || existing.name,
            description: body.description || existing.description,
            lastUpdated: new Date().toISOString(),
          };
          await fs.writeFile(metadataPath, JSON.stringify(updated, null, 2), 'utf-8');
        } catch {
          // metadata.json doesn't exist yet, skip
        }

        // Update SKILL.md if code provided
        if (body.code) {
          const name = body.name || dbRecord.name;
          const desc = body.description || dbRecord.description || '';
          const skillMd = `# ${name}\n\n${desc}\n\n## Code\n\n\`\`\`javascript\n${body.code}\n\`\`\`\n`;
          await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillMd, 'utf-8');
        }
      } catch {
        // Skill directory doesn't exist on disk, skip update
      }
    }

    // Re-fetch updated record
    const updated = getSkillRecord(skillId);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch updated skill', timestamp: new Date() },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toJohnny5Skill(updated),
      timestamp: new Date(),
    } as Johnny5APIResponse<Johnny5Skill>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body', timestamp: new Date() },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/johnny5/skills/[skillId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { skillId: string } }
) {
  const { skillId } = params;
  const dbRecord = getSkillRecord(skillId);

  if (!dbRecord) {
    return NextResponse.json(
      { success: false, error: 'Skill not found', timestamp: new Date() },
      { status: 404 }
    );
  }

  // Prevent deletion of system skills
  if (dbRecord.created_by === 'system') {
    return NextResponse.json(
      { success: false, error: 'Cannot delete system skills', timestamp: new Date() },
      { status: 403 }
    );
  }

  // Clean up filesystem
  if (dbRecord.source === 'clawhub' && dbRecord.clawhub_slug) {
    // ClawHub skill: use the adapter's uninstall
    try {
      const { uninstallSkill } = await import('@/services/johnny5/clawhub-adapter');
      await uninstallSkill(dbRecord.clawhub_slug);
    } catch {
      // Filesystem cleanup failed but continue with DB deletion
    }
  } else {
    // User-created skill: remove from DATA_DIR/skills/
    const skillDir = path.join(DATA_DIR, 'skills', skillId);
    try {
      await fs.rm(skillDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist, non-fatal
    }
  }

  deleteSkillRecord(skillId);

  // Also remove from SkillsService cache
  if (shouldUseSkills()) {
    try {
      const service = await initializeSkillsService();
      service.uninstallSkill(skillId);
    } catch {
      // SkillsService not available
    }
  }

  return NextResponse.json({
    success: true,
    data: { deleted: true, skillId },
    timestamp: new Date(),
  } as Johnny5APIResponse<{ deleted: true; skillId: string }>);
}
