'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { formatDistanceToNow } from 'date-fns';
import { Plus, GripVertical } from 'lucide-react';

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

export type SessionPhase = 'backlog' | 'planning' | 'implementing' | 'complete';

interface Session {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

interface SessionKanbanProps {
  sessions: Session[];
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession?: () => void;
}

// ─────────────────────────────────────────────────────
// Column config
// ─────────────────────────────────────────────────────

const COLUMNS: { id: SessionPhase; label: string; color: string; emptyText: string }[] = [
  { id: 'backlog',       label: 'Backlog',      color: 'text-text-muted',   emptyText: 'New sessions land here' },
  { id: 'planning',      label: 'Planning',     color: 'text-blue-400',     emptyText: 'Sessions being scoped' },
  { id: 'implementing',  label: 'Implementing', color: 'text-yellow-400',   emptyText: 'Active development' },
  { id: 'complete',      label: 'Complete',     color: 'text-green-400',    emptyText: 'Finished sessions' },
];

// ─────────────────────────────────────────────────────
// Phase persistence (localStorage)
// ─────────────────────────────────────────────────────

const STORAGE_KEY = 'coder1:session-phases';

function loadPhases(): Record<string, SessionPhase> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePhases(phases: Record<string, SessionPhase>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(phases));
  } catch {}
}

// ─────────────────────────────────────────────────────
// Session Card
// ─────────────────────────────────────────────────────

function SessionCard({
  session,
  isActive,
  isDragging,
  onDoubleClick,
}: {
  session: Session;
  isActive: boolean;
  isDragging?: boolean;
  onDoubleClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: session.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border border-border-default bg-bg-secondary p-3 cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-30' : 'hover:border-border-primary hover:bg-bg-tertiary'
      }`}
      onDoubleClick={onDoubleClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {isActive && (
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" title="Active session" />
            )}
            <span className="text-xs font-medium text-text-primary truncate" title={session.name}>
              {session.name}
            </span>
          </div>
          {session.description && (
            <p className="text-[10px] text-text-muted truncate">{session.description}</p>
          )}
          <p className="text-[10px] text-text-muted mt-1">
            {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
          </p>
        </div>

        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-secondary transition-opacity cursor-grab active:cursor-grabbing shrink-0"
          tabIndex={-1}
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Column
// ─────────────────────────────────────────────────────

function KanbanColumn({
  column,
  sessions,
  currentSessionId,
  activeSessionId,
  onSessionSelect,
  onNewSession,
}: {
  column: (typeof COLUMNS)[number];
  sessions: Session[];
  currentSessionId?: string;
  activeSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onNewSession?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col min-w-0 flex-1">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-2 shrink-0">
        <span className={`text-xs font-semibold uppercase tracking-wider ${column.color}`}>
          {column.label}
        </span>
        {sessions.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted">
            {sessions.length}
          </span>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 rounded-lg p-2 min-h-[80px] transition-colors ${
          isOver ? 'bg-coder1-cyan/5 border border-dashed border-coder1-cyan/30' : 'bg-bg-primary/30'
        }`}
        style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}
      >
        {sessions.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-[10px] text-text-muted italic">
            {column.emptyText}
          </div>
        ) : (
          sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isActive={session.id === currentSessionId}
              isDragging={session.id === activeSessionId}
              onDoubleClick={() => onSessionSelect(session.id)}
            />
          ))
        )}
      </div>

      {/* New session button (Backlog only) */}
      {column.id === 'backlog' && onNewSession && (
        <button
          onClick={onNewSession}
          className="mt-2 flex items-center gap-1 px-2 py-1 text-[10px] text-text-muted hover:text-text-secondary hover:bg-bg-tertiary rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          New Session
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Main Kanban
// ─────────────────────────────────────────────────────

export default function SessionKanban({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewSession,
}: SessionKanbanProps) {
  const [phaseMap, setPhaseMap] = useState<Record<string, SessionPhase>>(loadPhases);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const getPhase = useCallback(
    (sessionId: string): SessionPhase => phaseMap[sessionId] ?? 'backlog',
    [phaseMap]
  );

  // Filter + group sessions by phase
  const filteredSessions = useMemo(() => {
    const q = filterQuery.toLowerCase();
    return q
      ? sessions.filter((s) => s.name.toLowerCase().includes(q))
      : sessions;
  }, [sessions, filterQuery]);

  const sessionsByPhase = useMemo(() => {
    const map: Record<SessionPhase, Session[]> = {
      backlog: [], planning: [], implementing: [], complete: [],
    };
    for (const s of filteredSessions) {
      map[getPhase(s.id)].push(s);
    }
    return map;
  }, [filteredSessions, getPhase]);

  const activeSession = useMemo(
    () => (activeId ? sessions.find((s) => s.id === activeId) ?? null : null),
    [activeId, sessions]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const newPhase = over.id as SessionPhase;
    if (!COLUMNS.find((c) => c.id === newPhase)) return;

    const sessionId = active.id as string;
    if (getPhase(sessionId) === newPhase) return;

    // Optimistic update
    setPhaseMap((prev) => {
      const next = { ...prev, [sessionId]: newPhase };
      savePhases(next);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full gap-3 p-3">
      {/* Search filter */}
      <input
        type="text"
        placeholder="Filter sessions..."
        value={filterQuery}
        onChange={(e) => setFilterQuery(e.target.value)}
        className="w-full px-3 py-1.5 text-xs bg-bg-secondary border border-border-default rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
      />

      {/* Kanban columns */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 flex-1 overflow-x-auto">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              sessions={sessionsByPhase[col.id]}
              currentSessionId={currentSessionId}
              activeSessionId={activeId}
              onSessionSelect={onSessionSelect}
              onNewSession={col.id === 'backlog' ? onNewSession : undefined}
            />
          ))}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeSession && (
            <div className="rounded-lg border border-coder1-cyan/40 bg-bg-secondary/90 p-3 shadow-xl backdrop-blur-sm opacity-90 w-48">
              <span className="text-xs font-medium text-text-primary truncate block">
                {activeSession.name}
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
