import { NextResponse } from 'next/server';
import { getMoltbotBridge } from '@/services/johnny5/moltbot-bridge';
import { bridgeManager } from '@/services/bridge-manager';

export async function GET() {
  const moltbotBridge = getMoltbotBridge();
  const moltbotConnected = moltbotBridge?.isConnected() ?? false;

  // FIX (Feb 2026): Import bridgeManager directly like /api/johnny5/chat does
  // global.bridgeManager isn't reliably accessible in Next.js API routes
  const hasBridgeForDefault = bridgeManager?.hasBridgeForUser?.('default') ?? false;
  const anyBridge = bridgeManager?.findAnyConnectedBridge?.();
  const bridgeConnected = hasBridgeForDefault || !!anyBridge;

  // Debug logging
  console.log('[Johnny5 Mode] Bridge check:', {
    bridgeManagerExists: !!bridgeManager,
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
      bridgeManagerExists: !!bridgeManager,
      hasBridgeForDefault,
      anyBridge: anyBridge ? { id: anyBridge.id, userId: anyBridge.userId } : null,
    }
  });
}
