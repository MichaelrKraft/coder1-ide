import { NextRequest, NextResponse } from 'next/server';

// Simple error analysis (placeholder for AI-powered analysis)
interface ErrorAnalysis {
  summary: string;
  category: string;
  suggestions: string[];
  confidence: number;
}

function analyzeError(errorText: string): ErrorAnalysis {
  const lowercaseError = errorText.toLowerCase();
  
  // Simple pattern matching (placeholder for AI analysis)
  if (lowercaseError.includes('cannot find module') || lowercaseError.includes('module not found')) {
    return {
      summary: 'Missing module dependency',
      category: 'dependency',
      suggestions: [
        'Run `npm install` to install missing dependencies',
        'Check if the module name is spelled correctly',
        'Verify the module exists in package.json'
      ],
      confidence: 0.9
    };
  }
  
  if (lowercaseError.includes('permission denied') || lowercaseError.includes('eacces')) {
    return {
      summary: 'Permission denied error',
      category: 'permissions',
      suggestions: [
        'Check file permissions with `ls -la`',
        'Try running with appropriate permissions',
        'Verify you have write access to the directory'
      ],
      confidence: 0.85
    };
  }
  
  if (lowercaseError.includes('port') && lowercaseError.includes('already in use')) {
    return {
      summary: 'Port already in use',
      category: 'network',
      suggestions: [
        'Kill the process using the port with `lsof -ti:PORT | xargs kill -9`',
        'Use a different port number',
        'Check which process is using the port with `lsof -i :PORT`'
      ],
      confidence: 0.95
    };
  }
  
  return {
    summary: 'Unknown error detected',
    category: 'general',
    suggestions: [
      'Review the full error message for clues',
      'Search for the error message online',
      'Check the application logs for more context'
    ],
    confidence: 0.3
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { errorText, context } = body;
    
    if (!errorText || typeof errorText !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'errorText is required and must be a string'
        },
        { status: 400 }
      );
    }
    
    // REMOVED: // REMOVED: console.log(`🩺 [Unified] Error Doctor analyzing: "${errorText.substring(0, 100)}..."`);
    
    // Analyze the error
    const analysis = analyzeError(errorText);
    
    return NextResponse.json({
      success: true,
      analysis,
      context: context || null,
      timestamp: new Date().toISOString(),
      server: 'unified-server',
      version: '1.0.0'
    });
    
  } catch (error) {
    // logger?.error('❌ [Unified] Error Doctor error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    service: 'Error Doctor',
    server: 'unified-server',
    status: 'active',
    features: [
      'Error pattern recognition',
      'Automated fix suggestions',
      'Context-aware analysis'
    ],
    timestamp: new Date().toISOString()
  });
}