/**
 * Agent Cleanup API
 * 
 * Manual intervention endpoint for cleaning up orphaned agent processes.
 * Useful for emergency cleanup when agents fail to terminate properly.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Get Claude CLI Puppeteer service
    let claudePuppeteer: any;
    try {
      const { getClaudePuppeteer } = require('../../../../services/claude-code-bridge');
      claudePuppeteer = getClaudePuppeteer();
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: 'Claude CLI Puppeteer service not available',
        details: error.message
      }, { status: 503 });
    }
    
    if (!claudePuppeteer) {
      return NextResponse.json({
        success: false,
        error: 'Claude CLI Puppeteer not initialized'
      }, { status: 503 });
    }
    
    // Parse request body for cleanup options
    const body = await req.json().catch(() => ({}));
    const { teamId, agentId, force = false } = body;
    
    // Perform cleanup based on parameters
    if (agentId) {
      // Clean up specific agent
      console.log(`🧹 [Cleanup API] Cleaning up agent: ${agentId}`);
      await claudePuppeteer.stopAgent(agentId);
      
      return NextResponse.json({
        success: true,
        message: `Agent ${agentId} cleaned up successfully`,
        cleaned: { agentId }
      });
      
    } else if (teamId) {
      // Clean up specific team
      console.log(`🧹 [Cleanup API] Cleaning up team: ${teamId}`);
      await claudePuppeteer.cleanupTeam(teamId);
      
      return NextResponse.json({
        success: true,
        message: `Team ${teamId} cleaned up successfully`,
        cleaned: { teamId }
      });
      
    } else if (force) {
      // Emergency cleanup - stop all agents
      console.log(`🚨 [Cleanup API] EMERGENCY CLEANUP - Stopping all agents`);
      const stats = claudePuppeteer.getStats();
      await claudePuppeteer.emergencyStopAll();
      
      return NextResponse.json({
        success: true,
        message: 'Emergency cleanup completed - all agents stopped',
        cleaned: {
          totalAgents: stats.totalAgentsSpawned,
          activeAgents: claudePuppeteer.agents?.size || 0,
          activeTeams: claudePuppeteer.activeTeams?.size || 0
        }
      });
      
    } else {
      // No specific target - return current status
      const stats = claudePuppeteer.getStats();
      
      return NextResponse.json({
        success: true,
        message: 'No cleanup performed - specify agentId, teamId, or force=true',
        status: {
          totalAgentsSpawned: stats.totalAgentsSpawned,
          activeAgents: claudePuppeteer.agents?.size || 0,
          activeTeams: claudePuppeteer.activeTeams?.size || 0,
          isInitialized: claudePuppeteer.isInitialized
        }
      });
    }
    
  } catch (error: any) {
    console.error('❌ [Cleanup API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Cleanup failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get Claude CLI Puppeteer service
    let claudePuppeteer: any;
    try {
      const { getClaudePuppeteer } = require('../../../../services/claude-code-bridge');
      claudePuppeteer = getClaudePuppeteer();
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: 'Claude CLI Puppeteer service not available',
        details: error.message
      }, { status: 503 });
    }
    
    if (!claudePuppeteer) {
      return NextResponse.json({
        success: false,
        error: 'Claude CLI Puppeteer not initialized'
      }, { status: 503 });
    }
    
    // Return current agent status
    const stats = claudePuppeteer.getStats();
    const agents = Array.from(claudePuppeteer.agents?.values() || []).map((agent: any) => ({
      agentId: agent.agentId,
      role: agent.role,
      status: agent.status,
      teamId: agent.teamId,
      pid: agent.pty?.pid
    }));
    
    const teams = Array.from(claudePuppeteer.activeTeams?.values() || []).map((team: any) => ({
      teamId: team.teamId,
      requirement: team.requirement,
      status: team.status,
      agentCount: team.agents?.size || 0
    }));
    
    return NextResponse.json({
      success: true,
      stats,
      agents,
      teams,
      totalActive: agents.length
    });
    
  } catch (error: any) {
    console.error('❌ [Cleanup API] Error getting status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get agent status',
      details: error.message
    }, { status: 500 });
  }
}
