import { NextRequest, NextResponse } from 'next/server';
import { getLivingFilesTokenStats, loadLivingFiles, writeLivingFile, LIVING_FILES } from '@/lib/living-files';
import type { Johnny5APIResponse } from '@/types/johnny5';

interface AuditStats {
  files: Record<string, {
    lines: number;
    chars: number;
    estimatedTokens: number;
    writeMode: string;
  }>;
  totalTokens: number;
  totalLines: number;
  auditableFiles: string[];
}

/**
 * GET /api/johnny5/audit
 * Returns token usage statistics for all living files.
 * Identifies which files can be optimized and calculates total context cost.
 */
export async function GET() {
  try {
    const stats = getLivingFilesTokenStats();

    let totalTokens = 0;
    let totalLines = 0;
    const auditableFiles: string[] = [];

    for (const [filename, fileStat] of Object.entries(stats)) {
      totalTokens += fileStat.estimatedTokens;
      totalLines += fileStat.lines;

      // Skip auto-generated and empty files from audit suggestions
      if (fileStat.writeMode === 'auto' || fileStat.estimatedTokens === 0) continue;
      // Only suggest auditing files with significant content
      if (fileStat.estimatedTokens > 50) {
        auditableFiles.push(filename);
      }
    }

    const audit: AuditStats = {
      files: stats,
      totalTokens,
      totalLines,
      auditableFiles,
    };

    return NextResponse.json({
      success: true,
      data: audit,
      timestamp: new Date(),
    } as Johnny5APIResponse<AuditStats>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to audit living files', timestamp: new Date() },
      { status: 500 }
    );
  }
}

/**
 * POST /api/johnny5/audit
 * Apply audit changes to living files.
 * Expects { changes: Record<filename, newContent> }
 * Only modifies writable/append files (not readonly or auto).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.changes || typeof body.changes !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Changes object required', timestamp: new Date() },
        { status: 400 }
      );
    }

    const results: Record<string, { success: boolean; error?: string }> = {};

    for (const [filename, newContent] of Object.entries(body.changes)) {
      if (typeof newContent !== 'string') {
        results[filename] = { success: false, error: 'Content must be a string' };
        continue;
      }

      // Find the file config to check write mode
      const config = LIVING_FILES.find(f => f.filename === filename);
      if (!config) {
        results[filename] = { success: false, error: 'Unknown living file' };
        continue;
      }

      if (config.writeMode === 'readonly') {
        results[filename] = { success: false, error: 'File is readonly - manual edit required' };
        continue;
      }

      if (config.writeMode === 'auto') {
        results[filename] = { success: false, error: 'File is auto-generated - cannot modify' };
        continue;
      }

      // writeLivingFile creates a snapshot before writing
      const success = writeLivingFile(filename, newContent, 'replace');
      results[filename] = { success };
    }

    // Calculate before/after stats
    const afterStats = getLivingFilesTokenStats();
    let afterTotal = 0;
    for (const stat of Object.values(afterStats)) {
      afterTotal += stat.estimatedTokens;
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        afterStats: {
          totalTokens: afterTotal,
          files: afterStats,
        },
      },
      timestamp: new Date(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to apply audit changes', timestamp: new Date() },
      { status: 500 }
    );
  }
}
