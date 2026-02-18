import { NextRequest, NextResponse } from 'next/server';

interface ErrorAnalysisRequest {
  error: string;
  model: string;
}

interface ErrorAnalysisResponse {
  diagnosis: string;
  success: boolean;
  usedAI: boolean;
  model?: string;
}

function sanitizeError(error: string): string {
  let sanitized = error;
  
  sanitized = sanitized.replace(/(['"])?([a-zA-Z0-9_-]{20,})(['"])?/g, '[REDACTED_KEY]');
  sanitized = sanitized.replace(/\/Users\/[^\/\s]+/g, '/Users/[USER]');
  sanitized = sanitized.replace(/\/home\/[^\/\s]+/g, '/home/[USER]');
  
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500) + '...';
  }
  
  return sanitized.trim();
}

function getPatternMatchingDiagnosis(error: string): string {
  if (error.includes('command not found')) {
    return 'Command not recognized. Try: ls, pwd, cd, clear, or type "claude" to enter AI conversation mode.';
  } else if (error.includes('permission denied') || error.includes('Permission denied')) {
    return 'Permission denied. Try running with sudo or check file permissions with "ls -la".';
  } else if (error.includes('cannot find module') || error.includes('Cannot find module')) {
    return 'Module not found. Run "npm install" to install dependencies or check the import path.';
  } else if (error.includes('syntax error') || error.includes('SyntaxError')) {
    return 'Syntax error detected. Check for missing semicolons, brackets, or typos in your code.';
  } else if (error.includes('deprecated')) {
    return 'This feature is deprecated. Consider updating to the latest recommended approach.';
  } else if (error.includes('404')) {
    return 'Resource not found (404). Check the URL or file path and ensure the resource exists.';
  } else if (error.includes('timeout') || error.includes('timed out')) {
    return 'Operation timed out. Check your network connection or try increasing the timeout limit.';
  } else if (error.includes('ENOENT') || error.includes('No such file')) {
    return 'File or directory not found. Verify the path is correct and the file exists.';
  } else {
    return 'Error detected. Check the error message for details and consider searching for the specific error online.';
  }
}

async function analyzeWithAI(error: string, model: string): Promise<string | null> {
  try {
    const sanitized = sanitizeError(error);
    
    let apiKey: string | undefined;
    let baseURL: string;
    let requestBody: any;
    
    if (model === 'glm-4.6') {
      apiKey = process.env.ZAI_API_KEY;
      baseURL = process.env.ZAI_BASE_URL || 'https://api.z.ai/api/anthropic';
      
      if (!apiKey) {
        console.log('⚠️ ZAI_API_KEY not configured for GLM analysis');
        return null;
      }
      
      requestBody = {
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `You are an expert developer assistant. Analyze this terminal error and provide:
1. Root cause (1 sentence)
2. Fix command or action (specific, actionable)

Be concise and direct.

Error: ${sanitized}

Provide diagnosis and fix.`
        }]
      };
      
    } else if (model.includes('claude')) {
      apiKey = process.env.ANTHROPIC_API_KEY;
      baseURL = 'https://api.anthropic.com/v1';
      
      if (!apiKey) {
        console.log('⚠️ ANTHROPIC_API_KEY not configured');
        return null;
      }
      
      requestBody = {
        model: model,
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `You are an expert developer assistant. Analyze this terminal error and provide:
1. Root cause (1 sentence)
2. Fix command or action (specific, actionable)

Be concise and direct.

Error: ${sanitized}

Provide diagnosis and fix.`
        }]
      };
      
    } else if (model.includes('gemini')) {
      apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        console.log('⚠️ GEMINI_API_KEY not configured');
        return null;
      }
      
      const geminiModel = model === 'gemini-2.5-flash-lite' ? 'gemini-2.0-flash-exp' : model;
      baseURL = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
      
      requestBody = {
        contents: [{
          parts: [{
            text: `You are an expert developer assistant. Analyze this terminal error and provide:
1. Root cause (1 sentence)
2. Fix command or action (specific, actionable)

Be concise and direct.

Error: ${sanitized}

Provide diagnosis and fix.`
          }]
        }],
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.7
        }
      };
    } else {
      console.log(`⚠️ Unsupported model: ${model}`);
      return null;
    }
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (model.includes('claude') || model === 'glm-4.6') {
      headers['x-api-key'] = apiKey!;
      headers['anthropic-version'] = '2023-06-01';
    }
    
    const url = model.includes('gemini') ? baseURL : `${baseURL}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    if (model.includes('gemini')) {
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } else {
      return data.content?.[0]?.text || null;
    }
    
  } catch (error) {
    console.error('Error analyzing with AI:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ErrorAnalysisRequest = await request.json();
    const { error, model } = body;
    
    if (!error) {
      return NextResponse.json({
        diagnosis: 'No error provided.',
        success: false,
        usedAI: false
      } as ErrorAnalysisResponse);
    }
    
    const aiDiagnosis = await analyzeWithAI(error, model);
    
    if (aiDiagnosis) {
      return NextResponse.json({
        diagnosis: aiDiagnosis,
        success: true,
        usedAI: true,
        model
      } as ErrorAnalysisResponse);
    }
    
    const fallbackDiagnosis = getPatternMatchingDiagnosis(error);
    
    return NextResponse.json({
      diagnosis: fallbackDiagnosis,
      success: true,
      usedAI: false
    } as ErrorAnalysisResponse);
    
  } catch (error) {
    console.error('Error Doctor API error:', error);
    
    return NextResponse.json({
      diagnosis: 'Error analysis temporarily unavailable. Please check the error message manually.',
      success: false,
      usedAI: false
    } as ErrorAnalysisResponse);
  }
}
