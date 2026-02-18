'use client';

import React, { useState, useEffect } from 'react';

interface BridgeSetupContentProps {
  pairingCode: string | null;
  onRefreshCode: () => void;
  onClose: () => void;
  bridgeConnected: boolean;
  showDontShowAgain?: boolean;
  onDontShowAgainChange?: (checked: boolean) => void;
}

export function BridgeSetupContent({
  pairingCode,
  onRefreshCode,
  onClose,
  bridgeConnected,
  showDontShowAgain = false,
  onDontShowAgainChange
}: BridgeSetupContentProps) {
  const [copiedCommand, setCopiedCommand] = useState<string>('');
  const [userOS, setUserOS] = useState<'mac' | 'windows' | 'linux'>('mac');
  const [codeGeneratedAt, setCodeGeneratedAt] = useState<number>(Date.now());
  const [codeExpired, setCodeExpired] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Detect OS
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const platform = window.navigator.platform.toLowerCase();
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (platform.includes('win') || userAgent.includes('win')) {
        setUserOS('windows');
      } else if (platform.includes('linux') && !platform.includes('mac')) {
        setUserOS('linux');
      } else {
        setUserOS('mac');
      }
    }
  }, []);

  // Track code expiration
  useEffect(() => {
    if (pairingCode) {
      setCodeGeneratedAt(Date.now());
      setCodeExpired(false);
    }
  }, [pairingCode]);

  // Check for expiration every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (pairingCode && Date.now() - codeGeneratedAt > 300000) {
        setCodeExpired(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [pairingCode, codeGeneratedAt]);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommand(type);
      setTimeout(() => setCopiedCommand(''), 2000);
    } catch {
      // Fallback: select text
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedCommand(type);
      setTimeout(() => setCopiedCommand(''), 2000);
    }
  };

  const handleDontShowAgainChange = (checked: boolean) => {
    setDontShowAgain(checked);
    onDontShowAgainChange?.(checked);
  };

  const terminalLabel = userOS === 'windows' ? 'Open PowerShell and paste:' : 'In your terminal, paste:';
  const installCommand = 'curl -sL https://coder1.ai/install-bridge.sh | bash';

  if (bridgeConnected) {
    return (
      <div className="p-8 text-center">
        <div className="text-6xl mb-4">✓</div>
        <h3 className="text-2xl font-bold text-green-400 mb-2">Connected!</h3>
        <p className="text-gray-400 mb-6">You're ready to start coding.</p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Command */}
      <p className="text-gray-300 mb-3 text-center">{terminalLabel}</p>
      <div
        className="bg-black rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-gray-900 transition-colors mb-6"
        onClick={() => copyToClipboard(installCommand, 'install')}
      >
        <code className="text-cyan-300 text-sm">
          <span className="text-green-400">$</span> {installCommand}
        </code>
        <span className="text-xs text-gray-400 ml-2">
          {copiedCommand === 'install' ? '✓ Copied!' : 'Copy'}
        </span>
      </div>

      {/* Code */}
      <p className="text-gray-300 mb-3 text-center">Then enter this code:</p>
      <div className="text-center mb-4">
        <div
          className="inline-block px-6 py-3 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
          onClick={() => pairingCode && copyToClipboard(pairingCode, 'code')}
        >
          <span className="text-4xl font-mono font-bold text-cyan-400 tracking-wider">
            {pairingCode || '------'}
          </span>
        </div>
        {copiedCommand === 'code' && (
          <p className="text-green-400 text-xs mt-2">✓ Copied!</p>
        )}
      </div>

      {/* Status */}
      <div className="text-center text-sm text-gray-500 mb-6">
        {codeExpired ? (
          <button
            onClick={onRefreshCode}
            className="text-cyan-400 hover:text-cyan-300 underline"
          >
            Code expired. Get new code →
          </button>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-pulse">⏳</span>
            Waiting for connection...
          </span>
        )}
      </div>

      {/* Returning users */}
      <div className="pt-4 border-t border-gray-700 text-center text-xs text-gray-500">
        Already have bridge? Run:{' '}
        <code
          className="bg-gray-800 px-2 py-1 rounded cursor-pointer hover:bg-gray-700"
          onClick={() => copyToClipboard('coder1-bridge start', 'start')}
        >
          coder1-bridge start
        </code>
        {copiedCommand === 'start' && <span className="text-green-400 ml-2">✓</span>}
      </div>

      {/* Don't show again checkbox */}
      {showDontShowAgain && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <input
            type="checkbox"
            id="dont-show-setup"
            checked={dontShowAgain}
            onChange={(e) => handleDontShowAgainChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500"
          />
          <label htmlFor="dont-show-setup" className="text-sm text-gray-400 cursor-pointer">
            Don't show this again
          </label>
        </div>
      )}
    </div>
  );
}
