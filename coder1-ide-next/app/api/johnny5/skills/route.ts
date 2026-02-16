import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { Johnny5Skill, Johnny5APIResponse } from '@/types/johnny5';
import { initializeSkillsService } from '@/lib/skills-service';
import { getSkillRecords, upsertSkill, type SkillRecord } from '@/lib/johnny5-db';
import { shouldUseSkills } from '@/lib/skills-integration-utils';
import { DATA_DIR } from '@/lib/data-paths';

/**
 * Convert a SkillRecord from the DB + SkillMetadata from SkillsService into a Johnny5Skill
 */
function toJohnny5Skill(dbRecord: SkillRecord | null, meta?: { id: string; name: string; description: string; category: string; tags: string[] }): Johnny5Skill {
  if (dbRecord) {
    return {
      id: dbRecord.id,
      name: dbRecord.name,
      description: dbRecord.description || '',
      trigger: (dbRecord.trigger_type as Johnny5Skill['trigger']) || 'manual',
      createdBy: (dbRecord.created_by as Johnny5Skill['createdBy']) || 'user',
      createdAt: new Date(dbRecord.installed_at),
      lastUsed: dbRecord.last_used_at ? new Date(dbRecord.last_used_at) : undefined,
      usageCount: dbRecord.usage_count,
      successRate: dbRecord.usage_count > 0 ? Math.round((dbRecord.success_count / dbRecord.usage_count) * 100) : 100,
      dependencies: [],
      enabled: dbRecord.enabled === 1,
      source: dbRecord.source as 'local' | 'clawhub',
      clawhubSlug: dbRecord.clawhub_slug || undefined,
      securityScore: (dbRecord.security_score as 'safe' | 'warning' | 'dangerous') || undefined,
    };
  }

  // Fallback: create from SkillsService metadata (no DB record yet)
  if (meta) {
    return {
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
  }

  throw new Error('Either dbRecord or meta must be provided');
}

/**
 * GET /api/johnny5/skills
 *
 * Returns all skills, merging SkillsService metadata with DB records.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const enabledFilter = searchParams.get('enabled');
    const createdByFilter = searchParams.get('createdBy');
    const triggerFilter = searchParams.get('trigger');
    const sourceFilter = searchParams.get('source');

    // Get DB records
    const dbRecords = getSkillRecords();
    const dbMap = new Map(dbRecords.map(r => [r.id, r]));

    // Get SkillsService metadata (local skills from filesystem)
    let serviceSkills: Array<{ id: string; name: string; description: string; category: string; tags: string[] }> = [];
    if (shouldUseSkills()) {
      try {
        const service = await initializeSkillsService();
        serviceSkills = service.getAllSkills();
      } catch {
        // SkillsService not available
      }
    }

    // Merge: DB records take priority, service skills fill gaps
    const skillMap = new Map<string, Johnny5Skill>();

    // Add all DB records
    for (const record of dbRecords) {
      skillMap.set(record.id, toJohnny5Skill(record));
    }

    // Add service skills not in DB
    for (const meta of serviceSkills) {
      if (!skillMap.has(meta.id)) {
        skillMap.set(meta.id, toJohnny5Skill(null, meta));
      }
    }

    let skills = Array.from(skillMap.values());

    // Apply filters
    if (enabledFilter !== null) {
      const enabled = enabledFilter === 'true';
      skills = skills.filter(s => s.enabled === enabled);
    }
    if (createdByFilter) {
      skills = skills.filter(s => s.createdBy === createdByFilter);
    }
    if (triggerFilter) {
      skills = skills.filter(s => s.trigger === triggerFilter);
    }
    if (sourceFilter) {
      skills = skills.filter(s => s.source === sourceFilter);
    }

    const response: Johnny5APIResponse<Johnny5Skill[]> = {
      success: true,
      data: skills,
      timestamp: new Date(),
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to load skills', timestamp: new Date() },
      { status: 500 }
    );
  }
}

/**
 * POST /api/johnny5/skills
 *
 * Create a new skill.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.description || !body.trigger) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, description, trigger', timestamp: new Date() },
        { status: 400 }
      );
    }

    const id = `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save to DB
    upsertSkill({
      id,
      name: body.name,
      description: body.description,
      trigger_type: body.trigger,
      created_by: 'user',
      source: 'local',
      enabled: true,
    });

    // Write skill to disk so SkillsService can discover it
    const skillDir = path.join(DATA_DIR, 'skills', id);
    try {
      await fs.mkdir(skillDir, { recursive: true });

      // Write metadata.json (Tier 1)
      const skillMetadata = {
        id,
        name: body.name,
        description: body.description,
        category: body.category || 'productivity',
        tools: body.dependencies || [],
        version: '1.0.0',
        estimatedTokens: Math.ceil((body.code || '').length / 4),
        lastUpdated: new Date().toISOString(),
        author: 'user',
        tags: [],
      };
      await fs.writeFile(
        path.join(skillDir, 'metadata.json'),
        JSON.stringify(skillMetadata, null, 2),
        'utf-8'
      );

      // Write SKILL.md (Tier 2)
      const skillMd = `# ${body.name}\n\n${body.description}\n\n## Code\n\n\`\`\`javascript\n${body.code || ''}\n\`\`\`\n`;
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillMd, 'utf-8');

      // Refresh SkillsService cache so the new skill is immediately discoverable
      if (shouldUseSkills()) {
        try {
          const service = await initializeSkillsService();
          await service.refreshSkills();
        } catch {
          // Non-fatal: skill is on disk, will be found on next restart
        }
      }
    } catch (diskError) {
      console.error('[Skills] Failed to write skill to disk:', diskError);
      // Non-fatal: skill is in DB, disk write is best-effort
    }

    const newSkill: Johnny5Skill = {
      id,
      name: body.name,
      description: body.description,
      trigger: body.trigger,
      createdBy: 'user',
      createdAt: new Date(),
      usageCount: 0,
      successRate: 100,
      dependencies: body.dependencies || [],
      code: body.code,
      enabled: true,
      source: 'local',
    };

    const response: Johnny5APIResponse<Johnny5Skill> = {
      success: true,
      data: newSkill,
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body', timestamp: new Date() },
      { status: 400 }
    );
  }
}
