/**
 * Coder1 Bridge Command Execution API
 * Relays commands from web IDE to connected Bridge services
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Bridge command queue and results storage
const pendingCommands = new Map();
const commandResults = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      bridgeId, 
      command, 
      args = [], 
      workingDir, 
      timeout = 30000,
      sessionId 
    } = body;

    // Basic validation
    if (!bridgeId || !command) {
      return NextResponse.json(
        { error: 'Bridge ID and command required' },
        { status: 400 }
      );
    }

    // Generate unique command ID
    const commandId = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();

    // Create command structure
    const commandData = {
      commandId,
      bridgeId,
      command,
      args,
      workingDir,
      timeout,
      sessionId,
      timestamp,
      status: 'pending',
      output: {
        stdout: '',
        stderr: ''
      }
    };

    // Store pending command
    pendingCommands.set(commandId, commandData);

    // In a real implementation, this would:
    // 1. Check if bridge is connected via WebSocket
    // 2. Send command via WebSocket to Bridge service
    // 3. Wait for response or timeout
    
    console.log('📤 Bridge command queued:', {
      commandId: commandId.substring(0, 8) + '...',
      bridgeId: bridgeId.substring(0, 8) + '...',
      command: command.substring(0, 50) + (command.length > 50 ? '...' : ''),
      args: args.length
    });

    // For alpha testing, simulate command execution
    setTimeout(() => {
      simulateCommandExecution(commandId, commandData);
    }, 1000 + Math.random() * 2000); // 1-3 second delay

    return NextResponse.json({
      success: true,
      commandId,
      status: 'queued',
      message: 'Command sent to Bridge service',
      estimatedCompletion: timestamp + timeout
    });

  } catch (error) {
    console.error('❌ Bridge command error:', error);
    return NextResponse.json(
      { error: 'Failed to execute Bridge command' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commandId = searchParams.get('commandId');

    if (!commandId) {
      // Return summary of all commands
      const pendingCount = pendingCommands.size;
      const completedCount = commandResults.size;
      
      return NextResponse.json({
        service: 'Bridge Command API',
        status: 'healthy',
        stats: {
          pendingCommands: pendingCount,
          completedCommands: completedCount,
          totalCommands: pendingCount + completedCount
        }
      });
    }

    // Check pending commands first
    if (pendingCommands.has(commandId)) {
      const command = pendingCommands.get(commandId);
      return NextResponse.json({
        commandId,
        status: command.status,
        output: command.output,
        startTime: command.timestamp,
        running: true
      });
    }

    // Check completed commands
    if (commandResults.has(commandId)) {
      const result = commandResults.get(commandId);
      return NextResponse.json({
        commandId,
        status: result.status,
        output: result.output,
        startTime: result.startTime,
        endTime: result.endTime,
        duration: result.duration,
        exitCode: result.exitCode,
        running: false
      });
    }

    return NextResponse.json(
      { error: 'Command not found' },
      { status: 404 }
    );

  } catch (error) {
    console.error('❌ Bridge command status error:', error);
    return NextResponse.json(
      { error: 'Failed to get command status' },
      { status: 500 }
    );
  }
}

/**
 * Simulate command execution for alpha testing
 * In production, this would be handled by actual Bridge WebSocket communication
 */
function simulateCommandExecution(commandId: string, commandData: any) {
  const startTime = Date.now();
  
  // Update status to running
  commandData.status = 'running';
  pendingCommands.set(commandId, commandData);

  // Simulate different types of Claude CLI responses
  const responses = [
    {
      stdout: `Claude Code CLI v1.2.3
Analyzing your request: "${commandData.command}"

✅ Successfully processed your request
Generated response:

Here's a sample response for your command. This is a simulated output that demonstrates how the Bridge service would relay actual Claude CLI responses to the web IDE.

Key features demonstrated:
- Command execution through Bridge
- Real-time output streaming  
- Structured response formatting
- Error handling and status codes

This simulation helps test the Bridge communication architecture without requiring actual Claude CLI integration during development.`,
      stderr: '',
      exitCode: 0
    },
    {
      stdout: 'Processing your request...\n',
      stderr: 'Warning: This is a simulated response for testing\n',
      exitCode: 0
    },
    {
      stdout: '',
      stderr: 'Error: Simulated command execution failure for testing error handling\n',
      exitCode: 1
    }
  ];

  // Randomly select a response type (mostly successful)
  const responseIndex = Math.random() < 0.8 ? 0 : (Math.random() < 0.7 ? 1 : 2);
  const response = responses[responseIndex];

  // Simulate execution delay
  setTimeout(() => {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Create result object
    const result = {
      commandId,
      status: response.exitCode === 0 ? 'completed' : 'failed',
      output: {
        stdout: response.stdout,
        stderr: response.stderr
      },
      startTime,
      endTime,
      duration,
      exitCode: response.exitCode,
      bridgeId: commandData.bridgeId
    };

    // Move from pending to results
    pendingCommands.delete(commandId);
    commandResults.set(commandId, result);

    console.log('✅ Bridge command completed:', {
      commandId: commandId.substring(0, 8) + '...',
      status: result.status,
      duration: `${duration}ms`,
      exitCode: response.exitCode
    });

    // Clean up old results (keep last 100)
    if (commandResults.size > 100) {
      const oldestKey = commandResults.keys().next().value;
      commandResults.delete(oldestKey);
    }

  }, 2000 + Math.random() * 3000); // 2-5 second execution time
}

// Export utilities for WebSocket integration
export function handleBridgeCommandResponse(commandId: string, response: any) {
  const command = pendingCommands.get(commandId);
  if (!command) return false;

  const endTime = Date.now();
  const result = {
    commandId,
    status: response.exitCode === 0 ? 'completed' : 'failed',
    output: response.output || { stdout: '', stderr: '' },
    startTime: command.timestamp,
    endTime,
    duration: endTime - command.timestamp,
    exitCode: response.exitCode || 0,
    bridgeId: command.bridgeId
  };

  pendingCommands.delete(commandId);
  commandResults.set(commandId, result);

  return true;
}

export function updateCommandOutput(commandId: string, stream: string, data: string) {
  const command = pendingCommands.get(commandId);
  if (command) {
    command.output[stream] += data;
    pendingCommands.set(commandId, command);
  }
}