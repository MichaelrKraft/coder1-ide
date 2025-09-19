'use client';

import React from 'react';
import { Zap, Wifi, WifiOff, Download, Settings, AlertTriangle, CheckCircle } from 'lucide-react';
import { getCompanionClient, CompanionStatus } from '@/lib/companion-client';

interface CompanionStatusBarProps {
  className?: string;
}

const CompanionStatusBar: React.FC<CompanionStatusBarProps> = ({ className }) => {
  const [status, setStatus] = React.useState<CompanionStatus>({
    connected: false,
    installed: false,
    lastCheck: 0
  });
  const [showModal, setShowModal] = React.useState(false);
  const [installing, setInstalling] = React.useState(false);

  const companionClient = React.useMemo(() => getCompanionClient(), []);

  React.useEffect(() => {
    // Listen for status changes
    const handleStatusChange = (newStatus: CompanionStatus) => {
      setStatus(newStatus);
    };

    companionClient.on('status-changed', handleStatusChange);

    // Initial status check
    companionClient.checkInstallation();

    // Periodic status checks
    const interval = setInterval(() => {
      companionClient.checkInstallation();
    }, 30000); // Check every 30 seconds

    return () => {
      companionClient.off('status-changed', handleStatusChange);
      clearInterval(interval);
    };
  }, [companionClient]);

  const getStatusColor = () => {
    if (status.connected) return 'text-green-400';
    if (status.installed) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusIcon = () => {
    if (status.connected) return <Wifi className="w-4 h-4" />;
    if (status.installed) return <WifiOff className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (status.connected) return 'Claude Code Ready';
    if (status.installed) return 'Companion Disconnected';
    return 'Companion Not Installed';
  };

  const getStatusDescription = () => {
    if (status.connected) {
      return `Connected via port ${status.port} • Version ${status.version}`;
    }
    if (status.installed) {
      return 'Companion service installed but not running';
    }
    return 'Install companion service to enable Claude Code integration';
  };

  const handleInstall = async () => {
    setInstalling(true);
    
    try {
      const response = await fetch('/api/companion/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install' })
      });

      if (response.ok) {
        // Refresh status after installation
        await companionClient.checkInstallation();
      } else {
        console.error('Installation failed:', await response.text());
      }
    } catch (error) {
      console.error('Installation error:', error);
    } finally {
      setInstalling(false);
    }
  };

  const handleStart = async () => {
    try {
      const response = await fetch('/api/companion/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });

      if (response.ok) {
        // Wait a moment then check status
        setTimeout(() => {
          companionClient.checkInstallation();
        }, 2000);
      }
    } catch (error) {
      console.error('Start error:', error);
    }
  };

  return (
    <>
      {/* Status Indicator */}
      <div className={`flex items-center gap-2 ${className || ''}`}>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1 rounded-md bg-bg-tertiary hover:bg-bg-secondary transition-colors"
          title={getStatusDescription()}
        >
          <div className={`${getStatusColor()} transition-colors`}>
            {getStatusIcon()}
          </div>
          <span className="text-sm font-medium text-text-primary">
            {getStatusText()}
          </span>
          {status.connected && (
            <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* Status Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-border-default rounded-lg w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-default">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Claude Code Companion
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-bg-primary rounded transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={getStatusColor()}>
                    {getStatusIcon()}
                  </div>
                  <div>
                    <div className="font-medium text-text-primary">{getStatusText()}</div>
                    <div className="text-sm text-text-muted">{getStatusDescription()}</div>
                  </div>
                </div>
                {status.connected && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
              </div>

              {/* Connection Details */}
              {status.connected && (
                <div className="space-y-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="text-sm text-green-400 font-medium">✅ Claude Code Integration Active</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
                    <div>Port: {status.port}</div>
                    <div>Version: {status.version}</div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {status.error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="text-sm text-red-400">{status.error}</div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                {!status.installed && (
                  <button
                    onClick={handleInstall}
                    disabled={installing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
                  >
                    {installing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Installing...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Install Companion Service
                      </>
                    )}
                  </button>
                )}

                {status.installed && !status.connected && (
                  <button
                    onClick={handleStart}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                    Start Companion Service
                  </button>
                )}

                <button
                  onClick={() => companionClient.checkInstallation()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-bg-primary hover:bg-bg-tertiary text-text-primary border border-border-default rounded-lg transition-colors"
                >
                  Refresh Status
                </button>
              </div>

              {/* Help */}
              <div className="text-xs text-text-muted space-y-1">
                <div>The companion service bridges your web IDE with local Claude Code installation.</div>
                <div>This enables cost-free Claude Code features using your existing subscription.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CompanionStatusBar;