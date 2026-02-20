'use client';

import { useEffect } from 'react';
import { useTeamStore } from '@/stores/useTeamStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';
import { features } from '@/lib/feature-flags';
import type { TeamSummarySharedPayload } from '@/types/team';

/**
 * Shows toast notifications for teammate push events and shared session summaries.
 * Only shows toasts for events from OTHER team members (not your own).
 */
export function useTeamActivityToasts() {
  const syncTeam = useTeamStore(s => s.syncTeam);
  const currentUser = useAuthStore(s => s.user);

  useEffect(() => {
    // Skip if team features are disabled
    if (!features().teamFeatures) return;
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

      const handleSummaryShared = (payload: TeamSummarySharedPayload) => {
        // Skip own shares
        if (payload.summary.user_id === currentUser.id) return;

        const excerpt = payload.summary.excerpt.slice(0, 100);
        useUIStore.getState().addToast({
          message: `${payload.summary.user_name} shared a session summary: ${excerpt}`,
          type: 'info',
          actions: [
            {
              label: 'View',
              onClick: () => {
                useTeamStore.getState().setOpenToSummariesTab(true);
                window.dispatchEvent(new CustomEvent('openTeamPanel'));
              },
            },
          ],
        });
      };

      sock.on('team:codeEvent', handleCodeEvent);
      sock.on('team:summaryShared', handleSummaryShared);

      cleanupFn = () => {
        sock?.off('team:codeEvent', handleCodeEvent);
        sock?.off('team:summaryShared', handleSummaryShared);
      };
    };

    setup();
    return () => { cleanupFn?.(); };
  }, [syncTeam?.id, currentUser?.id]);
}
