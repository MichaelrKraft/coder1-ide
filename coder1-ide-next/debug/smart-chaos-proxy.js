const net = require('net');

// Configuration
const LOCAL_PORT = 3002;  // Listening Port
const TARGET_PORT = 3001; // App Port (Default Next.js)
const TARGET_HOST = 'localhost';

// Chaos Settings
const KILL_PROBABILITY = 0.6; // 60% chance to kill a SOCKET connection
const MIN_DELAY = 100;
const MAX_DELAY = 800;

const server = net.createServer((clientSocket) => {
  const targetSocket = new net.Socket();
  const remoteAddr = `${clientSocket.remoteAddress}:${clientSocket.remotePort}`;
  
  // Buffer first packet to sniff protocol
  let isFirstPacket = true;
  let isStaticRequest = false;

  targetSocket.connect(TARGET_PORT, TARGET_HOST, () => {
    // Pipeline established
  });

  clientSocket.on('data', (data) => {
    if (isFirstPacket) {
      const header = data.toString('utf8', 0, 200); // converting a chunk to string
      
      // 🕵️‍♂️ Sniff: Is this a static asset?
      // Whitelist specific Next.js paths to prevent ChunkLoadError
      if (
        header.includes('GET /_next/') || 
        header.includes('GET /static/') || 
        header.includes('GET /favicon.ico') ||
        header.includes('GET /__nextjs')
      ) {
        isStaticRequest = true;
        // console.log(`🛡️ [SAFE] Allowing static asset from ${remoteAddr}`);
      } else if (header.includes('/socket.io/')) {
        // 🎯 Target acquired: Socket.IO traffic
        // console.log(`🎯 [TARGET] Socket.IO connection detected from ${remoteAddr}`);
        
        // Rolling the dice ONLY for sockets
        if (Math.random() < KILL_PROBABILITY) {
          const delay = Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1) + MIN_DELAY);
          console.log(`🎲 [CHAOS] Will KILL socket from ${remoteAddr} in ${delay}ms`);
          
          setTimeout(() => {
            if (!clientSocket.destroyed && !targetSocket.destroyed) {
              console.log(`🔪 [CHAOS] Killing socket ${remoteAddr} NOW (Transport Close)`);
              clientSocket.destroy();
              targetSocket.destroy();
            }
          }, delay);
        } else {
          console.log(`🍀 [CHAOS] Socket ${remoteAddr} survived the roll`);
        }
      }
      
      isFirstPacket = false;
    }
    
    // Forward data if socket still open
    if (!targetSocket.destroyed) {
      targetSocket.write(data);
    }
  });

  targetSocket.on('data', (data) => {
    if (!clientSocket.destroyed) {
      clientSocket.write(data);
    }
  });

  // Error handling
  const cleanup = () => {
    if (!clientSocket.destroyed) clientSocket.destroy();
    if (!targetSocket.destroyed) targetSocket.destroy();
  };

  clientSocket.on('error', cleanup);
  targetSocket.on('error', cleanup);
  clientSocket.on('close', cleanup);
  targetSocket.on('close', cleanup);
});

server.listen(LOCAL_PORT, () => {
  console.log('=====================================================');
  console.log(`😈 SMART CHAOS PROXY LISTENING ON PORT ${LOCAL_PORT}`);
  console.log(`👉 Access: http://localhost:${LOCAL_PORT}`);
  console.log(`🎯 Target: http://${TARGET_HOST}:${TARGET_PORT}`);
  console.log(`🧠 Logic:  Safe for Assets, Deadly for Sockets (${KILL_PROBABILITY*100}%)`);
  console.log('=====================================================');
});
