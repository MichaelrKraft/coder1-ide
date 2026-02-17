'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Cloud,
  Triangle,
  Database,
  CheckCircle,
  AlertTriangle,
  Circle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Info,
  Unplug,
  Plug,
  ChevronDown,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConnectionStatus = 'connected' | 'expired' | 'not_connected';

interface PlatformConnection {
  platform: string;
  status: ConnectionStatus;
  connectedAt?: string;
  defaultServiceId?: string;
  services?: PlatformService[];
}

interface PlatformService {
  id: string;
  name: string;
  type?: string;
}

interface PlatformConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  hoverBorderColor: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'render',
    name: 'Render',
    description: 'Deploy web services, databases, and cron jobs',
    icon: <Cloud className="w-6 h-6" />,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/50',
    hoverBorderColor: 'hover:border-blue-500/30',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Deploy frontend apps and serverless functions',
    icon: <Triangle className="w-6 h-6" />,
    color: 'text-white',
    borderColor: 'border-white/50',
    hoverBorderColor: 'hover:border-white/30',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Manage databases, auth, and edge functions',
    icon: <Database className="w-6 h-6" />,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/50',
    hoverBorderColor: 'hover:border-emerald-500/30',
  },
];

const OAUTH_POPUP_WIDTH = 600;
const OAUTH_POPUP_HEIGHT = 700;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusBadge(status: ConnectionStatus): {
  label: string;
  className: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case 'connected':
      return {
        label: 'Connected',
        className: 'bg-green-500/20 text-green-400',
        icon: <CheckCircle className="w-3.5 h-3.5" />,
      };
    case 'expired':
      return {
        label: 'Expired',
        className: 'bg-yellow-500/20 text-yellow-400',
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
      };
    case 'not_connected':
    default:
      return {
        label: 'Not Connected',
        className: 'bg-gray-500/20 text-gray-400',
        icon: <Circle className="w-3.5 h-3.5" />,
      };
  }
}

function formatConnectedDate(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `Connected ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DefaultServiceSelect({
  platformId,
  services,
  selectedServiceId,
  onSelect,
}: {
  platformId: string;
  services: PlatformService[];
  selectedServiceId?: string;
  onSelect: (platformId: string, serviceId: string) => void;
}) {
  if (services.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-700">
      <label
        htmlFor={`default-service-${platformId}`}
        className="block text-xs text-gray-400 mb-1.5"
      >
        Default Service
      </label>
      <div className="relative">
        <select
          id={`default-service-${platformId}`}
          value={selectedServiceId || ''}
          onChange={(e) => onSelect(platformId, e.target.value)}
          className="w-full appearance-none bg-gray-700 border border-gray-600 text-sm text-white rounded px-3 py-1.5 pr-8 focus:outline-none focus:border-blue-500 cursor-pointer"
          aria-label={`Default service for ${platformId}`}
        >
          <option value="">Select a service...</option>
          {services.map((svc) => (
            <option key={svc.id} value={svc.id}>
              {svc.name}
              {svc.type ? ` (${svc.type})` : ''}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

function PlatformCard({
  config,
  connection,
  isLoading,
  onConnect,
  onDisconnect,
  onReconnect,
  onSelectDefaultService,
}: {
  config: PlatformConfig;
  connection: PlatformConnection | undefined;
  isLoading: boolean;
  onConnect: (platformId: string) => void;
  onDisconnect: (platformId: string) => void;
  onReconnect: (platformId: string) => void;
  onSelectDefaultService: (platformId: string, serviceId: string) => void;
}) {
  const status: ConnectionStatus = connection?.status || 'not_connected';
  const badge = getStatusBadge(status);
  const isConnected = status === 'connected';
  const isExpired = status === 'expired';

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        isConnected
          ? `bg-gray-800 ${config.borderColor} shadow-sm`
          : `bg-gray-800 border-gray-700 ${config.hoverBorderColor}`
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Platform info */}
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 flex-shrink-0 ${config.color}`}>
            {config.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                {config.name}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
              >
                {badge.icon}
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
            {connection?.connectedAt && isConnected && (
              <p className="text-xs text-gray-500 mt-1">
                {formatConnectedDate(connection.connectedAt)}
              </p>
            )}
          </div>
        </div>

        {/* Right: Action button */}
        <div className="flex-shrink-0">
          {isLoading ? (
            <button
              disabled
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-700 text-gray-400 rounded cursor-not-allowed"
              aria-label={`Connecting to ${config.name}`}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Connecting...
            </button>
          ) : isConnected ? (
            <button
              onClick={() => onDisconnect(config.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
              aria-label={`Disconnect from ${config.name}`}
            >
              <Unplug className="w-3.5 h-3.5" />
              Disconnect
            </button>
          ) : isExpired ? (
            <button
              onClick={() => onReconnect(config.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
              aria-label={`Reconnect to ${config.name}`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reconnect
            </button>
          ) : (
            <button
              onClick={() => onConnect(config.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
              aria-label={`Connect to ${config.name}`}
            >
              <Plug className="w-3.5 h-3.5" />
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Default service dropdown (only when connected) */}
      {isConnected && connection?.services && (
        <DefaultServiceSelect
          platformId={config.id}
          services={connection.services}
          selectedServiceId={connection.defaultServiceId}
          onSelect={onSelectDefaultService}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function IntegrationsPanel() {
  const [connections, setConnections] = useState<
    Record<string, PlatformConnection>
  >({});
  const [loadingPlatforms, setLoadingPlatforms] = useState<
    Record<string, boolean>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const oauthPopupRef = useRef<Window | null>(null);

  // -------------------------------------------------------------------------
  // Fetch connection status on mount
  // -------------------------------------------------------------------------

  const fetchStatus = useCallback(async (deep: boolean = false) => {
    try {
      setIsFetching(true);
      setError(null);
      // Use ?deep=true to check Composio global connections (slower)
      const url = deep ? '/api/composio/status?deep=true' : '/api/composio/status';
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch status (${res.status})`);
      }
      const data = await res.json();
      // API returns { success: true, data: ConnectionStatus[] }
      const statuses = data.data || data.connections || [];
      if (Array.isArray(statuses)) {
        const map: Record<string, PlatformConnection> = {};
        for (const conn of statuses) {
          map[conn.platform] = conn;
        }
        setConnections(map);
      }
    } catch (err) {
      console.error('[IntegrationsPanel] Failed to fetch status:', err);
      setError('Could not load integration status. Please try again.');
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // -------------------------------------------------------------------------
  // OAuth popup message listener
  // -------------------------------------------------------------------------

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Only accept messages from our own origin
      if (event.origin !== window.location.origin) return;

      const { type, platform, success, error: errMsg } = event.data || {};
      if (type !== 'composio-oauth-callback') return;

      // Close the popup
      if (oauthPopupRef.current && !oauthPopupRef.current.closed) {
        oauthPopupRef.current.close();
      }
      oauthPopupRef.current = null;

      // Clear loading state for this platform
      setLoadingPlatforms((prev) => ({ ...prev, [platform]: false }));

      if (success) {
        // Refresh connection status
        fetchStatus();
      } else {
        setError(errMsg || `Failed to connect to ${platform}. Please try again.`);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchStatus]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const openOAuthPopup = useCallback(async (platformId: string) => {
    setError(null);
    setLoadingPlatforms((prev) => ({ ...prev, [platformId]: true }));

    try {
      const res = await fetch(`/api/composio/connect/${platformId}`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to get OAuth URL (${res.status})`);
      }

      // Handle already connected case (detected via Composio global check)
      if (data.alreadyConnected) {
        // Refresh status with deep check to show connected state
        await fetchStatus(true);
        setLoadingPlatforms((prev) => ({ ...prev, [platformId]: false }));
        return;
      }

      const oauthUrl = data.data?.url || data.url;
      if (!oauthUrl) {
        throw new Error('No OAuth URL returned from server');
      }

      // Center the popup
      const left = window.screenX + (window.outerWidth - OAUTH_POPUP_WIDTH) / 2;
      const top = window.screenY + (window.outerHeight - OAUTH_POPUP_HEIGHT) / 2;

      const popup = window.open(
        oauthUrl,
        `composio-oauth-${platformId}`,
        `width=${OAUTH_POPUP_WIDTH},height=${OAUTH_POPUP_HEIGHT},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        throw new Error(
          'Popup was blocked. Please allow popups for this site and try again.'
        );
      }

      oauthPopupRef.current = popup;

      // Poll for popup close (in case user closes it manually)
      const pollId = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollId);
          setLoadingPlatforms((prev) => ({ ...prev, [platformId]: false }));
          oauthPopupRef.current = null;
        }
      }, 1000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start OAuth flow';
      console.error('[IntegrationsPanel] OAuth error:', err);
      setError(message);
      setLoadingPlatforms((prev) => ({ ...prev, [platformId]: false }));
    }
  }, []);

  const handleConnect = useCallback(
    (platformId: string) => {
      openOAuthPopup(platformId);
    },
    [openOAuthPopup]
  );

  const handleReconnect = useCallback(
    (platformId: string) => {
      openOAuthPopup(platformId);
    },
    [openOAuthPopup]
  );

  const handleDisconnect = useCallback(
    async (platformId: string) => {
      setError(null);
      setLoadingPlatforms((prev) => ({ ...prev, [platformId]: true }));

      try {
        const res = await fetch(`/api/composio/connect/${platformId}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          throw new Error(`Failed to disconnect (${res.status})`);
        }
        // Update local state
        setConnections((prev) => {
          const updated = { ...prev };
          delete updated[platformId];
          return updated;
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to disconnect';
        console.error('[IntegrationsPanel] Disconnect error:', err);
        setError(message);
      } finally {
        setLoadingPlatforms((prev) => ({ ...prev, [platformId]: false }));
      }
    },
    []
  );

  const handleSelectDefaultService = useCallback(
    async (platformId: string, serviceId: string) => {
      try {
        const res = await fetch(`/api/composio/connect/${platformId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ defaultServiceId: serviceId }),
        });
        if (!res.ok) {
          throw new Error(`Failed to update default service (${res.status})`);
        }
        setConnections((prev) => ({
          ...prev,
          [platformId]: {
            ...prev[platformId],
            defaultServiceId: serviceId,
          },
        }));
      } catch (err) {
        console.error('[IntegrationsPanel] Default service error:', err);
        setError('Failed to update default service.');
      }
    },
    []
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Deployment Integrations</h3>
        <p className="text-sm text-gray-400">
          Connect your deployment platforms to manage environment variables and deployments via API.{' '}
          <span className="text-green-400">No SSH required.</span>
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
          role="alert"
        >
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-400 hover:text-red-300 mt-1 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isFetching ? (
        <div className="space-y-3">
          {PLATFORMS.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-lg border border-gray-700 bg-gray-800 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-700 rounded" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded w-24 mb-2" />
                  <div className="h-3 bg-gray-700 rounded w-48" />
                </div>
                <div className="h-7 bg-gray-700 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Platform cards */
        <div className="space-y-3">
          {PLATFORMS.map((platform) => (
            <PlatformCard
              key={platform.id}
              config={platform}
              connection={connections[platform.id]}
              isLoading={loadingPlatforms[platform.id] || false}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onReconnect={handleReconnect}
              onSelectDefaultService={handleSelectDefaultService}
            />
          ))}
        </div>
      )}

      {/* Footer info */}
      <div className="flex items-start gap-2 pt-2">
        <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-500">
          Connections use OAuth for secure access. Tokens are encrypted and
          stored server-side. You can disconnect at any time.
        </p>
      </div>
    </div>
  );
}
