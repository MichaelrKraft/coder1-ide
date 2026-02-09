/**
 * YSocketIOProvider — Custom Yjs provider over Socket.IO
 *
 * Replaces y-websocket since Socket.IO is already deployed in Coder1 IDE.
 * Handles:
 *  - Yjs document sync via Socket.IO rooms
 *  - Awareness protocol for cursor/selection sharing
 *  - Update batching (50ms default) to reduce socket traffic
 *  - Reconnection queue (buffers updates during disconnect)
 *  - Large update protection (500KB default limit)
 */

import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { Observable } from 'lib0/observable';
import type { Socket } from 'socket.io-client';

export { Awareness };

export interface YSocketIOProviderOptions {
  /** Max update size in bytes (default: 512KB) */
  maxUpdateSize?: number;
  /** Debounce interval for batching updates (default: 50ms) */
  updateBatchMs?: number;
}

const DEFAULT_OPTIONS: Required<YSocketIOProviderOptions> = {
  maxUpdateSize: 512 * 1024,
  updateBatchMs: 50,
};

export class YSocketIOProvider extends Observable<string> {
  doc: Y.Doc;
  awareness: Awareness;
  synced: boolean;

  private socket: Socket;
  private roomName: string;
  private opts: Required<YSocketIOProviderOptions>;
  private connected: boolean;
  private destroyed: boolean;

  // Update batching
  private batchTimeout: ReturnType<typeof setTimeout> | null;
  private pendingUpdate: Uint8Array | null;

  // Reconnection queue
  private updateQueue: Uint8Array[];

  // Bound handlers (for cleanup)
  private _onDocUpdate: (update: Uint8Array, origin: unknown) => void;
  private _onAwarenessUpdate: (changes: { added: number[]; updated: number[]; removed: number[] }, origin: string | null) => void;
  private _onSocketUpdate: (data: { update: unknown; senderId: string }) => void;
  private _onSocketAwareness: (data: { clientId: string; userId: string; userName: string; state: Record<string, unknown> }) => void;
  private _onSyncResponse: (data: { fileId: string; updates: unknown[] }) => void;
  private _onUserLeft: (data: { userId: string }) => void;
  private _onSocketConnect: () => void;
  private _onSocketDisconnect: () => void;

  constructor(
    socket: Socket,
    roomName: string,
    doc: Y.Doc,
    opts?: YSocketIOProviderOptions
  ) {
    super();
    this.socket = socket;
    this.roomName = roomName;
    this.doc = doc;
    this.opts = { ...DEFAULT_OPTIONS, ...opts };
    this.awareness = new Awareness(doc);
    this.synced = false;
    this.connected = socket.connected;
    this.destroyed = false;
    this.batchTimeout = null;
    this.pendingUpdate = null;
    this.updateQueue = [];

    // Bind handlers
    this._onDocUpdate = this.handleDocUpdate.bind(this);
    this._onAwarenessUpdate = this.handleAwarenessUpdate.bind(this);
    this._onSocketUpdate = this.handleSocketUpdate.bind(this);
    this._onSocketAwareness = this.handleSocketAwareness.bind(this);
    this._onSyncResponse = this.handleSyncResponse.bind(this);
    this._onUserLeft = this.handleUserLeft.bind(this);
    this._onSocketConnect = this.handleSocketConnect.bind(this);
    this._onSocketDisconnect = this.handleSocketDisconnect.bind(this);

    this.setupListeners();
    this.connect();
  }

  private setupListeners() {
    // Listen for local doc changes
    this.doc.on('update', this._onDocUpdate);

    // Listen for local awareness changes (y-protocols awareness emits 'update')
    this.awareness.on('update', this._onAwarenessUpdate);

    // Listen for remote updates via socket
    this.socket.on('y:update', this._onSocketUpdate);
    this.socket.on('y:awareness', this._onSocketAwareness);
    this.socket.on('y:sync-response', this._onSyncResponse);
    this.socket.on('collab:user-left', this._onUserLeft);

    // Socket lifecycle
    this.socket.on('connect', this._onSocketConnect);
    this.socket.on('disconnect', this._onSocketDisconnect);
  }

  connect() {
    if (this.destroyed) return;
    this.socket.emit('collab:join', {
      fileId: this.roomName,
      teamId: (this.socket as any).io?.opts?.query?.teamId || null,
    });
    this.connected = true;
  }

  disconnect() {
    if (this.destroyed) return;
    this.socket.emit('collab:leave', { fileId: this.roomName });
    this.connected = false;
  }

  // ---- Local doc update → broadcast to room ----

  private handleDocUpdate(update: Uint8Array, origin: unknown) {
    // Skip updates that came from the provider itself (remote)
    if (origin === this) return;

    // Size guard
    if (update.byteLength > this.opts.maxUpdateSize) {
      console.warn('[YSocketIO] Update too large, skipping:', update.byteLength, 'bytes');
      return;
    }

    this.scheduleUpdate(update);
  }

  /**
   * Batch rapid updates into a single emission.
   * Merges pending updates using Y.mergeUpdates.
   */
  private scheduleUpdate(update: Uint8Array) {
    this.pendingUpdate = this.pendingUpdate
      ? Y.mergeUpdates([this.pendingUpdate, update])
      : update;

    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.flushUpdate();
      }, this.opts.updateBatchMs);
    }
  }

  private flushUpdate() {
    this.batchTimeout = null;
    if (!this.pendingUpdate) return;

    const update = this.pendingUpdate;
    this.pendingUpdate = null;

    if (this.connected && this.socket.connected) {
      this.socket.emit('y:update', {
        fileId: this.roomName,
        update: Array.from(update), // Serialize Uint8Array for Socket.IO
      });
    } else {
      // Queue for later
      this.updateQueue.push(update);
    }
  }

  // ---- Remote update from socket → apply to local doc ----

  private handleSocketUpdate(data: { update: unknown; senderId: string }) {
    if (this.destroyed) return;
    try {
      // Convert array back to Uint8Array if needed
      const update = data.update instanceof Uint8Array
        ? data.update
        : new Uint8Array(data.update as ArrayLike<number>);
      Y.applyUpdate(this.doc, update, this); // origin = this (prevents re-broadcast)
    } catch (e) {
      console.error('[YSocketIO] Failed to apply remote update:', e);
    }
  }

  // ---- Sync response (late joiner gets stored updates) ----

  private handleSyncResponse(data: { fileId: string; updates: unknown[] }) {
    if (this.destroyed || data.fileId !== this.roomName) return;

    // If no stored updates, mark as synced immediately
    if (!data.updates || data.updates.length === 0) {
      this.synced = true;
      this.emit('synced', []);
      return;
    }

    try {
      for (const rawUpdate of data.updates) {
        const update = rawUpdate instanceof Uint8Array
          ? rawUpdate
          : new Uint8Array(rawUpdate as ArrayLike<number>);
        Y.applyUpdate(this.doc, update, this);
      }
      this.synced = true;
      this.emit('synced', []);
    } catch (e) {
      console.error('[YSocketIO] Failed to apply sync response:', e);
      // Still mark as synced so we don't block forever
      this.synced = true;
      this.emit('synced', []);
    }
  }

  // ---- Awareness ----

  /**
   * Handle local awareness updates — broadcast to room.
   * y-protocols Awareness emits 'update' with { added, updated, removed }.
   */
  private handleAwarenessUpdate(
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: string | null
  ) {
    if (this.destroyed || !this.connected) return;
    // Only broadcast local changes (not remote ones we just applied)
    if (origin === 'remote') return;

    const localState = this.awareness.getLocalState();
    if (localState) {
      this.socket.emit('y:awareness', {
        fileId: this.roomName,
        state: localState,
      });
    }
  }

  /**
   * Handle remote awareness state from socket.
   * We set the remote user's state on our local awareness instance.
   */
  private handleSocketAwareness(data: {
    clientId: string;
    userId: string;
    userName: string;
    state: Record<string, unknown>;
  }) {
    if (this.destroyed) return;
    // Use a deterministic numeric clientId from userId hash
    const numericId = this.hashStringToNumber(data.userId || data.clientId);

    // Directly set the state on the awareness Map
    // This is a simplified approach — we manually update the internal states Map
    const states = this.awareness.getStates();
    const isNew = !states.has(numericId);
    states.set(numericId, {
      ...data.state,
      user: {
        id: data.userId,
        name: data.userName,
        ...(data.state?.user as Record<string, unknown> || {}),
      },
    });

    // Emit change event so MonacoBinding re-renders decorations
    this.awareness.emit('change', [{
      added: isNew ? [numericId] : [],
      updated: isNew ? [] : [numericId],
      removed: [],
    }, 'remote']);
  }

  /**
   * Handle user leaving — remove their awareness state.
   */
  private handleUserLeft(data: { userId: string }) {
    if (this.destroyed) return;
    const numericId = this.hashStringToNumber(data.userId);
    const states = this.awareness.getStates();
    if (states.has(numericId)) {
      states.delete(numericId);
      this.awareness.emit('change', [{
        added: [],
        updated: [],
        removed: [numericId],
      }, 'remote']);
    }
  }

  // ---- Socket lifecycle ----

  private handleSocketConnect() {
    this.connected = true;
    // Re-join room
    this.connect();
    // Request sync
    this.socket.emit('y:sync-request', {
      fileId: this.roomName,
      stateVector: Array.from(Y.encodeStateVector(this.doc)),
    });
    // Flush queued updates
    if (this.updateQueue.length > 0) {
      const merged = Y.mergeUpdates(this.updateQueue);
      this.updateQueue = [];
      this.socket.emit('y:update', {
        fileId: this.roomName,
        update: Array.from(merged),
      });
    }
  }

  private handleSocketDisconnect() {
    this.connected = false;
    this.synced = false;
  }

  // ---- Utility ----

  private hashStringToNumber(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    // Flush any pending update
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.pendingUpdate = null;
    this.updateQueue = [];

    // Leave room
    this.disconnect();

    // Remove listeners
    this.doc.off('update', this._onDocUpdate);
    this.awareness.off('update', this._onAwarenessUpdate);
    this.socket.off('y:update', this._onSocketUpdate);
    this.socket.off('y:awareness', this._onSocketAwareness);
    this.socket.off('y:sync-response', this._onSyncResponse);
    this.socket.off('collab:user-left', this._onUserLeft);
    this.socket.off('connect', this._onSocketConnect);
    this.socket.off('disconnect', this._onSocketDisconnect);

    // Destroy awareness
    this.awareness.destroy();

    super.destroy();
  }
}
