'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'coder1-power-pack-nudge-shown';

/**
 * Listens for the `power-pack:first-connect` socket event emitted when a user
 * pairs their bridge for the first time, then shows a one-time info toast
 * pointing them toward the Templates Hub Power Pack.
 *
 * Uses the same window CustomEvent pattern as the rest of the IDE page.
 */
export function usePowerPackNudge() {
  useEffect(() => {
    const alreadyShown = localStorage.getItem(STORAGE_KEY);
    if (alreadyShown) return;

    let cleanup: (() => void) | null = null;

    const setup = async () => {
      const { getSocket } = await import('@/lib/socket');
      const socket = await getSocket();
      if (!socket) return;

      const handleFirstConnect = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: {
            message: 'Set up your Claude Code environment with the Coder1 Power Pack — open Templates Hub to install.',
            type: 'info',
            duration: 10000,
          },
        }));
      };

      socket.on('power-pack:first-connect', handleFirstConnect);
      cleanup = () => socket.off('power-pack:first-connect', handleFirstConnect);
    };

    setup().catch((err) => {
      console.warn('[usePowerPackNudge] Failed to set up socket listener:', err);
    });

    return () => {
      cleanup?.();
    };
  }, []);
}
