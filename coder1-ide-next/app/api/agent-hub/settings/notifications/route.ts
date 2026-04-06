import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const NOTIFICATIONS_PATH = path.join(os.homedir(), '.coder1', 'notifications.json');

const VALID_TRIGGERS = ['run_completed', 'run_failed', 'budget_alert', 'task_completed'];

interface NotificationConfig {
  telegramBotToken: string;
  telegramChatId: string;
  triggers: string[];
}

export async function GET(): Promise<NextResponse> {
  try {
    if (!fs.existsSync(NOTIFICATIONS_PATH)) {
      return NextResponse.json({
        telegramBotToken: '',
        telegramChatId: '',
        triggers: [],
      });
    }
    const raw = fs.readFileSync(NOTIFICATIONS_PATH, 'utf-8');
    const data = JSON.parse(raw) as NotificationConfig;
    // Never return the full token to the client — mask it
    return NextResponse.json({
      telegramBotToken: data.telegramBotToken ? '***' + data.telegramBotToken.slice(-4) : '',
      telegramChatId: data.telegramChatId || '',
      triggers: data.triggers || [],
    });
  } catch (error) {
    console.error('[agent-hub] GET /settings/notifications error:', error);
    return NextResponse.json({ error: 'Failed to read notifications config' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { telegramBotToken, telegramChatId, triggers } = body;

    if (telegramBotToken !== undefined && typeof telegramBotToken !== 'string') {
      return NextResponse.json({ error: 'telegramBotToken must be a string' }, { status: 400 });
    }
    if (telegramChatId !== undefined && typeof telegramChatId !== 'string') {
      return NextResponse.json({ error: 'telegramChatId must be a string' }, { status: 400 });
    }
    if (triggers !== undefined) {
      if (!Array.isArray(triggers) || !triggers.every((t: unknown) => typeof t === 'string' && VALID_TRIGGERS.includes(t as string))) {
        return NextResponse.json({ error: 'triggers must be an array of valid trigger names' }, { status: 400 });
      }
    }

    // Read existing config to preserve token if masked value sent
    let existing: NotificationConfig = { telegramBotToken: '', telegramChatId: '', triggers: [] };
    if (fs.existsSync(NOTIFICATIONS_PATH)) {
      try {
        existing = JSON.parse(fs.readFileSync(NOTIFICATIONS_PATH, 'utf-8'));
      } catch {
        // ignore parse errors
      }
    }

    const data: NotificationConfig = {
      telegramBotToken:
        telegramBotToken && !telegramBotToken.startsWith('***')
          ? telegramBotToken
          : existing.telegramBotToken,
      telegramChatId: telegramChatId ?? existing.telegramChatId,
      triggers: triggers ?? existing.triggers,
    };

    const dir = path.dirname(NOTIFICATIONS_PATH);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(NOTIFICATIONS_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[agent-hub] PUT /settings/notifications error:', error);
    return NextResponse.json({ error: 'Failed to save notifications config' }, { status: 500 });
  }
}
