'use client';

import React, { useState } from 'react';
import { MessageSquare, Lightbulb, Bug, GitBranch, AlertTriangle, X, Check } from 'lucide-react';
import type { FlightAnnotation } from '@/lib/flight-recorder/types';

type AnnotationType = FlightAnnotation['annotationType'];

interface AnnotationEditorProps {
  /** Timestamp (ms) of the moment being annotated */
  timestamp: number;
  /** Session ID for the recording */
  sessionId: string;
  /** Called with annotation data on save */
  onSave: (annotation: { text: string; annotationType: AnnotationType; timestamp: number }) => void;
  /** Called when editor is dismissed */
  onCancel: () => void;
  /** Pre-fill text when editing an existing annotation */
  initialText?: string;
  /** Pre-fill type when editing an existing annotation */
  initialType?: AnnotationType;
}

const ANNOTATION_TYPES: { value: AnnotationType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'note', label: 'Note', icon: <MessageSquare size={14} />, color: 'text-blue-400' },
  { value: 'breakthrough', label: 'Breakthrough', icon: <Lightbulb size={14} />, color: 'text-green-400' },
  { value: 'bug', label: 'Bug Found', icon: <Bug size={14} />, color: 'text-red-400' },
  { value: 'decision', label: 'Key Decision', icon: <GitBranch size={14} />, color: 'text-purple-400' },
  { value: 'wtf', label: 'WTF Moment', icon: <AlertTriangle size={14} />, color: 'text-orange-400' },
];

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function AnnotationEditor({
  timestamp,
  sessionId,
  onSave,
  onCancel,
  initialText = '',
  initialType = 'note',
}: AnnotationEditorProps) {
  const [text, setText] = useState(initialText);
  const [annotationType, setAnnotationType] = useState<AnnotationType>(initialType);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave({ text: trimmed, annotationType, timestamp });
  };

  return (
    <div className="w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono">
          Annotate @ {formatTimestamp(timestamp)}
        </span>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Type selector */}
      <div className="flex gap-1 px-3 py-2 border-b border-gray-800">
        {ANNOTATION_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setAnnotationType(t.value)}
            title={t.label}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              annotationType === t.value
                ? `${t.color} bg-gray-800 ring-1 ring-gray-600`
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            {t.icon}
          </button>
        ))}
      </div>

      {/* Text input */}
      <div className="p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What happened here?"
          rows={3}
          autoFocus
          className="w-full bg-gray-800 text-gray-200 text-sm rounded px-2.5 py-2 border border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none resize-none placeholder:text-gray-600"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSave();
            }
            if (e.key === 'Escape') {
              onCancel();
            }
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-800">
        <span className="text-[10px] text-gray-600">Cmd+Enter to save</span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-2.5 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            <Check size={12} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
