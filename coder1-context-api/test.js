/**
 * Simple test to verify Context API works
 * Run: npm test
 */

const { Coder1Client } = require('./clients/sdk');

async function test() {
  console.log('🧪 Testing Coder1 Context API...\n');

  const client = new Coder1Client({
    apiUrl: 'http://localhost:3005'
  });

  try {
    // 1. Health check
    console.log('1. Health check...');
    const health = await client.health();
    console.log('✅ Health:', health.status);

    // 2. Create memory
    console.log('\n2. Creating memory...');
    const memory = await client.memories.create({
      type: 'decision',
      content: {
        title: 'Test memory from SDK',
        description: 'Testing the Context API',
        reasoning: 'Validating infrastructure experiment'
      },
      tags: ['test', 'sdk']
    });
    console.log('✅ Created:', memory.id);

    // 3. Get memory
    console.log('\n3. Retrieving memory...');
    const retrieved = await client.memories.get(memory.id);
    console.log('✅ Retrieved:', retrieved.content.title);

    // 4. Search memories
    console.log('\n4. Searching memories...');
    const results = await client.memories.search('test');
    console.log('✅ Found:', results.count, 'memories');

    // 5. List all
    console.log('\n5. Listing all memories...');
    const all = await client.memories.list();
    console.log('✅ Total memories:', all.count);

    console.log('\n🎉 All tests passed!');
    console.log('\n💡 Next step: Build VS Code extension using this SDK');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n💡 Make sure server is running: npm run dev');
    process.exit(1);
  }
}

// Check if server is running first
const checkServer = async () => {
  try {
    const response = await fetch('http://localhost:3005/health');
    if (response.ok) {
      test();
    }
  } catch (error) {
    console.log('❌ Server not running on port 3005');
    console.log('\n💡 Start server first:');
    console.log('   npm run dev');
    console.log('\n   Then run tests in another terminal:');
    console.log('   npm test');
    process.exit(1);
  }
};

checkServer();
