'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Terminal } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const JOHNNY5_URL = 'http://localhost:3002';
const HEALTH_CHECK_URL = `${JOHNNY5_URL}/api/health`;

export default function Johnny5FullPage() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState<boolean | null>(null); // null = checking
  const [isRetrying, setIsRetrying] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(HEALTH_CHECK_URL, { signal: controller.signal });
      clearTimeout(timeout);
      setIsRunning(res.ok);
    } catch {
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setIsRunning(null);
    // Small delay to show loading state
    await new Promise((r) => setTimeout(r, 500));
    await checkHealth();
    setIsRetrying(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a]">
      {/* Navigation Header */}
      <header className="h-11 flex items-center px-4 border-b border-gray-800 bg-[#0a0a0a] shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to IDE
        </button>
        <div className="flex items-center gap-2 ml-4">
          <Image src="/johnny5-landing/johnny5-robot.png" alt="Johnny5" width={20} height={20} className="rounded-sm" />
          <span className="text-sm font-medium text-cyan-400">Johnny5 Platform</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isRunning === true && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Connected
            </span>
          )}
          {isRunning === false && (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              Not Running
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Loading State */}
        {isRunning === null && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Image src="/johnny5-landing/johnny5-robot.png" alt="Johnny5" width={80} height={80} className="mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-gray-400">Connecting to Johnny5...</p>
            </div>
          </div>
        )}

        {/* Running — show iframe */}
        {isRunning === true && (
          <iframe
            src={JOHNNY5_URL}
            className="w-full h-full border-none"
            title="Johnny5 Platform"
            allow="microphone; camera"
          />
        )}

        {/* Not Running — show setup instructions */}
        {isRunning === false && (
          <div className="flex items-center justify-center h-full px-6">
            <div className="max-w-md text-center">
              <Image src="/johnny5-landing/johnny5-robot.png" alt="Johnny5" width={80} height={80} className="mx-auto mb-6 opacity-50 grayscale" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Johnny5 isn&apos;t running yet
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                Start the Johnny5 standalone server to access the full platform experience.
              </p>

              <div className="bg-gray-900 rounded-lg p-4 mb-6 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500 font-medium">Terminal</span>
                </div>
                <code className="text-sm text-cyan-400 font-mono">
                  cd ~/johnny5 &amp;&amp; npm run dev
                </code>
              </div>

              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Checking...' : 'Retry Connection'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
