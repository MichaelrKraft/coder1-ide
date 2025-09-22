import { NextRequest, NextResponse } from 'next/server';

// Simulated semantic search results for demo
const DEMO_RESULTS = {
  'authentication': [
    {
      file: '/app/api/auth/route.ts',
      line: 45,
      content: 'export async function authenticateUser(email: string, password: string)',
      relevance: 0.95,
      context: 'Main authentication handler that validates user credentials',
      type: 'function'
    },
    {
      file: '/middleware/auth.ts',
      line: 12,
      content: 'const verifyToken = (token: string): boolean => {',
      relevance: 0.88,
      context: 'JWT token verification middleware',
      type: 'function'
    },
    {
      file: '/contexts/AuthContext.tsx',
      line: 78,
      content: 'const [isAuthenticated, setIsAuthenticated] = useState(false);',
      relevance: 0.82,
      context: 'Frontend authentication state management',
      type: 'variable'
    }
  ],
  'payment': [
    {
      file: '/services/payment-service.ts',
      line: 23,
      content: 'async function processPayment(amount: number, userId: string)',
      relevance: 0.92,
      context: 'Handles payment processing with Stripe',
      type: 'function'
    },
    {
      file: '/app/api/checkout/route.ts',
      line: 56,
      content: 'const paymentIntent = await stripe.paymentIntents.create({',
      relevance: 0.87,
      context: 'Creates Stripe payment intent',
      type: 'function'
    }
  ],
  'default': [
    {
      file: '/app/page.tsx',
      line: 10,
      content: 'export default function HomePage() {',
      relevance: 0.7,
      context: 'Main application entry point',
      type: 'function'
    }
  ]
};

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Simulate semantic search
    // In production, this would call the DeepContext MCP server
    const lowerQuery = query.toLowerCase();
    
    // Find matching results based on keywords
    let results = DEMO_RESULTS.default;
    
    if (lowerQuery.includes('auth') || lowerQuery.includes('login')) {
      results = DEMO_RESULTS.authentication;
    } else if (lowerQuery.includes('payment') || lowerQuery.includes('checkout')) {
      results = DEMO_RESULTS.payment;
    }
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('DeepContext search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}