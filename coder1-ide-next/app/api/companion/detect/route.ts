import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Companion Detection API
 * 
 * Checks if the local companion service is installed and running
 * Returns connection information if available
 */

export async function GET(request: NextRequest) {
  try {
    // Check for connection file
    const connectionFile = path.join(os.homedir(), '.coder1-companion');
    
    if (!fs.existsSync(connectionFile)) {
      return NextResponse.json({
        installed: false,
        running: false,
        message: 'Companion service not detected'
      }, { status: 404 });
    }

    // Read connection information
    const connectionData = JSON.parse(fs.readFileSync(connectionFile, 'utf8'));
    
    // Verify service is responsive
    try {
      const response = await fetch(`http://localhost:${connectionData.port}/health`, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const healthData = await response.json();
        
        return NextResponse.json({
          installed: true,
          running: true,
          version: connectionData.version,
          port: connectionData.port,
          pid: connectionData.pid,
          startTime: connectionData.startTime,
          security: connectionData.security,
          health: healthData
        });
      }
    } catch (fetchError) {
      // Service not responding
    }

    // Connection file exists but service not responding
    return NextResponse.json({
      installed: true,
      running: false,
      message: 'Companion service installed but not responding',
      connectionData
    }, { status: 503 });

  } catch (error) {
    console.error('Error detecting companion service:', error);
    
    return NextResponse.json({
      installed: false,
      running: false,
      error: 'Failed to detect companion service',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'install':
        return await handleInstall();
      
      case 'start':
        return await handleStart();
      
      case 'stop':
        return await handleStop();
      
      default:
        return NextResponse.json({
          error: 'Invalid action',
          validActions: ['install', 'start', 'stop']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error handling companion action:', error);
    
    return NextResponse.json({
      error: 'Failed to process action',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handleInstall() {
  try {
    const { spawn } = require('child_process');
    
    // Install companion service globally
    const installProcess = spawn('npm', ['install', '-g', '@coder1/companion'], {
      stdio: 'pipe'
    });

    return new Promise((resolve) => {
      let output = '';
      
      installProcess.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      installProcess.stderr?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      installProcess.on('close', (code: number) => {
        if (code === 0) {
          resolve(NextResponse.json({
            success: true,
            message: 'Companion service installed successfully',
            output
          }));
        } else {
          resolve(NextResponse.json({
            success: false,
            message: 'Installation failed',
            output
          }, { status: 500 }));
        }
      });
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Installation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handleStart() {
  try {
    const { spawn } = require('child_process');
    
    // Start companion service
    const startProcess = spawn('coder1-companion', ['start'], {
      stdio: 'pipe',
      detached: true
    });

    // Don't wait for the process to finish (it's a service)
    startProcess.unref();

    // Give it a moment to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if it started successfully
    const detection = await GET(new NextRequest('http://localhost/api/companion/detect'));
    const result = await detection.json();

    if (result.running) {
      return NextResponse.json({
        success: true,
        message: 'Companion service started successfully',
        port: result.port
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to start companion service'
      }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to start service',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handleStop() {
  try {
    const { spawn } = require('child_process');
    
    // Stop companion service
    const stopProcess = spawn('coder1-companion', ['stop'], {
      stdio: 'pipe'
    });

    return new Promise((resolve) => {
      stopProcess.on('close', (code: number) => {
        if (code === 0) {
          resolve(NextResponse.json({
            success: true,
            message: 'Companion service stopped successfully'
          }));
        } else {
          resolve(NextResponse.json({
            success: false,
            message: 'Failed to stop companion service'
          }, { status: 500 }));
        }
      });
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to stop service',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}