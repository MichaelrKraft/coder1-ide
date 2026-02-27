import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const ADMIN_TOKEN = process.env.ALPHA_ADMIN_TOKEN;

function verifyAdmin(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  const cookie = request.cookies.get('coder1-admin')?.value;
  if (cookie === ADMIN_TOKEN) return true;
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.includes(ADMIN_TOKEN)) return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dataDir = path.join(process.cwd(), 'data', 'usage');
    const weeklyData: Array<{ date: string; totalTokens: number; totalCost: number; sessions: number }> = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const filePath = path.join(dataDir, `${dateStr}.json`);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const dayData = JSON.parse(content);
        weeklyData.push({
          date: dateStr,
          totalTokens: dayData.totalTokens ?? 0,
          totalCost: dayData.totalCost ?? 0,
          sessions: dayData.sessions ?? 0,
        });
      } catch {
        weeklyData.push({ date: dateStr, totalTokens: 0, totalCost: 0, sessions: 0 });
      }
    }

    const totalTokens7d = weeklyData.reduce((s, d) => s + d.totalTokens, 0);
    const totalCost7d = weeklyData.reduce((s, d) => s + d.totalCost, 0);
    const avgDailyCost = totalCost7d / 7;
    const projectedMonthlyCost = avgDailyCost * 30;
    const today = weeklyData[weeklyData.length - 1];

    return NextResponse.json({
      today: { tokens: today.totalTokens, cost: today.totalCost, sessions: today.sessions },
      weekly: { totalTokens: totalTokens7d, totalCost: totalCost7d, avgDailyCost },
      projectedMonthlyCost,
      chartData: weeklyData.map(d => ({
        label: d.date.slice(5), // MM-DD
        value: parseFloat(d.totalCost.toFixed(4)),
        tokens: d.totalTokens,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Costs] Error:', message);
    return NextResponse.json({ error: 'Failed to load cost data', details: message }, { status: 500 });
  }
}
