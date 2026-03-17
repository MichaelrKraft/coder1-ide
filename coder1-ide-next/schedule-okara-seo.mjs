// Send Okara SEO task to Johnny5 via ManusLive gateway
import WebSocket from 'ws';

const GATEWAY_URL = 'ws://localhost:55413/dashboard';

const TASK = `
Hey Johnny5! I need you to set up a **recurring scheduled task** that runs daily at 3:17 AM.

## Task: Okara SEO Tips Implementation

**Schedule:** Daily at 3:17 AM (cron: "17 3 * * *")

**Steps:**
1. **Check Email**: Access poolkraftllc@gmail.com and find unread emails from no-reply@okara.ai
2. **Extract Tips**: Parse the email content for actionable SEO recommendations
3. **Implement Changes**: For each tip, make the appropriate changes in /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/:
   - Meta tags (app/layout.tsx, page.tsx files)
   - OpenGraph/Twitter card metadata
   - Structured data (JSON-LD)
   - Alt text for images
   - Heading hierarchy improvements
   - Internal linking suggestions
4. **Create PR**: Create a branch seo/okara-tips-YYYY-MM-DD, commit changes, push, and create a PR
5. **Notify**: Send notification via Telegram when complete

**Output:**
- GitHub PR for review (do NOT auto-merge)
- Telegram notification with summary

**Safety Rules:**
- Only modify SEO-related metadata
- Do not change business logic or UI components
- Always create PR for review

Please confirm you've scheduled this task and tell me when the first run will be.
`;

async function main() {
  console.log('Connecting to ManusLive gateway at', GATEWAY_URL);

  const ws = new WebSocket(GATEWAY_URL);
  let authenticated = false;
  let messageId = `okara-seo-${Date.now()}`;

  ws.on('open', () => {
    console.log('WebSocket connected');
  });

  ws.on('message', (data) => {
    const raw = data.toString();

    try {
      const parsed = JSON.parse(raw);

      // Handle connect challenge
      if ((parsed.type === 'event' || parsed.type === 'evt') && parsed.event === 'connect.challenge') {
        console.log('Responding to auth challenge...');
        const authResponse = {
          type: 'req',
          id: '1',
          method: 'connect',
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: 'coder1-okara-scheduler',
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
      if (parsed.type === 'res' && parsed.id === '1' && (parsed.ok || parsed.result)) {
        console.log('Authenticated! Sending Okara SEO task...');
        authenticated = true;

        const chatPayload = {
          type: 'req',
          id: messageId,
          method: 'chat.send',
          params: {
            sessionKey: 'scheduled:okara-seo',
            message: TASK,
            deliver: true,
            idempotencyKey: messageId,
          },
        };
        ws.send(JSON.stringify(chatPayload));
        console.log('Task sent to Johnny5!');
      }

      // Handle streaming response
      if ((parsed.type === 'event' || parsed.type === 'evt') && parsed.event === 'chat') {
        if (parsed.payload?.state === 'delta' && parsed.payload?.message) {
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
          console.log('\n\n=== Johnny5 confirmed task ===');
          setTimeout(() => {
            ws.close();
            process.exit(0);
          }, 1000);
        }
      }

      // Handle agent events
      if ((parsed.type === 'event' || parsed.type === 'evt') && parsed.event === 'agent') {
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
    process.exit(1);
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
