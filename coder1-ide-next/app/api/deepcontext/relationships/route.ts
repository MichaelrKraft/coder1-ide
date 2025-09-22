import { NextRequest, NextResponse } from 'next/server';

// Simulated relationships for demo
const DEMO_RELATIONSHIPS: Record<string, any[]> = {
  '/components/terminal/Terminal.tsx': [
    {
      file: '/components/terminal/TerminalContainer.tsx',
      line: 45,
      type: 'imported-by',
      name: 'TerminalContainer'
    },
    {
      file: '/lib/terminal-utils.ts',
      line: 12,
      type: 'imports',
      name: 'createTerminalSession'
    },
    {
      file: '/components/terminal/Terminal.css',
      line: 1,
      type: 'imports',
      name: 'styles'
    },
    {
      file: '/hooks/useTerminal.ts',
      line: 8,
      type: 'imports',
      name: 'useTerminal hook'
    },
    {
      file: '/components/editor/MonacoEditor.tsx',
      line: 234,
      type: 'similar',
      name: 'Component structure pattern'
    }
  ],
  'default': [
    {
      file: '/app/layout.tsx',
      line: 1,
      type: 'imported-by',
      name: 'RootLayout'
    },
    {
      file: '/lib/utils.ts',
      line: 1,
      type: 'imports',
      name: 'utility functions'
    }
  ]
};

export async function POST(request: NextRequest) {
  try {
    const { file, line } = await request.json();
    
    if (!file) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Simulate getting relationships
    // In production, this would call the DeepContext MCP server
    const relationships = DEMO_RELATIONSHIPS[file] || DEMO_RELATIONSHIPS.default;
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return NextResponse.json(relationships);
  } catch (error) {
    console.error('DeepContext relationships error:', error);
    return NextResponse.json(
      { error: 'Failed to get relationships' },
      { status: 500 }
    );
  }
}