import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import { getVaultService } from '@/lib/vault-service';
import { assertLocalOnly } from '@/lib/vault-security';
import { featureFlags } from '@/config/feature-flags';

function guardVault() {
  assertLocalOnly();
  if (!featureFlags.isEnabled('VAULT_ENABLED')) {
    return NextResponse.json({ error: 'Vault feature is not enabled' }, { status: 403 });
  }
  return null;
}

// POST /api/vault/daily-log
// body: { commands: string[]; workingDir: string }
// response: { path: string; created: boolean }
export async function POST(req: NextRequest) {
  try {
    const guard = guardVault();
    if (guard) return guard;

    const body = await req.json();

    const commands: string[] = Array.isArray(body.commands) ? body.commands : [];
    const workingDir: string = typeof body.workingDir === 'string' ? body.workingDir : process.cwd();

    // Compute today's date in YYYY-MM-DD (server local time)
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const logPath = `Dev-Log/${dateStr}.md`;

    const vault = getVaultService();

    // Check if note already exists
    const existing = await vault.getNote(logPath);
    if (existing) {
      return NextResponse.json({ path: logPath, created: false });
    }

    // Run git log — fully wrapped in try/catch
    let gitFiles: string[] = [];
    try {
      const workDir = workingDir && path.isAbsolute(workingDir) ? workingDir : process.cwd();
      const output = execSync(
        `git log --oneline --since="${dateStr} 00:00:00" --name-only --no-merges --pretty=format:"%s" 2>/dev/null | grep -v "^$" | sort -u`,
        { cwd: workDir, timeout: 5000, encoding: 'utf8' }
      );
      gitFiles = output.split('\n').filter((l) => l.trim() && !l.trim().startsWith('fix') && l.includes('.'));
    } catch {
      gitFiles = [];
    }

    // Build template
    const filesSection =
      gitFiles.length > 0
        ? gitFiles.slice(0, 20).map((f) => `- ${f}`).join('\n')
        : '_No git changes found_';

    const commandsSection =
      commands.length > 0
        ? commands.slice(-20).map((c) => `- \`${c.slice(0, 120)}\``).join('\n')
        : '_No commands recorded_';

    const template = `# Dev Log - ${dateStr}

## Files Changed
${filesSection}

## Terminal Commands
${commandsSection}

## Open Questions
<!-- Add questions here -->
`;

    await vault.createNote({
      path: logPath,
      title: `Dev Log - ${dateStr}`,
      content: template,
    });

    return NextResponse.json({ path: logPath, created: true });
  } catch (err) {
    console.error('[vault daily-log POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
