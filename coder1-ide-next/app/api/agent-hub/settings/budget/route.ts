import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAgentHubDatabase } from '@/lib/agent-hub/db';

const BUDGET_PATH = path.join(os.homedir(), '.coder1', 'budget.json');

interface BudgetConfig {
  monthlyCapCents: number;
  alertThresholdPercent: number;
}

function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00.000Z`;
}

export async function GET(): Promise<NextResponse> {
  try {
    let config: BudgetConfig = {
      monthlyCapCents: 10000,
      alertThresholdPercent: 80,
    };

    if (fs.existsSync(BUDGET_PATH)) {
      const raw = fs.readFileSync(BUDGET_PATH, 'utf-8');
      config = JSON.parse(raw) as BudgetConfig;
    }

    let currentMonthSpendCents = 0;
    try {
      const db = getAgentHubDatabase();
      const monthStart = getMonthStart();
      const row = db
        .prepare(
          'SELECT COALESCE(SUM(cost_cents), 0) as total FROM agent_hub_runs WHERE started_at >= ?'
        )
        .get(monthStart) as { total: number };
      currentMonthSpendCents = row.total;
    } catch {
      // DB may not have data yet
    }

    return NextResponse.json({
      monthlyCapCents: config.monthlyCapCents,
      alertThresholdPercent: config.alertThresholdPercent,
      currentMonthSpendCents,
    });
  } catch (error) {
    console.error('[agent-hub] GET /settings/budget error:', error);
    return NextResponse.json({ error: 'Failed to read budget' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { monthlyCapCents, alertThresholdPercent } = body;

    if (monthlyCapCents !== undefined && (typeof monthlyCapCents !== 'number' || monthlyCapCents < 0)) {
      return NextResponse.json({ error: 'monthlyCapCents must be a non-negative number' }, { status: 400 });
    }
    if (alertThresholdPercent !== undefined && (typeof alertThresholdPercent !== 'number' || alertThresholdPercent < 0 || alertThresholdPercent > 100)) {
      return NextResponse.json({ error: 'alertThresholdPercent must be 0-100' }, { status: 400 });
    }

    const data: BudgetConfig = {
      monthlyCapCents: monthlyCapCents ?? 10000,
      alertThresholdPercent: alertThresholdPercent ?? 80,
    };

    const dir = path.dirname(BUDGET_PATH);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BUDGET_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[agent-hub] PUT /settings/budget error:', error);
    return NextResponse.json({ error: 'Failed to save budget' }, { status: 500 });
  }
}
