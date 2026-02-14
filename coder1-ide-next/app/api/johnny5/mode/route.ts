import { NextResponse } from 'next/server';
import { getMoltbotBridge } from '@/services/johnny5/moltbot-bridge';

export async function GET() {
  const moltbotBridge = getMoltbotBridge();
  const moltbotConnected = moltbotBridge?.isConnected() ?? false;

  // FIX (Feb 2026): Use global.bridgeManager set by server.js
  // The module import creates a separate singleton that doesn't have connections
  // server.js sets global.bridgeManager at line 1933 with actual WebSocket connections
  const bridgeManagerGlobal = (global as Record<string, unknown>).bridgeManager as {
    hasBridgeForUser?: (userId: string) => boolean;
    findAnyConnectedBridge?: () => unknown;
  } | undefined;
  const bridgeConnected = bridgeManagerGlobal?.hasBridgeForUser?.('default') ||
                          !!bridgeManagerGlobal?.findAnyConnectedBridge?.();

  let mode: 'moltbot' | 'bridge' | 'gemini';
  let capabilities: string[];

  if (moltbotConnected) {
    mode = 'moltbot';
    capabilities = ['MCP Tools', 'Project Context', '24/7 Operation', 'Full Autonomy', 'ManusLive Integration'];
  } else if (bridgeConnected) {
    mode = 'bridge';
    capabilities = ['MCP Tools', 'Project Context', 'Claude Code CLI', 'File System Access'];
  } else {
    mode = 'gemini';
    capabilities = ['Memory System', 'Reasoning', 'Conversation History', 'Pattern Detection'];
  }

  return NextResponse.json({
    mode,
    capabilities,
    hasMCP: mode !== 'gemini',
    provider: mode === 'moltbot' ? 'ManusLive' : mode === 'bridge' ? 'Claude Code CLI' : 'Gemini 2.5 Flash',
    isLimitedMode: mode === 'gemini',
  });
}
