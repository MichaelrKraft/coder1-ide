import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const DEFAULTS_PATH = path.join(os.homedir(), '.coder1', 'agent-defaults.json');

const VALID_MODELS = [
  'claude-sonnet-4-6',
  'claude-opus-4-6',
  'claude-haiku-4-5-20251001',
];

interface AgentDefaults {
  defaultModel: string;
  defaultBudgetCents: number;
  maxConcurrentRuns: number;
  systemPromptTemplate: string;
}

export async function GET(): Promise<NextResponse> {
  try {
    if (!fs.existsSync(DEFAULTS_PATH)) {
      return NextResponse.json({
        defaultModel: 'claude-sonnet-4-6',
        defaultBudgetCents: 500,
        maxConcurrentRuns: 3,
        systemPromptTemplate: '',
      });
    }
    const raw = fs.readFileSync(DEFAULTS_PATH, 'utf-8');
    const data = JSON.parse(raw) as AgentDefaults;
    return NextResponse.json(data);
  } catch (error) {
    console.error('[agent-hub] GET /settings/agent-defaults error:', error);
    return NextResponse.json({ error: 'Failed to read defaults' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { defaultModel, defaultBudgetCents, maxConcurrentRuns, systemPromptTemplate } = body;

    if (defaultModel && !VALID_MODELS.includes(defaultModel)) {
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
    }
    if (defaultBudgetCents !== undefined && (typeof defaultBudgetCents !== 'number' || defaultBudgetCents < 0)) {
      return NextResponse.json({ error: 'defaultBudgetCents must be a non-negative number' }, { status: 400 });
    }
    if (maxConcurrentRuns !== undefined && (typeof maxConcurrentRuns !== 'number' || maxConcurrentRuns < 1 || maxConcurrentRuns > 10)) {
      return NextResponse.json({ error: 'maxConcurrentRuns must be 1-10' }, { status: 400 });
    }
    if (systemPromptTemplate !== undefined && typeof systemPromptTemplate !== 'string') {
      return NextResponse.json({ error: 'systemPromptTemplate must be a string' }, { status: 400 });
    }

    const data: AgentDefaults = {
      defaultModel: defaultModel || 'claude-sonnet-4-6',
      defaultBudgetCents: defaultBudgetCents ?? 500,
      maxConcurrentRuns: maxConcurrentRuns ?? 3,
      systemPromptTemplate: (systemPromptTemplate || '').slice(0, 4096),
    };

    const dir = path.dirname(DEFAULTS_PATH);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DEFAULTS_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[agent-hub] PUT /settings/agent-defaults error:', error);
    return NextResponse.json({ error: 'Failed to save defaults' }, { status: 500 });
  }
}
