'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarEvent {
  date: string;
  type: string;
  title: string;
  status?: string;
  agent_name?: string;
}

function eventDotColor(type: string): string {
  switch (type) {
    case 'run_succeeded':
    case 'task_created':
      return 'bg-green-400';
    case 'run_failed':
      return 'bg-red-400';
    case 'scheduled':
      return 'bg-coder1-cyan';
    default:
      return 'bg-amber-400';
  }
}

function eventLabel(type: string): string {
  switch (type) {
    case 'run_succeeded':
      return 'Run succeeded';
    case 'run_failed':
      return 'Run failed';
    case 'task_created':
      return 'Task created';
    case 'scheduled':
      return 'Scheduled';
    default:
      return 'Run';
  }
}

export default function AgentHubCalendar() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [year, month] = currentMonth.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthLabel = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/agent-hub/calendar?month=${currentMonth}`)
      .then(r => r.json())
      .then(data => setEvents(data.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [currentMonth]);

  function changeMonth(delta: number) {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setSelectedDate(null);
  }

  const selectedEvents = selectedDate
    ? events.filter(e => e.date === selectedDate)
    : [];

  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('default', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => changeMonth(-1)}
          className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-secondary transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-semibold text-text-primary">{monthLabel}</h2>
        <button
          onClick={() => changeMonth(1)}
          className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-secondary transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-lg border border-border-default overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-bg-secondary">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="px-2 py-1.5 text-[10px] font-semibold text-text-muted text-center uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px bg-border-default">
          {/* Leading empty cells */}
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} className="bg-bg-primary min-h-[60px]" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={`p-1.5 min-h-[60px] text-left rounded-none transition-colors ${
                  isSelected
                    ? 'bg-coder1-cyan/10 border border-coder1-cyan/30'
                    : isToday
                      ? 'bg-bg-tertiary'
                      : 'bg-bg-primary hover:bg-bg-secondary'
                }`}
              >
                <span className={`text-xs ${isToday ? 'text-coder1-cyan font-bold' : 'text-text-muted'}`}>
                  {day}
                </span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-1 flex-wrap">
                    {dayEvents.slice(0, 4).map((e, j) => (
                      <span key={j} className={`w-1.5 h-1.5 rounded-full ${eventDotColor(e.type)}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}

          {/* Trailing empty cells to fill the last row */}
          {(() => {
            const totalCells = firstDay + daysInMonth;
            const remainder = totalCells % 7;
            if (remainder === 0) return null;
            return Array.from({ length: 7 - remainder }, (_, i) => (
              <div key={`trail-${i}`} className="bg-bg-primary min-h-[60px]" />
            ));
          })()}
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="text-center text-text-muted text-xs">Loading events...</div>
      )}

      {/* Selected date detail panel */}
      {selectedDate && (
        <div className="rounded-lg border border-border-default bg-bg-secondary p-3 space-y-2">
          <h3 className="text-xs font-semibold text-text-primary">{selectedDateLabel}</h3>
          {selectedEvents.length === 0 ? (
            <p className="text-xs text-text-muted">No events on this day.</p>
          ) : (
            <ul className="space-y-1.5">
              {selectedEvents.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full mt-0.5 shrink-0 ${eventDotColor(e.type)}`} />
                  <div>
                    <span className="text-text-muted">{eventLabel(e.type)}:</span>{' '}
                    <span className="text-text-primary">&ldquo;{e.title}&rdquo;</span>
                    {e.agent_name && (
                      <span className="text-text-muted"> &mdash; {e.agent_name}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
