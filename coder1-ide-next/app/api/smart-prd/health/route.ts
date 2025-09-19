/* 
===============================================================================
Smart PRD Generator - Health Check API
===============================================================================
File: app/api/smart-prd/health/route.ts
Purpose: Health check endpoint for Smart PRD Generator
Status: PRODUCTION - Created: January 20, 2025
===============================================================================
*/

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
  try {
    // Check if pattern engine services exist
    const servicesPath = path.join(process.cwd(), 'services', 'pattern-engine');
    const patternsPath = path.join(process.cwd(), 'data', 'repository-patterns');
    
    let patternsLoaded = 0;
    let servicesAvailable = false;
    
    // Check services
    if (fs.existsSync(servicesPath)) {
      servicesAvailable = true;
    }
    
    // Count patterns
    if (fs.existsSync(patternsPath)) {
      try {
        const patternFiles = fs.readdirSync(patternsPath).filter(file => file.endsWith('.json'));
        patternsLoaded = patternFiles.length;
      } catch (error) {
        console.error('Error reading patterns directory:', error);
      }
    }
    
    const isHealthy = servicesAvailable && patternsLoaded > 0;
    
    return NextResponse.json({
      success: true,
      healthy: isHealthy,
      patternsLoaded,
      servicesAvailable,
      timestamp: new Date().toISOString(),
      message: isHealthy 
        ? `Smart PRD Generator is healthy with ${patternsLoaded} patterns loaded`
        : 'Smart PRD Generator needs setup - patterns or services missing'
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      success: false,
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}