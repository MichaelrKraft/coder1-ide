'use client';

import { useEffect } from 'react';
import { useTeamStore } from '@/stores/useTeamStore';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * Shows toast notifications for teammate push events.
 * Only shows toasts for pushes from OTHER team members (not your own).
 */
export function useTeamActivityToasts() {
  const syncTeam = useTeamStore(s => s.syncTeam);
  const currentUser = useAuthStore(s => s.user);

  useEffect(() => {
    if (!syncTeam || !currentUser) return;

    let sock: any = null;
    let cleanupFn: (() => void) | null = null;

    const setup = async () => {
      const { getSocket } = await import('@/lib/socket');
      sock = await getSocket();
      if (!sock) return;

      const handleCodeEvent = (event: any) => {
        // Only show toasts for pushes from OTHER team members
        if (event.type !== 'push') return;
        if (event.userId === currentUser.id) return;

        // Dispatch toast via custom event (consumed by Toast component)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('showToast', {
            detail: {
              message: `${event.username} pushed to remote`,
              type: 'info',
            }
          }));
        }
      };

      sock.on('team:codeEvent', handleCodeEvent);
      cleanupFn = () => { sock?.off('team:codeEvent', handleCodeEvent); };
    };

    setup();
    return () => { cleanupFn?.(); };
  }, [syncTeam?.id, currentUser?.id]);
}
