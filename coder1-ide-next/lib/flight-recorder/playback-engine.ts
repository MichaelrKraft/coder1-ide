/**
 * PlaybackEngine — Manages replay state for recorded sessions.
 * Pure logic, no UI. Components consume via callbacks.
 */

import type { FlightEvent } from './types';

export type PlaybackSpeed = 1 | 2 | 5 | 10 | 50;
export type PlaybackState = 'playing' | 'paused' | 'stopped';

interface PlaybackCallbacks {
  onEvent: (event: FlightEvent) => void;
  onTimeUpdate: (currentTime: number) => void;
  onStateChange: (state: PlaybackState) => void;
  onComplete: () => void;
}

const IDLE_THRESHOLD_MS = 120_000; // 2 minutes — skip idle gaps

export class PlaybackEngine {
  private events: FlightEvent[] = [];
  private currentIndex = 0;
  private currentTime = 0;
  private startTime = 0;
  private endTime = 0;
  private speed: PlaybackSpeed = 1;
  private state: PlaybackState = 'stopped';
  private timer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: PlaybackCallbacks;

  constructor(callbacks: PlaybackCallbacks) {
    this.callbacks = callbacks;
  }

  loadEvents(events: FlightEvent[]): void {
    this.events = events.sort((a, b) => a.clientTimestamp - b.clientTimestamp);
    this.currentIndex = 0;
    this.currentTime = events[0]?.clientTimestamp || 0;
    this.startTime = events[0]?.clientTimestamp || 0;
    this.endTime = events[events.length - 1]?.clientTimestamp || 0;
    this.state = 'stopped';
    this.callbacks.onStateChange('stopped');
    this.callbacks.onTimeUpdate(this.currentTime);
  }

  play(): void {
    if (this.events.length === 0) return;
    if (this.currentIndex >= this.events.length) {
      this.currentIndex = 0;
      this.currentTime = this.startTime;
    }
    this.state = 'playing';
    this.callbacks.onStateChange('playing');
    this.scheduleNext();
  }

  pause(): void {
    this.state = 'paused';
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.callbacks.onStateChange('paused');
  }

  stop(): void {
    this.state = 'stopped';
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.currentIndex = 0;
    this.currentTime = this.startTime;
    this.callbacks.onStateChange('stopped');
    this.callbacks.onTimeUpdate(this.currentTime);
  }

  setSpeed(speed: PlaybackSpeed): void {
    this.speed = speed;
    // Reschedule if playing
    if (this.state === 'playing') {
      if (this.timer) clearTimeout(this.timer);
      this.scheduleNext();
    }
  }

  seekTo(timestamp: number): void {
    const index = this.binarySearchIndex(timestamp);
    this.currentIndex = index;
    this.currentTime = timestamp;
    this.callbacks.onTimeUpdate(this.currentTime);

    // Emit the event at seek position
    if (this.events[index]) {
      this.callbacks.onEvent(this.events[index]);
    }

    // Reschedule if playing
    if (this.state === 'playing') {
      if (this.timer) clearTimeout(this.timer);
      this.scheduleNext();
    }
  }

  stepForward(): void {
    if (this.currentIndex < this.events.length - 1) {
      this.currentIndex++;
      const event = this.events[this.currentIndex];
      this.currentTime = event.clientTimestamp;
      this.callbacks.onEvent(event);
      this.callbacks.onTimeUpdate(this.currentTime);
    }
  }

  stepBackward(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const event = this.events[this.currentIndex];
      this.currentTime = event.clientTimestamp;
      this.callbacks.onEvent(event);
      this.callbacks.onTimeUpdate(this.currentTime);
    }
  }

  getProgress(): { current: number; total: number; percentage: number } {
    const total = this.endTime - this.startTime;
    const current = this.currentTime - this.startTime;
    return {
      current,
      total,
      percentage: total > 0 ? (current / total) * 100 : 0,
    };
  }

  getSpeed(): PlaybackSpeed {
    return this.speed;
  }

  getState(): PlaybackState {
    return this.state;
  }

  getEventCount(): number {
    return this.events.length;
  }

  getCurrentEvent(): FlightEvent | null {
    return this.events[this.currentIndex] || null;
  }

  destroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.events = [];
  }

  // --- Private ---

  private scheduleNext(): void {
    if (this.state !== 'playing' || this.currentIndex >= this.events.length) {
      if (this.currentIndex >= this.events.length) {
        this.state = 'stopped';
        this.callbacks.onStateChange('stopped');
        this.callbacks.onComplete();
      }
      return;
    }

    const event = this.events[this.currentIndex];
    this.callbacks.onEvent(event);
    this.currentTime = event.clientTimestamp;
    this.callbacks.onTimeUpdate(this.currentTime);
    this.currentIndex++;

    if (this.currentIndex >= this.events.length) {
      this.state = 'stopped';
      this.callbacks.onStateChange('stopped');
      this.callbacks.onComplete();
      return;
    }

    const nextEvent = this.events[this.currentIndex];
    let delay = (nextEvent.clientTimestamp - event.clientTimestamp) / this.speed;

    // Compress idle gaps > 2 minutes
    if (delay > IDLE_THRESHOLD_MS / this.speed) {
      delay = 200; // Brief pause to indicate time skip
    }

    // Cap minimum delay to prevent overwhelming the UI
    delay = Math.max(delay, 10);

    this.timer = setTimeout(() => this.scheduleNext(), delay);
  }

  private binarySearchIndex(timestamp: number): number {
    let low = 0;
    let high = this.events.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.events[mid].clientTimestamp <= timestamp) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return Math.max(0, Math.min(high, this.events.length - 1));
  }
}
