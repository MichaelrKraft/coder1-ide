/**
 * useBridgeConnectionState Hook
 * Provides real-time bridge connection status for the UI
 *
 * Part of Bridge File Routing feature:
 * When bridge is connected, users see their local files instead of server sandbox
 */

import { useState, useEffect, useCallback } from 'react';
import { getSocket } from './socket';
import { trackEvent } from '@/components/PostHogProvider';

interface BridgeConnectionState {
  /** Whether a bridge is currently connected */
  isConnected: boolean;
  /** Bridge ID if connected */
  bridgeId: string | null;
  /** Platform of connected machine (darwin, linux, win32) */
  platform: string | null;
  /** Bridge CLI version */
  version: string | null;
  /** When the bridge connected */
  connectedAt: Date | null;
  /** Whether we're actively checking connection status */
  isChecking: boolean;
  /** Error message if connection check failed */
  error: string | null;
}

/**
 * Hook to subscribe to bridge connection state changes
 * Updates in real-time when bridge connects/disconnects
 */
export function useBridgeConnectionState(): BridgeConnectionState {
  const [state, setState] = useState<BridgeConnectionState>({
    isConnected: false,
    bridgeId: null,
    platform: null,
    version: null,
    connectedAt: null,
    isChecking: true,
    error: null
  });

  const handleBridgeConnected = useCallback((data: {
    bridgeId: string;
    userId: string;
    platform?: string;
    version?: string;
  }) => {
    console.log('🌉 Bridge connected:', data);
    trackEvent('bridge_connected', {
      platform: data.platform,
      version: data.version,
    });
    setState({
      isConnected: true,
      bridgeId: data.bridgeId,
      platform: data.platform || null,
      version: data.version || null,
      connectedAt: new Date(),
      isChecking: false,
      error: null
    });
  }, []);

  const handleBridgeDisconnected = useCallback((data: {
    bridgeId: string;
    userId: string;
  }) => {
    console.log('🌉 Bridge disconnected:', data);
    setState(prev => ({
      ...prev,
      isConnected: false,
      bridgeId: null,
      platform: null,
      version: null,
      connectedAt: null,
      isChecking: false,
      error: null
    }));
  }, []);

  const handleBridgeStatus = useCallback((status: {
    connected: boolean;
    bridges?: Array<{
      id: string;
      platform: string;
      version: string;
      connectedAt: string;
    }>;
  }) => {
    console.log('🌉 Bridge status received:', status);

    if (status.connected && status.bridges && status.bridges.length > 0) {
      const bridge = status.bridges[0]; // Use first connected bridge
      setState({
        isConnected: true,
        bridgeId: bridge.id,
        platform: bridge.platform,
        version: bridge.version,
        connectedAt: new Date(bridge.connectedAt),
        isChecking: false,
        error: null
      });
    } else {
      setState(prev => ({
        ...prev,
        isConnected: false,
        bridgeId: null,
        platform: null,
        version: null,
        connectedAt: null,
        isChecking: false,
        error: null
      }));
    }
  }, []);

  useEffect(() => {
    let socket: any = null;
    let mounted = true;

    const setupListener = async () => {
      try {
        socket = await getSocket();

        if (!mounted) return;

        // Listen for bridge connect/disconnect events
        socket.on('bridge:connected', handleBridgeConnected);
        socket.on('bridge:disconnected', handleBridgeDisconnected);

        // Request current bridge status
        socket.emit('bridge:status', {}, handleBridgeStatus);

        // Also listen for status response as an event
        socket.on('bridge:status:response', handleBridgeStatus);

        // If socket disconnects, we lose bridge state
        socket.on('disconnect', () => {
          if (mounted) {
            setState(prev => ({
              ...prev,
              isConnected: false,
              isChecking: false,
              error: 'Socket disconnected'
            }));
          }
        });

        // When socket reconnects, re-check bridge status
        socket.on('connect', () => {
          if (mounted) {
            setState(prev => ({ ...prev, isChecking: true }));
            socket.emit('bridge:status', {}, handleBridgeStatus);
          }
        });

      } catch (error) {
        console.error('Failed to setup bridge connection listener:', error);
        if (mounted) {
          setState(prev => ({
            ...prev,
            isChecking: false,
            error: 'Failed to connect to server'
          }));
        }
      }
    };

    setupListener();

    // Periodic status check every 30 seconds
    const intervalId = setInterval(async () => {
      if (socket && socket.connected) {
        socket.emit('bridge:status', {}, handleBridgeStatus);
      }
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      if (socket) {
        socket.off('bridge:connected', handleBridgeConnected);
        socket.off('bridge:disconnected', handleBridgeDisconnected);
        socket.off('bridge:status:response', handleBridgeStatus);
      }
    };
  }, [handleBridgeConnected, handleBridgeDisconnected, handleBridgeStatus]);

  return state;
}

/**
 * Simple hook that just returns whether bridge is connected
 * Use this when you only need the boolean state
 */
export function useBridgeConnected(): boolean {
  const { isConnected } = useBridgeConnectionState();
  return isConnected;
}
