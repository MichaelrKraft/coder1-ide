/**
 * Full Flow Factory Service
 *
 * Reads the top PH gap from /tmp/full-flow-top-gap.json (written by PH Scout),
 * then spawns Claude Code with /full-flow --autonomous so the entire pipeline
 * (discover → brand → PRD → 10 landing pages) runs end-to-end without human gates.
 *
 * Output is deposited in outputs/full-flow/{date}-{slug}/
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const HANDOFF_PATH = '/tmp/full-flow-top-gap.json';
const OUTPUT_BASE = path.join(process.cwd(), 'outputs', 'full-flow');

export interface FullFlowFactoryResult {
  idea: string;
  pid: number;
  outputDir: string;
  logPath: string;
}

export async function runFullFlowFactory(): Promise<FullFlowFactoryResult> {
  // Read idea from PH Scout handoff
  const idea = readHandoff();

  // Ensure output directory exists
  const dateSlug = new Date().toISOString().slice(0, 10);
  const nameSlug = idea.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  const outputDir = path.join(OUTPUT_BASE, `${dateSlug}-${nameSlug}`);
  fs.mkdirSync(outputDir, { recursive: true });

  const logPath = path.join(outputDir, 'run.log');
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });

  logStream.write(`[FullFlowFactory] Starting at ${new Date().toISOString()}\n`);
  logStream.write(`[FullFlowFactory] Idea: ${idea}\n`);

  // Spawn claude --print with the full-flow command in autonomous mode
  // --autonomous flag skips human-gate .md files and auto-proceeds through all phases
  const claudePath = findClaudeBin();
  const proc = spawn(
    claudePath,
    ['--print', `--output-dir "${outputDir}" /full-flow --autonomous "${idea}"`],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        FULL_FLOW_AUTONOMOUS: '1',
        FULL_FLOW_OUTPUT_DIR: outputDir,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true, // Run in background — cron job returns immediately
    }
  );

  proc.stdout?.on('data', (d: Buffer) => logStream.write(d));
  proc.stderr?.on('data', (d: Buffer) => logStream.write(d));

  proc.on('close', (code) => {
    logStream.write(`[FullFlowFactory] Exited with code ${code} at ${new Date().toISOString()}\n`);
    logStream.end();
  });

  proc.on('error', (err) => {
    logStream.write(`[FullFlowFactory] Error: ${err.message}\n`);
    logStream.end();
  });

  // Unref so the parent process (cron service) doesn't wait for it
  proc.unref();

  const pid = proc.pid ?? -1;
  console.log(`[FullFlowFactory] Spawned claude pid=${pid} for idea="${idea}" → ${outputDir}`);

  return { idea, pid, outputDir, logPath };
}

function readHandoff(): string {
  if (!fs.existsSync(HANDOFF_PATH)) {
    throw new Error(`No PH Scout handoff found at ${HANDOFF_PATH} — run PH Scout first`);
  }
  const data = JSON.parse(fs.readFileSync(HANDOFF_PATH, 'utf8'));
  const idea = data.idea || data.title || data.gap;
  if (!idea) {
    throw new Error(`Handoff file at ${HANDOFF_PATH} has no idea/title/gap field`);
  }
  return idea;
}

function findClaudeBin(): string {
  // Common install locations for the claude CLI
  const candidates = [
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    `${os.homedir()}/.local/bin/claude`,
    'claude', // fall back to PATH
  ];
  for (const c of candidates) {
    if (c === 'claude' || fs.existsSync(c)) return c;
  }
  return 'claude';
}
