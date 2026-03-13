'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Clock, Monitor, AlertCircle, Zap } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface FrameMetadata {
  session_id: string;
  timestamp: number;
  timestamp_iso: string;
  app_name: string;
  window_title: string;
  url: string;
  screenshot_path: string;
  content_type: string;
  ocr_text_preview: string;
}

interface QueryMatch {
  id: string;
  score: number;
  metadata: FrameMetadata;
}

interface QueryResult {
  answer: string;
  matches: QueryMatch[];
  queryTimeMs: number;
}

interface StatusResult {
  running: boolean;
  enabled: boolean;
  configured: boolean;
  cloudStorage: boolean;
  screenpipeRunning: boolean;
  sessionId?: string;
  framesCaptured?: number;
}

// ============================================================================
// Sub-components
// ============================================================================

function SetupCard() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-[#00D9FF]/10 border border-[#00D9FF]/30 flex items-center justify-center mb-4">
        <Zap className="w-6 h-6 text-[#00D9FF]" />
      </div>
      <h2 className="text-white font-semibold text-lg mb-2">FlowTrace</h2>
      <p className="text-gray-400 text-sm max-w-sm mb-4">
        Your developer session memory. Ask anything about your past work &mdash;
        &ldquo;How did I fix that CORS error?&rdquo; or &ldquo;What was I building last Tuesday?&rdquo;
      </p>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-left w-full max-w-sm">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          To enable FlowTrace:
        </p>
        <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside">
          <li>Install Screenpipe from <span className="text-[#00D9FF]">screenpipe.com</span></li>
          <li>Add <code className="text-[#00D9FF]">GEMINI_API_KEY</code> to <code>.env.local</code></li>
          <li>Set <code className="text-[#00D9FF]">FLOWTRACE_ENABLED=true</code></li>
          <li>Restart the IDE and start a capture session</li>
        </ol>
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: QueryMatch }) {
  const { metadata } = match;
  const date = new Date(metadata.timestamp * 1000);
  const hasThumbnail = !!metadata.screenshot_path;
  const thumbnailSrc = hasThumbnail
    ? `/api/flowtrace/screenshot?path=${encodeURIComponent(metadata.screenshot_path)}`
    : null;

  return (
    <div className="flex gap-3 bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
      {thumbnailSrc ? (
        <img
          src={thumbnailSrc}
          alt={`${metadata.app_name} capture`}
          width={80}
          height={45}
          className="rounded flex-shrink-0 border border-gray-700 object-cover"
          style={{ width: 80, height: 45 }}
        />
      ) : (
        <div className="w-20 h-[45px] rounded flex-shrink-0 border border-gray-700 bg-gray-800 flex items-center justify-center">
          <Monitor className="w-4 h-4 text-gray-600" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[11px] font-medium text-white truncate">{metadata.app_name}</span>
          <span className="text-[10px] text-[#00D9FF] ml-auto flex-shrink-0">
            {Math.round(match.score * 100)}% match
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
          <Clock className="w-3 h-3" />
          <span>{date.toLocaleString()}</span>
        </div>
        {metadata.ocr_text_preview && (
          <p className="text-[11px] text-gray-400 font-mono leading-relaxed line-clamp-2">
            {metadata.ocr_text_preview}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Panel
// ============================================================================

export function FlowTracePanel() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load FlowTrace status on mount
  useEffect(() => {
    fetch('/api/flowtrace/status')
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => setStatus(null));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/flowtrace/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Query failed. Check your GEMINI_API_KEY.');
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch {
      setError('Network error — make sure the IDE server is running.');
    } finally {
      setLoading(false);
    }
  };

  const isSetupNeeded = !status || !status.enabled || !status.configured;

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
        <Zap className="w-4 h-4 text-[#00D9FF]" />
        <h1 className="text-sm font-semibold">FlowTrace</h1>
        {status && (
          <div className="ml-auto flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                status.running ? 'bg-green-400' : 'bg-gray-600'
              }`}
            />
            <span className="text-[10px] text-gray-500">
              {status.running
                ? `Capturing · ${status.framesCaptured ?? 0} frames`
                : status.enabled
                ? 'Idle'
                : 'Disabled'}
            </span>
          </div>
        )}
      </div>

      {isSetupNeeded ? (
        <SetupCard />
      ) : (
        <>
          {/* Query input */}
          <form onSubmit={handleSubmit} className="px-4 py-3 border-b border-gray-800">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='How did I fix that CORS error?'
                  className="w-full bg-gray-800 border border-gray-700 rounded-md pl-8 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00D9FF]/50 focus:ring-1 focus:ring-[#00D9FF]/30"
                />
              </div>
              <button
                type="submit"
                disabled={!query.trim() || loading}
                className="px-4 py-2 bg-[#00D9FF]/10 border border-[#00D9FF]/40 rounded-md text-[#00D9FF] text-sm font-medium hover:bg-[#00D9FF]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask'}
              </button>
            </div>
          </form>

          {/* Results area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="flex items-center gap-3 text-gray-400 py-8 justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-[#00D9FF]" />
                <span className="text-sm">Searching your session history...</span>
              </div>
            )}

            {/* Answer */}
            {result && !loading && (
              <>
                <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Answer
                  </p>
                  <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {result.answer}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-3">
                    {result.queryTimeMs}ms · {result.matches.length} source{result.matches.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Source frames */}
                {result.matches.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Source Captures
                    </p>
                    <div className="space-y-2">
                      {result.matches.map((m) => (
                        <MatchCard key={m.id} match={m} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Empty prompt state */}
            {!result && !loading && !error && (
              <div className="py-12 text-center text-gray-600 text-sm">
                Ask anything about your past work sessions.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
