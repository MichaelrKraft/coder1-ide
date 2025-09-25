/**
 * Test script for Contextual Retrieval Service
 * Verifies the service works with existing conversation data
 */

import { contextualRetrieval, ContextualQuery } from '../services/contextual-retrieval';
import { contextDatabase } from '../services/context-database';
import { logger } from '../lib/logger';

async function testContextualRetrieval(): Promise<void> {
  console.log('🧪 Testing Contextual Retrieval Service');
  console.log('=====================================');
  
  try {
    // Initialize database
    await contextDatabase.initialize();
    
    // Check if we have existing conversation data
    const stats = await contextDatabase.getStats();
    console.log(`📊 Database stats: ${stats.totalConversations} conversations, ${stats.totalSessions} sessions`);
    
    if (stats.totalConversations === 0) {
      console.log('📭 No existing conversations found. Creating test data...');
      await createTestData();
    }
    
    // Test queries
    const testQueries: ContextualQuery[] = [
      {
        userInput: "claude fix this error",
        errorContext: "TypeError: Cannot read property 'length' of undefined"
      },
      {
        userInput: "how do I install dependencies",
        recentCommands: ["npm install", "yarn add"]
      },
      {
        userInput: "claude help with authentication",
        currentFiles: ["auth.js", "login.tsx"],
        errorContext: "JWT token expired"
      },
      {
        userInput: "typescript error in my component",
        currentFiles: ["Component.tsx", "types.ts"],
        errorContext: "Property 'data' does not exist on type"
      },
      {
        userInput: "deploy my app",
        recentCommands: ["npm run build", "git push"],
        projectContext: "Next.js application"
      }
    ];
    
    console.log('🔍 Testing contextual retrieval with sample queries...\n');
    
    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      console.log(`Test ${i + 1}: "${query.userInput}"`);
      
      const startTime = Date.now();
      const memories = await contextualRetrieval.findRelevantMemories(query);
      const duration = Date.now() - startTime;
      
      console.log(`  ⏱️  Processing time: ${duration}ms`);
      console.log(`  📋 Found ${memories.length} relevant memories`);
      
      if (memories.length > 0) {
        console.log('  🎯 Top results:');
        memories.slice(0, 3).forEach((memory, index) => {
          console.log(`    ${index + 1}. Score: ${memory.relevanceScore.toFixed(3)} | ${memory.timeAgo} | ${memory.matchReason}`);
          console.log(`       Preview: ${memory.quickPreview}`);
        });
      } else {
        console.log('  📭 No relevant memories found');
      }
      
      console.log('');
    }
    
    // Test keyword extraction
    console.log('🔤 Testing keyword extraction:');
    const testInputs = [
      "claude fix this TypeError in my React component",
      "npm install failed with permission error",
      "how to configure JWT authentication in Express",
      "TypeScript build error in types.d.ts file",
      "deploy Next.js app to Vercel with environment variables"
    ];
    
    testInputs.forEach(input => {
      const keywords = (contextualRetrieval as any).extractKeywords(input);
      console.log(`  Input: "${input}"`);
      console.log(`  Keywords: ${keywords.slice(0, 8).join(', ')}\n`);
    });
    
    // Performance test
    console.log('⚡ Performance test (100 queries):');
    const perfQuery: ContextualQuery = {
      userInput: "claude help with error debugging",
      errorContext: "ReferenceError: variable is not defined"
    };
    
    const perfStart = Date.now();
    const promises = Array(100).fill(null).map(() => 
      contextualRetrieval.findRelevantMemories(perfQuery)
    );
    
    await Promise.all(promises);
    const perfEnd = Date.now();
    const avgTime = (perfEnd - perfStart) / 100;
    
    console.log(`  📊 Average query time: ${avgTime.toFixed(2)}ms`);
    console.log(`  🚀 Queries per second: ${(1000 / avgTime).toFixed(1)}`);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function createTestData(): Promise<void> {
  console.log('📝 Creating test conversation data...');
  
  // Get or create folder
  const projectPath = '/Users/michaelkraft/autonomous_vibe_interface';
  const folder = await contextDatabase.getOrCreateFolder(projectPath, 'Test Project');
  
  // Create session
  const session = await contextDatabase.createSession(folder.id);
  
  // Add sample conversations
  const testConversations = [
    {
      session_id: session.id,
      user_input: "claude fix this TypeError: Cannot read property 'length' of undefined",
      claude_reply: "This error occurs when you're trying to access the length property on an undefined variable. Check if your variable is properly initialized before accessing its properties. Try adding a null check: if (myArray && myArray.length > 0) { ... }",
      success: true,
      files_involved: JSON.stringify(['Component.tsx', 'utils.js']),
      tokens_used: 150
    },
    {
      session_id: session.id,
      user_input: "how do I install npm dependencies that are missing",
      claude_reply: "To install missing npm dependencies, run 'npm install' to install all dependencies from package.json, or 'npm install <package-name>' to install a specific package. If you're getting permission errors, try using 'sudo' or configuring npm to use a different directory.",
      success: true,
      files_involved: JSON.stringify(['package.json']),
      tokens_used: 120
    },
    {
      session_id: session.id,
      user_input: "JWT authentication setup in Express server",
      claude_reply: "To set up JWT authentication in Express: 1) Install jsonwebtoken package, 2) Create middleware to verify tokens, 3) Generate tokens on login, 4) Protect routes with the middleware. Here's a basic example: const jwt = require('jsonwebtoken'); const authenticateToken = (req, res, next) => { const token = req.header('Authorization'); if (!token) return res.status(401).send('Access denied'); try { const verified = jwt.verify(token, process.env.JWT_SECRET); req.user = verified; next(); } catch (err) { res.status(400).send('Invalid token'); } };",
      success: true,
      files_involved: JSON.stringify(['auth.js', 'middleware/auth.js', 'routes/login.js']),
      tokens_used: 280
    },
    {
      session_id: session.id,
      user_input: "TypeScript error Property data does not exist on type",
      claude_reply: "This TypeScript error means you're trying to access a property that TypeScript doesn't know exists on the type. Solutions: 1) Add the property to your interface/type definition, 2) Use type assertion (obj as any).data, 3) Add optional chaining obj.data?, 4) Check if the property exists with 'in' operator. Make sure your type definitions match your actual data structure.",
      success: true,
      files_involved: JSON.stringify(['types.ts', 'Component.tsx']),
      tokens_used: 180
    },
    {
      session_id: session.id,
      user_input: "deploy Next.js application to production",
      claude_reply: "To deploy a Next.js app: 1) Build the app with 'npm run build', 2) Choose a platform (Vercel, Netlify, AWS, etc.), 3) Set environment variables, 4) Configure deployment settings. For Vercel (recommended): install Vercel CLI, run 'vercel' in your project directory, follow the prompts. For other platforms, you may need to configure the build output directory and set Node.js version.",
      success: true,
      files_involved: JSON.stringify(['next.config.js', 'package.json', '.env.local']),
      tokens_used: 220
    }
  ];
  
  for (const conv of testConversations) {
    await contextDatabase.storeConversation(conv);
  }
  
  console.log(`✅ Created ${testConversations.length} test conversations`);
}

// Run the test if this file is executed directly
if (require.main === module) {
  testContextualRetrieval().catch(console.error);
}

export { testContextualRetrieval };