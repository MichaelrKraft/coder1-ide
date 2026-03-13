'use client';

import React, { useEffect, useState } from 'react';

interface ScreenpipeFrame {
  frame_id: number;
  timestamp: string;
  app_name: string;
  window_title: string;
  file_path: string;
  text: string;
}

interface ModalState {
  frame: ScreenpipeFrame;
}

function Skeleton() {
  return (
    <div className="flex gap-3 mt-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-40 h-[90px] rounded bg-gray-800 animate-pulse flex-shrink-0"
        />
      ))}
    </div>
  );
}

function ThumbnailModal({ frame, onClose }: { frame: ScreenpipeFrame; onClose: () => void }) {
  const src = `/api/flowtrace/screenshot?path=${encodeURIComponent(frame.file_path)}`;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-2xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-white text-sm font-medium">{frame.app_name}</span>
            <span className="text-gray-500 text-xs ml-2">
              {new Date(frame.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <img
          src={src}
          alt={`${frame.app_name} — ${frame.window_title}`}
          className="w-full rounded border border-gray-700"
          style={{ maxHeight: '60vh', objectFit: 'contain' }}
        />
        {frame.text && (
          <p className="mt-3 text-gray-400 text-xs font-mono leading-relaxed line-clamp-4">
            {frame.text}
          </p>
        )}
      </div>
    </div>
  );
}

export function ScreenshotStrip({ sessionId }: { sessionId: string }) {
  const [frames, setFrames] = useState<ScreenpipeFrame[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/flowtrace/frames-for-session?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setFrames(data.frames ?? []);
      })
      .catch(() => {
        if (!cancelled) setFrames([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [sessionId]);

  if (loading) return <Skeleton />;
  if (!frames || frames.length === 0) return null;

  return (
    <>
      <div className="mt-4">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Screen Captures
        </h4>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {frames.map((frame) => {
            const src = `/api/flowtrace/screenshot?path=${encodeURIComponent(frame.file_path)}`;
            return (
              <button
                key={frame.frame_id}
                onClick={() => setModal({ frame })}
                className="flex-shrink-0 group focus:outline-none"
                aria-label={`${frame.app_name} screenshot`}
              >
                <img
                  src={src}
                  alt={`${frame.app_name} — ${frame.window_title}`}
                  width={160}
                  height={90}
                  className="rounded border border-gray-700 group-hover:border-[#00D9FF]/60 transition-colors"
                  style={{ width: 160, height: 90, objectFit: 'cover' }}
                />
                <div className="mt-1 text-left">
                  <p className="text-gray-400 text-[10px] truncate w-40">{frame.app_name}</p>
                  <p className="text-gray-600 text-[10px]">
                    {new Date(frame.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {modal && (
        <ThumbnailModal frame={modal.frame} onClose={() => setModal(null)} />
      )}
    </>
  );
}
