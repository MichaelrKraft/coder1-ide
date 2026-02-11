'use client';

import { useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/useUIStore';

/**
 * Hook that listens for team sync events and shows toast notifications.
 * Debounces rapid events during initial sync.
 */
export function useTeamSyncToasts() {
  const { addToast } = useUIStore();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCount = useRef(0);
  const pendingContributor = useRef<string | null>(null);

  useEffect(() => {
    const handleSyncPull = (event: Event) => {
      const detail = (event as CustomEvent<{ count: number; contributorName: string | null; isInitialSync: boolean }>).detail;
      const { count, contributorName, isInitialSync } = detail;

      if (isInitialSync) {
        // Single summary toast for initial sync
        addToast({
          type: 'success',
          message: `Synced ${count} team insights`,
        });
        return;
      }

      // Debounce rapid events (5s window)
      pendingCount.current += count;
      if (contributorName) pendingContributor.current = contributorName;

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        const msg = pendingContributor.current
          ? `Synced ${pendingCount.current} new insight${pendingCount.current > 1 ? 's' : ''} from @${pendingContributor.current}`
          : `Synced ${pendingCount.current} new team insight${pendingCount.current > 1 ? 's' : ''}`;

        addToast({ type: 'success', message: msg });

        pendingCount.current = 0;
        pendingContributor.current = null;
      }, 5000);
    };

    window.addEventListener('teamSync:pulled', handleSyncPull);
    return () => {
      window.removeEventListener('teamSync:pulled', handleSyncPull);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [addToast]);
}
