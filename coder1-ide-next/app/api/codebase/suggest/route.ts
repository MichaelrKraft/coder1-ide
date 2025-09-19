import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const limit = searchParams.get('limit') || '8';

  try {
    // Proxy to Express backend
    const backendUrl = `http://localhost:3000/api/codebase/suggest?q=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await fetch(backendUrl);
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    // // logger?.error('Failed to proxy codebase suggestions:', error);
    
    // Fallback to mock data if backend is unavailable
    const mockSuggestions = [
      { type: 'function', name: 'useState', file: 'hooks.ts', params: 'initialValue' },
      { type: 'function', name: 'useEffect', file: 'hooks.ts', params: 'callback, deps' },
      { type: 'function', name: 'fetchData', file: 'api.ts', params: 'url, options' },
      { type: 'class', name: 'ComponentManager', file: 'manager.ts', methods: 12 },
      { type: 'function', name: 'formatDate', file: 'utils.ts', params: 'date, format' },
      { type: 'variable', name: 'API_BASE_URL', file: 'config.ts' },
      { type: 'function', name: 'validateInput', file: 'validation.ts', params: 'input, rules' },
      { type: 'class', name: 'DatabaseConnection', file: 'db.ts', methods: 8 }
    ];

    // Filter suggestions based on query
    const filteredSuggestions = mockSuggestions
      .filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, parseInt(limit));

    return NextResponse.json({
      success: true,
      suggestions: filteredSuggestions
    });
  }
}