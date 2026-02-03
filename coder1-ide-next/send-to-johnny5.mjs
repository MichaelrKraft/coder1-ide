// Simple WebSocket client to send message to Johnny5 via ManusLive gateway
import WebSocket from 'ws';

const GATEWAY_URL = 'ws://localhost:18789';

const TASK = `
Hey Johnny5! I have a task for you to figure out and execute autonomously:

## Stripe Integration Setup for Coder1 IDE Alpha Launch

**Your Mission:** Set up Stripe payment integration for the Coder1 Pro subscription.

### Step 1: Create Stripe Product (~5 min)
1. Go to https://dashboard.stripe.com/products
2. Click "Add product"  
3. Fill in:
   - Name: Coder1 Pro
   - Price: $29.00 USD / Monthly (recurring)
4. Save and copy the Price ID (starts with price_...)

### Step 2: Get API Keys
Go to https://dashboard.stripe.com/apikeys and copy both:
- Publishable key: pk_live_... or pk_test_...
- Secret key: sk_live_... or sk_test_...

### Step 3: Add to .env.local
Add these 3 lines to the .env.local file in coder1-ide-next:
STRIPE_SECRET_KEY=sk_live_YOUR_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE  
STRIPE_PRO_PRICE_ID=price_YOUR_PRICE_ID_HERE

### Step 4: Test It
1. Restart dev server: npm run dev
2. Go to http://localhost:3001/alpha#pricing
3. Click "Start Pro Trial" on the Pro card
4. Use test card: 4242 4242 4242 4242 (any future date, any CVC)
5. Complete payment → should redirect to IDE with welcome toast

Can you help me accomplish this? Let me know what you need access to.
`;

async function main() {
  console.log('Connecting to ManusLive gateway at', GATEWAY_URL);
  
  const ws = new WebSocket(GATEWAY_URL);
  let authenticated = false;
  let messageId = `msg-${Date.now()}`;
  
  ws.on('open', () => {
    console.log('WebSocket connected');
  });
  
  ws.on('message', (data) => {
    const raw = data.toString();
    console.log('Received:', raw.substring(0, 500));
    
    try {
      const parsed = JSON.parse(raw);
      
      // Handle connect challenge
      if (parsed.type === 'event' && parsed.event === 'connect.challenge') {
        console.log('Responding to auth challenge...');
        const authResponse = {
          type: 'req',
          id: '1',
          method: 'connect',
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: 'coder1-test-client',
              version: '1.0.0',
              platform: 'darwin',
              mode: 'backend',
            },
            auth: { token: '' },
          },
        };
        ws.send(JSON.stringify(authResponse));
      }
      
      // Auth success
      if (parsed.type === 'res' && parsed.id === '1' && parsed.ok) {
        console.log('Authenticated! Sending task...');
        authenticated = true;
        
        // Send chat message
        const chatPayload = {
          type: 'req',
          id: messageId,
          method: 'chat.send',
          params: {
            sessionKey: 'dashboard:main',
            message: TASK,
            deliver: true,
            idempotencyKey: messageId,
          },
        };
        ws.send(JSON.stringify(chatPayload));
        console.log('Task sent to Johnny5!');
      }
      
      // Handle chat events with content
      if (parsed.type === 'event' && parsed.event === 'chat') {
        if (parsed.payload?.state === 'delta' && parsed.payload?.message) {
          // Streaming response
          const content = parsed.payload.message;
          if (typeof content === 'string') {
            process.stdout.write(content);
          } else if (Array.isArray(content)) {
            content.forEach(c => {
              if (c.text) process.stdout.write(c.text);
            });
          }
        }
        
        if (parsed.payload?.state === 'final') {
          console.log('\n\n=== Johnny5 completed response ===');
          setTimeout(() => {
            ws.close();
            process.exit(0);
          }, 1000);
        }
      }
      
      // Handle agent events
      if (parsed.type === 'event' && parsed.event === 'agent') {
        if (parsed.payload?.type === 'delta' && parsed.payload?.delta?.text) {
          process.stdout.write(parsed.payload.delta.text);
        }
        if (parsed.payload?.type === 'done') {
          console.log('\n\n=== Johnny5 Response Complete ===');
          if (parsed.payload.content) {
            console.log(parsed.payload.content);
          }
          setTimeout(() => {
            ws.close();
            process.exit(0);
          }, 1000);
        }
      }
      
    } catch (e) {
      // Not JSON, ignore
    }
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
  });
  
  ws.on('close', () => {
    console.log('Connection closed');
  });
  
  // Timeout after 2 minutes
  setTimeout(() => {
    console.log('\nTimeout - closing connection');
    ws.close();
    process.exit(0);
  }, 120000);
}

main();
