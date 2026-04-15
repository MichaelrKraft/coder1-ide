/**
 * PH Scout Service
 *
 * Runs the Product Hunt gap analysis pipeline:
 * 1. Executes ~/ph-scout/run.sh (scrapes PH last 7 days via Firecrawl, runs Type A/B/C gap analysis)
 * 2. Reads the top Type A gap from ~/ph-scout/data/
 * 3. Writes the top gap to /tmp/full-flow-top-gap.json as the handoff for Full Flow Factory
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const PH_SCOUT_DIR = path.join(os.homedir(), 'ph-scout');
const PH_SCOUT_SCRIPT = path.join(PH_SCOUT_DIR, 'run.sh');
const PH_SCOUT_DATA_DIR = path.join(PH_SCOUT_DIR, 'data');
const HANDOFF_PATH = '/tmp/full-flow-top-gap.json';

export interface PhScoutResult {
  topGap: string;
  handoffPath: string;
  rawOutput: string;
}

export async function runPhScout(): Promise<PhScoutResult> {
  // Run the scout script if it exists
  if (fs.existsSync(PH_SCOUT_SCRIPT)) {
    await runScript(PH_SCOUT_SCRIPT);
  } else {
    console.warn(`[PhScout] run.sh not found at ${PH_SCOUT_SCRIPT} — skipping scrape, reading existing data`);
  }

  // Find the most recent gap analysis output file
  const topGap = readTopGap();

  // Write handoff file for Full Flow Factory
  const handoff = {
    idea: topGap,
    source: 'ph_scout',
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(HANDOFF_PATH, JSON.stringify(handoff, null, 2), 'utf8');

  return { topGap, handoffPath: HANDOFF_PATH, rawOutput: topGap };
}

function runScript(scriptPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', [scriptPath], {
      cwd: PH_SCOUT_DIR,
      env: { ...process.env },
      stdio: 'pipe',
    });

    let stderr = '';
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`PH Scout script exited with code ${code}: ${stderr}`));
      } else {
        resolve();
      }
    });

    proc.on('error', reject);

    // Hard timeout: 10 minutes
    setTimeout(() => {
      proc.kill();
      reject(new Error('PH Scout script timed out after 10 minutes'));
    }, 10 * 60 * 1000);
  });
}

function readTopGap(): string {
  // Look for a top-gap.json or gaps.json in the data directory
  if (!fs.existsSync(PH_SCOUT_DATA_DIR)) {
    return 'AI-powered task automation tool for solo founders (no specific PH data available)';
  }

  const files = fs.readdirSync(PH_SCOUT_DATA_DIR).sort().reverse();

  // Prefer a file named top-gap.json
  const topGapFile = files.find(f => f === 'top-gap.json');
  if (topGapFile) {
    const data = JSON.parse(fs.readFileSync(path.join(PH_SCOUT_DATA_DIR, topGapFile), 'utf8'));
    return data.idea || data.title || data.gap || JSON.stringify(data);
  }

  // Fall back to most recent gaps.json or analysis file
  const gapsFile = files.find(f => f.includes('gap') || f.includes('analysis'));
  if (gapsFile) {
    const data = JSON.parse(fs.readFileSync(path.join(PH_SCOUT_DATA_DIR, gapsFile), 'utf8'));
    // Handle array format (take first Type A gap)
    if (Array.isArray(data)) {
      const typeA = data.find((g: { type?: string }) => g.type === 'A') || data[0];
      return typeA?.idea || typeA?.title || typeA?.gap || JSON.stringify(typeA);
    }
    return data.idea || data.title || data.gap || JSON.stringify(data);
  }

  return 'AI-powered workflow automation for solo founders (no PH gap data found)';
}
