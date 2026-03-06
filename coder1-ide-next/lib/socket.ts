import { io, Socket } from 'socket.io-client';
import { TraceContext, createTracePayload } from './trace';
import { ClientWebSocketAuth } from './websocket-auth-client';

// Check if Socket.IO is available (either from bundle or CDN)
const getSocketIO = () => {
  // First try the bundled version
  if (typeof io !== 'undefined') {
    console.log('✅ Using bundled Socket.IO client');
    return io;
  }
  
  // Fallback to CDN version if available
  if (typeof window !== 'undefined' && (window as any).socketIOFallback) {
    console.log('✅ Using Socket.IO CDN fallback');
    return (window as any).socketIOFallback;
  }
  
  // Last resort - try global io
  if (typeof window !== 'undefined' && (window as any).io) {
    console.log('✅ Using global Socket.IO');
    return (window as any).io;
  }
  
  console.error('❌ Socket.IO not available from any source!');
  console.error('This usually means you are using legacy mode (npm run dev:legacy)');
  console.error('Solution: Use "npm run dev" for unified server with Socket.IO support');
  return null;
};

let socket: Socket | null = null;
let connectionAttempts = 0;
let visibilityHandler: (() => void) | null = null;
let visibilityListenerAdded = false;
let moduleHeartbeatInterval: NodeJS.Timeout | null = null;

// Create a mock socket for fallback
const createMockSocket = (): Socket => {
  console.warn('⚠️ Using mock socket - real connection failed');
  console.warn('This happens when using "npm run dev:legacy" instead of "npm run dev"');
  console.warn('Terminal and WebSocket features will NOT work in legacy mode');
  const mockSocket = {
    id: 'mock-socket',
    connected: false,
    on: (event: string, callback: Function) => {
      console.log(`Mock socket: on('${event}')`);
      return mockSocket;
    },
    off: (event: string, callback?: Function) => {
      console.log(`Mock socket: off('${event}')`);
      return mockSocket;
    },
    emit: (event: string, ...args: any[]) => {
      console.log(`Mock socket: emit('${event}')`, args);
      return mockSocket;
    },
    disconnect: () => {
      console.log('Mock socket: disconnect()');
      return mockSocket;
    },
    connect: () => {
      console.log('Mock socket: connect()');
      return mockSocket;
    },
    io: {
      engine: {
        transport: { name: 'mock' }
      }
    }
  } as any;
  return mockSocket;
};

export const getSocket = async (sessionId?: string, bridgeAuth: boolean = false): Promise<Socket> => {
  try {
    // 🔧 CRITICAL FIX (Oct 29, 2025): Reconnect disconnected sockets
    // Bug: Terminal cleanup disconnects socket but doesn't null it out
    // This caused reused sockets to stay disconnected forever
    if (socket && !socket.connected) {
      console.log('🔄 Reconnecting existing disconnected socket...');
      socket.connect();
    }
    
    if (!socket) {
      connectionAttempts++;
      console.log(`🔌 CREATING SOCKET CONNECTION (attempt ${connectionAttempts})`);
      
      // Connect to the unified server (Next.js custom server)
      // 🎯 CRITICAL FIX (Oct 28, 2025): Always use window.location.origin (already includes port!)
      // Previous bug: We were constructing URL with port when origin already had it
      // This caused Socket.IO to use wrong URLs like /57132/health instead of /socket.io/
      // 🎯 CRITICAL FIX (Jan 13, 2026): Remove localhost fallback - breaks production SSR
      const unifiedUrl = typeof window !== 'undefined'
        ? window.location.origin // ALWAYS use origin (works in both dev and production)
        : (process.env.NEXT_PUBLIC_UNIFIED_SERVER_URL || '');

      // Warn if URL is empty during SSR (indicates missing env var in production)
      if (!unifiedUrl && typeof window === 'undefined') {
        console.error('❌ NEXT_PUBLIC_UNIFIED_SERVER_URL not configured for SSR - socket will fail');
      }
      console.log(`🎯 CONNECTING TO UNIFIED SERVER: ${unifiedUrl}`);
      
      let newSocket: Socket;
      
      try {
        const socketIO = getSocketIO();
        
        if (!socketIO) {
          throw new Error('Socket.IO library not loaded');
        }
        
        newSocket = socketIO(unifiedUrl, {
          path: '/socket.io/',
          transports: ['polling'], // Polling only - Render proxy kills WebSocket connections
          reconnection: true,
          reconnectionAttempts: 25, // Cap reconnection attempts to prevent connection storms
          reconnectionDelay: 1000,
          reconnectionDelayMax: 10000, // INCREASED: Max backoff to 10 seconds
          timeout: 45000, // INCREASED: Match server connectTimeout
          forceNew: false,
          // FIXED: Aggressive keepalive for Render proxy (kills connections at ~90s idle)
          pingTimeout: 60000,  // 60s — under Render's ~90s proxy timeout
          pingInterval: 10000,  // 10s — aggressive keepalive to prevent proxy killing idle connections
          // ADDED: Additional stability settings
          autoConnect: true,
          withCredentials: true,
          upgrade: false, // Don't upgrade to WebSocket - Render proxy kills persistent connections
          rememberUpgrade: false,
          // ADDED: Keep connection alive during idle
          closeOnBeforeunload: false,
          // AUTH: Fetch a ticket before each connection attempt (initial + reconnects)
          // Tickets expire in 30 seconds, so the dynamic callback ensures a fresh one each time
          auth: (cb: (data: object) => void) => {
            if (typeof window === 'undefined') { cb({}); return; }
            const wsAuth = new ClientWebSocketAuth();
            const effectiveSessionId = sessionId || `client_${Date.now()}`;
            wsAuth.requestTicket(effectiveSessionId, bridgeAuth)
              .then((ticketId) => { cb({ ticketId }); })
              .catch((err) => {
                console.warn('⚠️ Failed to get auth ticket:', err);
                cb({});
              });
          }
        });

        // Verify socket was created properly
        if (!newSocket || typeof newSocket.on !== 'function') {
          throw new Error('Failed to create Socket.IO instance');
        }
      } catch (ioError) {
        console.error('❌ Socket.IO initialization failed:', ioError);
        
        // In production, log the error but still provide a mock socket to prevent crashes
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
          console.error('🚨 WARNING: Socket.IO connection failed in production!');
          console.error('Terminal functionality will be limited.');
          console.error('Error details:', ioError);
          // Don't throw - gracefully fallback to mock
        }
        
        console.warn('⚠️ Using mock socket as fallback');
        newSocket = createMockSocket();
      }

      // Basic connection event logging
      newSocket.on('connect', () => {
        console.log('✅ SOCKET.IO CONNECTED:', {
          id: newSocket.id,
          url: unifiedUrl,
          timestamp: new Date().toISOString()
        });
        connectionAttempts = 0; // Reset on successful connection
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ SOCKET.IO DISCONNECTED:', {
          reason,
          timestamp: new Date().toISOString(),
          willReconnect: newSocket?.active
        });
      });

      newSocket.on('connect_error', (error) => {
        console.error('🚨 SOCKET.IO CONNECTION ERROR:', {
          message: error.message,
          type: (error as any).type,
          url: unifiedUrl,
          attempt: connectionAttempts,
          timestamp: new Date().toISOString()
        });
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('🔄 SOCKET.IO RECONNECTED:', {
          attempts: attemptNumber,
          id: newSocket?.id,
          timestamp: new Date().toISOString()
        });
      });

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 SOCKET.IO RECONNECT ATTEMPT ${attemptNumber}`);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('🚨 SOCKET.IO RECONNECT ERROR:', {
          message: error.message,
          timestamp: new Date().toISOString()
        });
      });

      newSocket.on('reconnect_failed', () => {
        console.error('💀 SOCKET.IO RECONNECT FAILED - All attempts exhausted');
      });

      // ADDED: Client-side heartbeat keepalive to prevent idle disconnects
      let heartbeatInterval: NodeJS.Timeout | null = null;
      let lastPongTime = Date.now();
      
      const startHeartbeat = () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (moduleHeartbeatInterval) clearInterval(moduleHeartbeatInterval);

        // Send ping every 20 seconds to keep connection alive
        heartbeatInterval = setInterval(() => {
          if (newSocket?.connected) {
            const now = Date.now();
            const timeSinceLastPong = now - lastPongTime;
            
            // If we haven't received a pong in 5 minutes, connection may be stale
            if (timeSinceLastPong > 300000) {
              console.warn(`⚠️ No pong received for ${Math.round(timeSinceLastPong/1000)}s - connection may be stale`);
            }
            
            newSocket.emit('ping', { timestamp: now });
            console.log('💓 Heartbeat ping sent');
          }
        }, 10000); // 10s — aggressive heartbeat to keep Render proxy connection alive
        moduleHeartbeatInterval = heartbeatInterval;
      };

      const stopHeartbeat = () => {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        if (moduleHeartbeatInterval) {
          clearInterval(moduleHeartbeatInterval);
          moduleHeartbeatInterval = null;
        }
      };
      
      // Listen for pong responses
      newSocket.on('pong', (data: any) => {
        lastPongTime = Date.now();
        const latency = lastPongTime - (data?.timestamp || lastPongTime);
        console.log(`💚 Heartbeat pong received (latency: ${latency}ms)`);
      });
      
      // Start heartbeat when connected
      newSocket.on('connect', () => {
        lastPongTime = Date.now();
        startHeartbeat();
      });
      
      // Stop heartbeat when disconnected
      newSocket.on('disconnect', () => {
        stopHeartbeat();
      });

      // Detect when user returns to tab and verify socket health
      if (typeof document !== 'undefined' && !visibilityListenerAdded) {
        visibilityListenerAdded = true;
        visibilityHandler = () => {
          if (document.visibilityState === 'visible' && newSocket) {
            if (!newSocket.connected) {
              console.log('🔄 Tab visible — socket disconnected, reconnecting...');
              newSocket.connect();
            } else {
              // Socket thinks it's connected — verify with a ping
              const pingTime = Date.now();
              newSocket.emit('ping', { timestamp: pingTime });

              // If no pong within 5 seconds, force reconnect
              const healthCheck = setTimeout(() => {
                if (lastPongTime < pingTime) {
                  console.warn('⚠️ Tab visible — socket stale (no pong), forcing reconnect...');
                  newSocket.disconnect();
                  newSocket.connect();
                }
              }, 5000);

              // Cancel the health check if pong arrives
              newSocket.once('pong', () => {
                clearTimeout(healthCheck);
              });
            }
          }
        };
        document.addEventListener('visibilitychange', visibilityHandler);
      }

      // Johnny5 Heartbeat & Notification events → dispatch as CustomEvents for UI
      newSocket.on('johnny5:heartbeat', (data: any) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('johnny5:heartbeat', { detail: data }));
        }
      });

      newSocket.on('johnny5:opportunity', (data: any) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('johnny5:opportunity', { detail: data }));
        }
      });

      newSocket.on('johnny5:action', (data: any) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('johnny5:action', { detail: data }));
        }
      });

      newSocket.on('johnny5:notification', (data: any) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('johnny5:notification', { detail: data }));
        }
      });

      // Server shutdown notification - allows UI to show "Server restarting..."
      newSocket.on('server:shutdown', (data: any) => {
        console.log('🔄 Server shutdown notification received:', data);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('server:shutdown', { detail: data }));
        }
      });

      // Assign to module variable after setup
      socket = newSocket;
    }

    return socket;
  } catch (error) {
    console.error('❌ Failed to create Socket.IO connection:', error);
    throw error;
  }
};

export const disconnectSocket = () => {
  // Clear heartbeat interval to prevent leak
  if (moduleHeartbeatInterval) {
    clearInterval(moduleHeartbeatInterval);
    moduleHeartbeatInterval = null;
  }
  // Remove visibility listener to prevent leak
  if (visibilityHandler && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
    visibilityListenerAdded = false;
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// ================================================================================
// Traced Socket Emission
// ================================================================================

/**
 * Emit a Socket.IO event with trace context attached
 * The trace context is added as _trace property in the payload
 *
 * @param socket - The Socket.IO socket instance
 * @param event - The event name to emit
 * @param data - The payload data
 * @param traceContext - Optional trace context to attach
 *
 * Example:
 *   const trace = startTrace('team:spawn');
 *   emitWithTrace(socket, 'team:spawn', { requirement }, trace);
 */
export const emitWithTrace = (
  socketInstance: Socket,
  event: string,
  data: Record<string, unknown>,
  traceContext?: TraceContext
): void => {
  const payload = {
    ...data,
    _trace: traceContext ? createTracePayload(traceContext) : undefined
  };

  // Log the traced emission for debugging
  if (traceContext) {
    console.log(`[${traceContext.traceId}] Socket emit: ${event}`);
  }

  socketInstance.emit(event, payload);
};

/**
 * Helper to get current socket and emit with trace in one call
 * Creates socket if not connected
 */
export const emitTracedEvent = async (
  event: string,
  data: Record<string, unknown>,
  traceContext?: TraceContext
): Promise<void> => {
  const socketInstance = await getSocket();
  emitWithTrace(socketInstance, event, data, traceContext);
};

/**
 * Extract trace context from incoming Socket.IO payload
 * Returns undefined if no trace context present
 */
export const extractTraceFromMessage = (
  payload: Record<string, unknown>
): { traceId: string; spanId?: string; parentSpanId?: string } | undefined => {
  const trace = payload._trace as Record<string, unknown> | undefined;
  if (!trace || !trace.traceId) {
    return undefined;
  }

  return {
    traceId: trace.traceId as string,
    spanId: trace.spanId as string | undefined,
    parentSpanId: trace.parentSpanId as string | undefined
  };
};