'use client';

import React, { useState } from 'react';
import {
  Github,
  Mail,
  MessageSquare,
  HardDrive,
  FileText,
  LayoutGrid,
  Check,
  X,
  AlertTriangle,
  Settings,
  ExternalLink,
  Trash2,
  RefreshCw,
  Clock,
} from 'lucide-react';

// Integration interface
interface Integration {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  connectedAt?: Date;
  lastUsedAt?: Date;
  permissions: string[];
}

interface IntegrationCardProps {
  integration: Integration;
  onConnect?: (id: string) => void;
  onDisconnect?: (id: string) => void;
  onConfigure?: (id: string) => void;
  onRefresh?: (id: string) => void;
  onHide?: (id: string) => void;
  className?: string;
}

/**
 * IntegrationCard Component
 *
 * Displays a connected service card with status indicator,
 * configure/remove buttons, and usage information.
 */
export default function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  onConfigure,
  onRefresh,
  onHide,
  className,
}: IntegrationCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);

  // Get icon component based on integration type
  const getIcon = () => {
    const iconClass = 'w-6 h-6';
    switch (integration.icon) {
      case 'github':
        return <Github className={iconClass} />;
      case 'gmail':
      case 'mail':
        return <Mail className={iconClass} />;
      case 'slack':
        return <MessageSquare className={iconClass} />;
      case 'drive':
        return <HardDrive className={iconClass} />;
      case 'notion':
        return <FileText className={iconClass} />;
      case 'linear':
        return <LayoutGrid className={iconClass} />;
      default:
        return <ExternalLink className={iconClass} />;
    }
  };

  // Get status styling
  const getStatusStyles = () => {
    switch (integration.status) {
      case 'connected':
        return {
          dot: 'bg-green-400',
          text: 'text-green-400',
          label: 'Connected',
          bg: 'bg-green-500/10',
          border: 'border-green-500/30',
        };
      case 'error':
        return {
          dot: 'bg-red-400',
          text: 'text-red-400',
          label: 'Error',
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
        };
      case 'disconnected':
      default:
        return {
          dot: 'bg-gray-400',
          text: 'text-gray-400',
          label: 'Not Connected',
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/30',
        };
    }
  };

  // Format relative time
  const formatRelativeTime = (date?: Date): string => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString();
  };

  const status = getStatusStyles();

  const handleDisconnect = () => {
    if (showConfirmDisconnect) {
      onDisconnect?.(integration.id);
      setShowConfirmDisconnect(false);
    } else {
      setShowConfirmDisconnect(true);
    }
  };

  return (
    <div
      className={`
        relative p-4 rounded-xl border transition-all duration-200
        ${integration.status === 'connected'
          ? 'bg-bg-tertiary border-border-default hover:border-coder1-cyan/40'
          : 'bg-bg-secondary/50 border-border-default hover:border-border-default'
        }
        ${className || ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowConfirmDisconnect(false);
      }}
    >
      {/* Main Content */}
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`
            flex items-center justify-center w-12 h-12 rounded-lg
            ${integration.status === 'connected'
              ? 'bg-coder1-cyan/10 text-coder1-cyan'
              : 'bg-bg-tertiary text-text-muted'
            }
          `}
        >
          {getIcon()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-text-primary">
              {integration.name}
            </h4>
            {/* Status Indicator */}
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${status.bg} ${status.border} border`}>
              <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              <span className={`text-[10px] font-medium ${status.text}`}>
                {status.label}
              </span>
            </div>
          </div>

          <p className="text-xs text-text-muted mt-1 line-clamp-2">
            {integration.description}
          </p>

          {/* Timestamps for connected integrations */}
          {integration.status === 'connected' && (
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1 text-[10px] text-text-muted">
                <Clock className="w-3 h-3" />
                <span>Last used: {formatRelativeTime(integration.lastUsedAt)}</span>
              </div>
            </div>
          )}

          {/* Permissions */}
          {integration.status === 'connected' && integration.permissions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {integration.permissions.slice(0, 3).map((perm) => (
                <span
                  key={perm}
                  className="px-1.5 py-0.5 text-[10px] font-medium bg-bg-secondary text-text-muted rounded"
                >
                  {perm}
                </span>
              ))}
              {integration.permissions.length > 3 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-bg-secondary text-text-muted rounded">
                  +{integration.permissions.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {integration.status === 'connected' ? (
            <>
              {/* Refresh Button */}
              {onRefresh && (
                <button
                  onClick={() => onRefresh(integration.id)}
                  className="p-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-all"
                  title="Refresh connection"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}

              {/* Configure Button */}
              {onConfigure && (
                <button
                  onClick={() => onConfigure(integration.id)}
                  className="p-2 rounded-lg bg-bg-secondary hover:bg-coder1-cyan/20 text-text-muted hover:text-coder1-cyan transition-all"
                  title="Configure integration"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}

              {/* Disconnect Button */}
              {onDisconnect && (
                <button
                  onClick={handleDisconnect}
                  className={`
                    p-2 rounded-lg transition-all
                    ${showConfirmDisconnect
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-bg-secondary hover:bg-red-500/20 text-text-muted hover:text-red-400'
                    }
                  `}
                  title={showConfirmDisconnect ? 'Click again to confirm' : 'Disconnect'}
                >
                  {showConfirmDisconnect ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </>
          ) : integration.status === 'error' ? (
            <>
              {/* Reconnect Button */}
              {onConnect && (
                <button
                  onClick={() => onConnect(integration.id)}
                  className="px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs font-medium transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reconnect
                </button>
              )}
            </>
          ) : (
            <>
              {/* Hide Button - for services user doesn't want */}
              {onHide && (
                <button
                  onClick={() => onHide(integration.id)}
                  className="p-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary text-text-muted hover:text-text-secondary transition-all"
                  title="Hide this service"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {/* Connect Button */}
              {onConnect && (
                <button
                  onClick={() => onConnect(integration.id)}
                  className="px-3 py-1.5 rounded-lg bg-coder1-cyan/20 hover:bg-coder1-cyan/30 text-coder1-cyan text-xs font-medium transition-all flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Connect
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Error State Banner */}
      {integration.status === 'error' && (
        <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-400">
            Connection error. Please reconnect to restore functionality.
          </span>
        </div>
      )}

      {/* Confirm Disconnect Overlay */}
      {showConfirmDisconnect && (
        <div className="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
          <div className="text-center">
            <p className="text-sm text-text-primary mb-3">
              Disconnect {integration.name}?
            </p>
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={() => setShowConfirmDisconnect(false)}
                className="px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-secondary text-text-muted text-xs font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDisconnect?.(integration.id);
                  setShowConfirmDisconnect(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export mock data for integrations
export const MOCK_INTEGRATIONS: Integration[] = [
  {
    id: 'github',
    name: 'GitHub',
    icon: 'github',
    description: 'Access repositories, create PRs, and manage issues automatically.',
    status: 'connected',
    connectedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    permissions: ['repo:read', 'repo:write', 'issues', 'pull_requests'],
  },
  {
    id: 'gmail',
    name: 'Gmail',
    icon: 'gmail',
    description: 'Read and send emails, manage drafts, and organize inbox.',
    status: 'disconnected',
    permissions: [],
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: 'slack',
    description: 'Send messages, create channels, and manage notifications.',
    status: 'disconnected',
    permissions: [],
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    icon: 'drive',
    description: 'Read, write, and organize files in your Google Drive.',
    status: 'connected',
    connectedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    lastUsedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    permissions: ['files:read', 'files:write'],
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: 'notion',
    description: 'Access workspaces, create pages, and manage databases.',
    status: 'error',
    connectedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastUsedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    permissions: ['pages:read', 'pages:write'],
  },
  {
    id: 'linear',
    name: 'Linear',
    icon: 'linear',
    description: 'Create issues, manage projects, and track progress.',
    status: 'disconnected',
    permissions: [],
  },
];

export type { Integration };
