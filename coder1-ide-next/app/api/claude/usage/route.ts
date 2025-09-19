/**
 * API endpoint for getting Claude usage statistics
 * Executes the ccusage command to get current token usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '@/lib/logger';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    // Execute ccusage command to get current usage
    const { stdout, stderr } = await execAsync('ccusage 2>/dev/null || echo "0"');
    
    if (stderr && !stderr.includes('command not found')) {
      logger.error('ccusage error:', stderr);
    }
    
    // Parse the output - ccusage typically returns a number
    const usage = stdout.trim();
    let tokens = 0;
    let cost = 0;
    
    // Try to parse as number
    const parsedUsage = parseInt(usage, 10);
    if (!isNaN(parsedUsage)) {
      tokens = parsedUsage;
      // Estimate cost based on Claude pricing
      // Assuming $3 per million input tokens, $15 per million output tokens
      // Using average of $9 per million tokens for estimation
      cost = (tokens / 1000000) * 9;
    }
    
    // Also try to get more detailed info if available
    try {
      // Try to get session info from claude CLI if available
      const { stdout: sessionInfo } = await execAsync('claude session info 2>/dev/null || echo "{}"');
      
      let sessionData = {};
      try {
        // Parse session info if it's JSON
        if (sessionInfo.trim().startsWith('{')) {
          sessionData = JSON.parse(sessionInfo.trim());
        }
      } catch (e) {
        // Session info might not be JSON, ignore
      }
      
      return NextResponse.json({
        success: true,
        tokens,
        cost: cost.toFixed(4),
        formattedCost: `$${cost.toFixed(4)}`,
        sessionData,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      // Fall back to basic response
      return NextResponse.json({
        success: true,
        tokens,
        cost: cost.toFixed(4),
        formattedCost: `$${cost.toFixed(4)}`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Failed to get Claude usage:', error);
    return NextResponse.json({
      success: false,
      tokens: 0,
      cost: "0.0000",
      formattedCost: "$0.0000",
      error: 'Failed to retrieve usage data',
      timestamp: new Date().toISOString()
    });
  }
}

// Reset usage counter endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'reset') {
      // Try to reset the usage counter
      // This might require specific ccusage commands or clearing a file
      const { stdout, stderr } = await execAsync('ccusage --reset 2>/dev/null || echo "reset not supported"');
      
      return NextResponse.json({
        success: true,
        message: 'Usage counter reset attempted',
        output: stdout.trim()
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    });
  } catch (error) {
    logger.error('Failed to reset usage:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to reset usage counter'
    });
  }
}