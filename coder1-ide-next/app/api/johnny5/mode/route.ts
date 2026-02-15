import { NextResponse } from 'next/server';
import { getMoltbotBridge } from '@/services/johnny5/moltbot-bridge';

export async function GET() {
  const moltbotBridge = getMoltbotBridge();
  const moltbotConnected = moltbotBridge?.isConnected() ?? false;

  // Use global.bridgeManager set by server.js (line ~2019)
  // Direct module import creates a SEPARATE singleton that doesn't have connections
  // because Next.js API routes are compiled separately from the custom server
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bridgeManagerGlobal = (global as any).bridgeManager;
  const hasBridgeForDefault = bridgeManagerGlobal?.hasBridgeForUser?.('default') ?? false;
  const anyBridge = bridgeManagerGlobal?.findAnyConnectedBridge?.();
  const bridgeConnected = hasBridgeForDefault || !!anyBridge;

  // Debug logging
  console.log('[Johnny5 Mode] Bridge check:', {
    bridgeManagerExists: !!bridgeManagerGlobal,
    hasBridgeForDefault,
    anyBridge: anyBridge ? { id: anyBridge.id, userId: anyBridge.userId } : null,
    bridgeConnected
  });

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
    // Debug info (temporary)
    _debug: {
      bridgeManagerExists: !!bridgeManagerGlobal,
      hasBridgeForDefault,
      anyBridge: anyBridge ? { id: anyBridge.id, userId: anyBridge.userId } : null,
    }
  });
}
