import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/claude-bridge/test
 * Test Claude Code Bridge service initialization
 */
export async function GET(request: NextRequest) {
  try {
    // REMOVED: // REMOVED: console.log('🧪 Testing enhanced-tmux-service import...');
    const tmuxModule = await import('@/services/enhanced-tmux-service');
    // REMOVED: // REMOVED: console.log('✅ Enhanced tmux module imported:', Object.keys(tmuxModule));
    
    // REMOVED: // REMOVED: console.log('🧪 Testing bridge module import...');
    const bridgeModule = await import('@/services/claude-code-bridge');
    // REMOVED: // REMOVED: console.log('✅ Bridge module imported:', Object.keys(bridgeModule));
    
    // REMOVED: // REMOVED: console.log('🧪 Testing service creation...');
    const bridgeService = bridgeModule.getClaudeCodeBridgeService();
    // REMOVED: // REMOVED: console.log('✅ Service created:', bridgeService.constructor.name);
    // REMOVED: // REMOVED: console.log('🏗️ Prototype chain:', bridgeService.constructor);
    // REMOVED: // REMOVED: console.log('📋 Service methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(bridgeService)));
    // REMOVED: // REMOVED: console.log('🔍 All service properties:', Object.getOwnPropertyNames(bridgeService));
    // REMOVED: // REMOVED: console.log('🎯 Has spawnParallelTeam:', typeof bridgeService.spawnParallelTeam);
    
    // Check prototype methods
    const proto = Object.getPrototypeOf(bridgeService);
    // REMOVED: // REMOVED: console.log('🧬 Prototype methods:', Object.getOwnPropertyNames(proto));
    
    // Check if we can find spawnParallelTeam anywhere
    let currentProto = bridgeService;
    let level = 0;
    while (currentProto && level < 5) {
      // REMOVED: // REMOVED: console.log(`🔎 Level ${level}:`, Object.getOwnPropertyNames(currentProto));
      currentProto = Object.getPrototypeOf(currentProto);
      level++;
    }
    
    // Test if the service is an EventEmitter
    // REMOVED: // REMOVED: console.log('🔍 Is EventEmitter:', bridgeService instanceof require('events').EventEmitter);
    
    return NextResponse.json({
      success: true,
      tmuxModule: Object.keys(tmuxModule),
      bridgeModule: Object.keys(bridgeModule),
      serviceType: bridgeService.constructor.name,
      hasSpawnMethod: typeof bridgeService.spawnParallelTeam === 'function',
      methods: Object.getOwnPropertyNames(Object.getPrototypeOf(bridgeService)),
      isEventEmitter: bridgeService instanceof require('events').EventEmitter
    });
    
  } catch (error) {
    // logger?.error('❌ Bridge test error:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}