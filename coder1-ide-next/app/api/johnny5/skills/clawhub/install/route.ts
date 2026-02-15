import { NextRequest, NextResponse } from 'next/server';
import type { Johnny5APIResponse, SkillSecurityReport } from '@/types/johnny5';
import { installSkill, isSkillInstalled, getSkillDetails, scoreCompatibility } from '@/services/johnny5/clawhub-adapter';
import { upsertSkill } from '@/lib/johnny5-db';
import { initializeSkillsService } from '@/lib/skills-service';
import { shouldUseSkills } from '@/lib/skills-integration-utils';

interface InstallResult {
  installed: boolean;
  securityReport: SkillSecurityReport;
  skillId?: string;
  error?: string;
}

/**
 * POST /api/johnny5/skills/clawhub/install
 *
 * Install a community skill from the Skills Store.
 *
 * Request body:
 * - slug: string (required) — ClawHub skill slug
 * - version: string (optional) — specific version
 * - force: boolean (optional) — install despite warnings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.slug) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: slug', timestamp: new Date() },
        { status: 400 }
      );
    }

    const { slug, version, force } = body;

    // Check if already installed
    const alreadyInstalled = await isSkillInstalled(slug);
    if (alreadyInstalled && !force) {
      return NextResponse.json(
        { success: false, error: 'Skill is already installed. Use force=true to reinstall.', timestamp: new Date() },
        { status: 409 }
      );
    }

    // Install skill (includes security scanning)
    const result = await installSkill(slug, { version, force });

    if (!result.success) {
      const status = result.securityReport.score === 'dangerous' ? 403 : 400;
      const response: Johnny5APIResponse<InstallResult> = {
        success: false,
        data: {
          installed: false,
          securityReport: result.securityReport,
          error: result.error,
        },
        error: result.error,
        timestamp: new Date(),
      };
      return NextResponse.json(response, { status });
    }

    // Save to DB
    const skillId = `clawhub-${slug}`;
    let compatibility: string | undefined;
    try {
      const details = await getSkillDetails(slug);
      compatibility = scoreCompatibility(details as unknown as Record<string, unknown>);
    } catch {
      // Details fetch failed, skip compatibility scoring
    }

    upsertSkill({
      id: skillId,
      name: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: '',
      source: 'clawhub',
      clawhub_slug: slug,
      clawhub_version: version || 'latest',
      created_by: 'user',
      enabled: true,
      security_score: result.securityReport.score,
    });

    // Refresh SkillsService to pick up the new skill
    if (shouldUseSkills()) {
      try {
        const service = await initializeSkillsService();
        await service.refreshSkills();
      } catch {
        // Service refresh failed, skill will be picked up on next restart
      }
    }

    const response: Johnny5APIResponse<InstallResult> = {
      success: true,
      data: {
        installed: true,
        securityReport: result.securityReport,
        skillId,
      },
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Installation failed';
    return NextResponse.json(
      { success: false, error: message, timestamp: new Date() },
      { status: 500 }
    );
  }
}
