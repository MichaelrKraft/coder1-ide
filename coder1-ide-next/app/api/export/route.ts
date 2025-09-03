import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { getBackendUrl } from '@/lib/api-config';
import { logger } from '@/lib/logger';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { format, includeNodeModules, includeGitHistory, sessionId } = await request.json();
    
    const EXPRESS_BACKEND_URL = getBackendUrl();
    
    // If sessionId provided, export session data from Express backend
    if (sessionId) {
      try {
        const response = await fetch(`${EXPRESS_BACKEND_URL}/api/sessions/${sessionId}/export`);
        
        if (response.ok) {
          const sessionData = await response.json();
          
          // Convert session data to downloadable format
          const jsonContent = JSON.stringify(sessionData, null, 2);
          const buffer = Buffer.from(jsonContent);
          
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': 'application/json',
              'Content-Disposition': `attachment; filename="session-${sessionId}-export-${Date.now()}.json"`
            }
          });
        }
      } catch (error) {
        logger.error('Failed to export session data:', error);
      }
    }
    
    // Fallback to project export
    const projectDir = process.cwd();
    const exportDir = path.join(projectDir, 'exports');
    const timestamp = Date.now();
    const exportFile = path.join(exportDir, `export-${timestamp}.zip`);
    
    // Create exports directory
    try {
      await fs.mkdir(exportDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Build exclude flags for zip command
    let excludeFlags = '--exclude=*.zip --exclude=.git --exclude=.next --exclude=exports --exclude=.DS_Store';
    if (!includeNodeModules) {
      excludeFlags += ' --exclude=node_modules/* --exclude=node_modules';
    }
    if (!includeGitHistory) {
      excludeFlags += ' --exclude=.git/* --exclude=.git';
    }
    
    // Create zip file with increased buffer limit
    const zipCommand = `cd ${projectDir} && zip -r ${exportFile} . ${excludeFlags}`;
    
    try {
      await execAsync(zipCommand, { 
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer limit
      });
      
      // Read the zip file
      const fileBuffer = await fs.readFile(exportFile);
      
      // Clean up the temporary file
      await fs.unlink(exportFile);
      
      // Return the file as a blob
      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="project-export-${timestamp}.zip"`
        }
      });
    } catch (error) {
      logger.error('Failed to create zip:', error);
      throw error;
    }
  } catch (error) {
    logger.error('Failed to export project:', error);
    return NextResponse.json(
      { error: 'Failed to export project' },
      { status: 500 }
    );
  }
}