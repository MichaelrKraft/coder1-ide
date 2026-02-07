import { NextResponse } from 'next/server';
import { getMoltbotBridge } from '@/services/johnny5/moltbot-bridge';
import { Johnny5BridgeService } from '@/services/johnny5-bridge-service';

export async function GET() {
  const moltbotBridge = getMoltbotBridge();
  const moltbotConnected = moltbotBridge?.isConnected() ?? false;

  // Access global bridgeManager set by server.js to ensure we use the same instance
  // that has the registered bridges (fixes module singleton isolation issue)
  const globalBridgeManager = (global as any).bridgeManager;
  let bridgeConnected = false;

  if (globalBridgeManager) {
    // Use server.js's bridgeManager instance directly
    bridgeConnected = globalBridgeManager.hasBridgeForUser?.('default') ||
                      !!globalBridgeManager.findAnyConnectedBridge?.();
  } else {
    // Fallback to module import (for development/testing without custom server)
    const johnny5Service = new Johnny5BridgeService('default');
    bridgeConnected = johnny5Service.isBridgeConnected();
  }

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
