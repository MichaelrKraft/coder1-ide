import { NextRequest, NextResponse } from 'next/server';
import { getClaudeCodeBridgeService } from '@/services/claude-code-bridge';
import { logger } from '@/lib/logger';
import type { ContextBridge } from '@/types/context-bridge';

/**
 * POST /api/claude-bridge/spawn
 * Spawn a new parallel development team using Claude Code Bridge (cost-free)
 */
export async function POST(request: NextRequest) {
  try {
    const { requirement, sessionId, conversationContext } = await request.json() as {
      requirement: string;
      sessionId?: string;
      conversationContext?: ContextBridge;
    };

    if (!requirement) {
      return NextResponse.json({
        success: false,
        error: 'Project requirement is required'
      }, { status: 400 });
    }

    logger.info(`🚀 [BRIDGE] Spawning cost-free team for: "${requirement}"`);

    // CONTEXT BRIDGE: Build enhanced requirement with terminal context
    let enhancedRequirement = requirement;
    if (conversationContext?.hasContext) {
      logger.info(`📝 [CONTEXT BRIDGE] Terminal context received: ${conversationContext.historyLength} chars, ${conversationContext.commandCount} commands`);

      // Build context-aware prompt for agents
      enhancedRequirement = `## Context from Current Terminal Session
The user has been working in the terminal. Here's recent context:

### Recent Commands
${conversationContext.recentCommands.join('\n')}

### Terminal History (last 5000 chars)
\`\`\`
${conversationContext.history}
\`\`\`

## User's Task Request
${requirement}

Continue the work based on the above context.`;

      logger.info(`📝 [CONTEXT BRIDGE] Enhanced requirement with terminal context`);
    } else {
      logger.info(`📝 [CONTEXT BRIDGE] No terminal context (fresh task entry)`);
    }

    // Check for OAuth token with detailed error messages
    const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
    
    if (!oauthToken || oauthToken === '# ADD YOUR OAUTH TOKEN HERE' || oauthToken.startsWith('#')) {
      logger.error('❌ [BRIDGE] CLAUDE_CODE_OAUTH_TOKEN not configured');
      
      // Provide helpful fallback with clear instructions
      const fallbackTeam = {
        teamId: `setup-required-${Date.now()}`,
        sessionId: sessionId || `session-${Date.now()}`,
        agents: [
          {
            id: 'setup-agent-1',
            name: 'Setup Assistant',
            role: 'assistant',
            status: 'waiting',
            progress: 0,
            currentTask: '⚠️ OAuth token required for AI Team',
            completedTasks: [],
            expertise: []
          }
        ],
        status: 'setup_required',
        workflow: 'oauth-setup',
        requirement: requirement,
        context: {
          setupRequired: true,
          instructions: [
            '1. Install Claude CLI: npm install -g @anthropic-ai/claude-cli',
            '2. Login: claude login',
            '3. Get token: claude auth token',
            '4. Add to .env.local: CLAUDE_CODE_OAUTH_TOKEN=your-token',
            '5. Restart the server'
          ],
          documentationUrl: '/OAUTH_SETUP_GUIDE.md'
        },
        message: '⚠️ OAuth Setup Required - See instructions in terminal',
        executionType: 'setup-required'
      };
      
      return NextResponse.json({
        success: true,
        setupRequired: true,
        ...fallbackTeam
      });
    }
    
    // Validate OAuth token format
    if (!oauthToken.startsWith('sk-ant-oat01-')) {
      logger.error('❌ [BRIDGE] Invalid OAuth token format. Expected sk-ant-oat01- prefix.');
      
      return NextResponse.json({
        success: false,
        error: 'Invalid OAuth token format. Token should start with "sk-ant-oat01-". Please use "claude auth token" to get a valid OAuth token.',
        hint: 'Make sure you are using an OAuth token (sk-ant-oat01-) not an API key (sk-ant-api03-)'
      }, { status: 400 });
    }
    
    try {
      // Use real Claude Code Bridge implementation
      const bridgeService = getClaudeCodeBridgeService();
      
      // Check if service is initialized with timeout
      if (!bridgeService.isServiceInitialized()) {
        logger.info('🔧 [BRIDGE] Initializing bridge service...');
        
        // Add timeout wrapper for initialization
        await Promise.race([
          bridgeService.initialize(),
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Bridge service initialization timeout (10s) - Claude CLI may be unavailable'));
            }, 10000); // 10 second timeout for initialization
          })
        ]);
        
        logger.info('✅ [BRIDGE] Bridge service initialized successfully');
      }
      
      // Spawn the parallel team using tmux sandboxes
      // CONTEXT BRIDGE: Pass enhanced requirement with terminal context
      const team = await bridgeService.spawnParallelTeam(enhancedRequirement, sessionId, conversationContext);
      
      if (!team) {
        // No fallback - return real error
        logger.error('❌ [BRIDGE] Failed to spawn team - no mock fallback');
        return NextResponse.json({
          success: false,
          error: 'Failed to spawn AI team. Please check OAuth token and try again.'
        }, { status: 500 });
      }
      
      // Real team was successfully spawned - transform bridge team format to match expected API format
      const compatibleTeam = {
        teamId: team.teamId,
        sessionId: team.sessionId,
        projectRequirement: team.projectRequirement,
        workflow: team.workflow,
        status: team.status,
        agents: team.agents.map((agent, index) => ({
          id: agent.id,  // Use the real agentId from coordinator (e.g., "puppet-123-frontend")
          agentId: agent.id,  // Also include as agentId for compatibility
          name: agent.name,
          role: agent.role,
          status: agent.status,
          progress: agent.progress,
          currentTask: agent.currentTask,
          completedTasks: agent.completedTasks,
          expertise: [], // Legacy field for compatibility
          workTreePath: agent.workTreePath, // Include work tree path for debugging
          processId: agent.processId // Include process ID if available
        })),
        createdAt: team.createdAt.getTime(),
        startedAt: team.startedAt?.getTime() || null,
        completedAt: team.completedAt?.getTime() || null,
        progress: team.progress,
        context: team.context,
        files: team.files,
        automatedExecution: true // Flag indicating this is automated
      };
      
      logger.info(`✅ [BRIDGE] Team spawned: ${team.teamId}`);
      logger.info(`🤖 [BRIDGE] Automated execution: ${team.agents.length} agents`);
      logger.info(`🔍 [DEBUG] Agent IDs: ${compatibleTeam.agents.map(a => a.id).join(', ')}`);
      
      // Emit agent:spawn event to Socket.IO clients via global bridge
      if (typeof global !== 'undefined' && (global as any).emitBridgeEvent) {
        (global as any).emitBridgeEvent('agent:spawn', {
          teamId: team.teamId,
          sessionId: team.sessionId,
          status: team.status,
          requirement: requirement,
          agents: compatibleTeam.agents,
          automatedExecution: true,
          costSavings: true,
          executionType: 'automated-claude-code'
        });
        logger.info(`🔗 [BRIDGE] Emitted agent:spawn event for team ${team.teamId}`);
      } else {
        logger.warn('⚠️ [BRIDGE] global.emitBridgeEvent not available - agents won\'t appear in UI');
      }
      
      return NextResponse.json({
        success: true,
        teamId: team.teamId,
        sessionId: team.sessionId,
        agents: compatibleTeam.agents,
        status: team.status,
        workflow: team.workflow,
        requirement: requirement,
        context: team.context,
        message: `AI Team spawned with ${team.agents.length} automated agents`,
        executionType: 'automated-claude-code'
      });
      
    } catch (bridgeError) {
      const errorMessage = bridgeError instanceof Error ? bridgeError.message : 'Unknown error';
      logger.error('❌ [BRIDGE] Bridge service failed:', errorMessage);
      
      // Check if it's a timeout error
      if (errorMessage.includes('timeout')) {
        logger.info('⏱️ [BRIDGE] Claude CLI initialization timeout - CLI may not be installed');
        
        return NextResponse.json({
          success: false,
          error: 'Claude CLI initialization timeout',
          details: 'The Claude CLI may not be installed or accessible. Please ensure Claude CLI is installed: npm install -g @anthropic-ai/claude-cli',
          setupInstructions: {
            step1: 'Install Claude CLI: npm install -g @anthropic-ai/claude-cli',
            step2: 'Authenticate: claude login',
            step3: 'Get token: claude auth token',
            step4: 'Add token to environment variables'
          }
        }, { status: 503 });
      }
      
      // Provide detailed fallback for other errors
      logger.info('🔄 [BRIDGE] Providing fallback team with setup instructions');
      
      const timestamp = Date.now();
      const fallbackTeam = {
        teamId: `fallback-${timestamp}`,
        sessionId: sessionId || `fallback-session-${timestamp}`,
        agents: [
          {
            id: `agent_frontend_${timestamp}`,
            name: 'Frontend Developer',
            role: 'frontend',
            status: 'waiting',
            progress: 0,
            currentTask: '⚠️ Waiting for Claude CLI setup',
            completedTasks: [],
            expertise: []
          },
          {
            id: `agent_backend_${timestamp}`, 
            name: 'Backend Developer',
            role: 'backend',
            status: 'waiting',
            progress: 0,
            currentTask: '⚠️ OAuth configuration needed',
            completedTasks: [],
            expertise: []
          }
        ],
        status: 'setup_required',
        workflow: 'fallback-setup',
        requirement: requirement,
        context: {
          fallbackMode: true,
          setupRequired: true,
          error: errorMessage,
          instructions: 'Please see /OAUTH_SETUP_GUIDE.md for setup instructions'
        },
        message: '⚠️ AI Team in fallback mode - OAuth setup required for full functionality',
        executionType: 'fallback-mode'
      };
      
      return NextResponse.json({
        success: true,
        fallbackMode: true,
        ...fallbackTeam
      });
    }
    
  } catch (error) {
    logger.error('❌ [BRIDGE] API error:', error);
    return NextResponse.json({ 
      success: false,
      error: `Failed to spawn bridge team: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}