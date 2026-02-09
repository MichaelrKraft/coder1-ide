'use client';

/**
 * useCollaborativeEditor — React hook for Yjs collaborative editing in Monaco.
 *
 * Manages the lifecycle of:
 *  - Y.Doc per file
 *  - YSocketIOProvider (custom Socket.IO transport)
 *  - MonacoBinding (y-monaco bidirectional sync)
 *  - Auto-save to /api/files/write
 *
 * Critical edge cases handled:
 *  - C1: collabActiveRef blocks setValue() in MonacoEditor
 *  - C2: isFileLoading gates binding creation
 *  - Cleanup order: binding → provider → doc
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import * as Y from 'yjs';
import type { editor as monacoEditor } from 'monaco-editor';
import { YSocketIOProvider } from '@/services/y-socket-io-provider';
import { getSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

interface ConnectedUser {
  userId: string;
  userName: string;
  color: string;
}

interface UseCollaborativeEditorProps {
  /** Current file path being edited */
  fileId: string | null;
  /** Ref to the Monaco editor instance */
  editorRef: React.MutableRefObject<monacoEditor.IStandaloneCodeEditor | null>;
  /** Ref to the monaco namespace (for model creation) */
  monacoRef: React.MutableRefObject<typeof import('monaco-editor') | null>;
  /** Team ID for auth validation */
  teamId: string | null;
  /** Current user ID */
  userId: string;
  /** Current user display name */
  userName: string;
  /** User color for cursor */
  userColor: string;
  /** Whether the file is still loading from server */
  isFileLoading: boolean;
  /** Whether collaborative editing is enabled */
  enabled: boolean;
  /** Shared ref — set to true when Yjs manages content, blocks setValue() */
  collabActiveRef: React.MutableRefObject<boolean>;
}

interface UseCollaborativeEditorReturn {
  /** Whether the Socket.IO connection is alive */
  isConnected: boolean;
  /** Whether initial Yjs sync is in progress */
  isSyncing: boolean;
  /** List of users currently editing this file */
  connectedUsers: ConnectedUser[];
  /** Error message if something went wrong */
  error: string | null;
}

export function useCollaborativeEditor(
  props: UseCollaborativeEditorProps
): UseCollaborativeEditorReturn {
  const {
    fileId,
    editorRef,
    monacoRef,
    teamId,
    userId,
    userName,
    userColor,
    isFileLoading,
    enabled,
    collabActiveRef,
  } = props;

  const providerRef = useRef<YSocketIOProvider | null>(null);
  const bindingRef = useRef<any>(null); // MonacoBinding from y-monaco
  const ydocRef = useRef<Y.Doc | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstInRoomRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  // --- Cleanup function (reused in multiple places) ---
  const cleanup = useCallback(() => {
    collabActiveRef.current = false;

    // Clear save timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    // Order matters: binding first, then provider, then doc
    if (bindingRef.current) {
      try {
        bindingRef.current.destroy();
      } catch (e) {
        console.warn('[Collab] Binding cleanup error:', e);
      }
      bindingRef.current = null;
    }
    if (providerRef.current) {
      try {
        providerRef.current.destroy();
      } catch (e) {
        console.warn('[Collab] Provider cleanup error:', e);
      }
      providerRef.current = null;
    }
    if (ydocRef.current) {
      try {
        ydocRef.current.destroy();
      } catch (e) {
        console.warn('[Collab] Doc cleanup error:', e);
      }
      ydocRef.current = null;
    }

    isFirstInRoomRef.current = false;
    setIsConnected(false);
    setIsSyncing(false);
    setConnectedUsers([]);
  }, [collabActiveRef]);

  // --- Auto-save (debounced, only for first user in room) ---
  const autoSave = useCallback((filePath: string, content: string) => {
    if (!isFirstInRoomRef.current) return; // Only host saves
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/files/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath, content }),
        });
      } catch (e) {
        console.warn('[Collab] Auto-save failed:', e);
      }
    }, 500);
  }, []);

  // --- Main effect: create/destroy Yjs setup on file change ---
  useEffect(() => {
    // Guard: don't bind if conditions aren't met
    if (!enabled || !fileId || !editorRef.current || isFileLoading) {
      cleanup();
      return;
    }

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) {
      cleanup();
      return;
    }

    let cancelled = false;

    const setup = async () => {
      try {
        setIsSyncing(true);
        setError(null);

        // Get socket connection
        const socket = await getSocket();
        if (cancelled) return;
        socketRef.current = socket;

        if (!socket.connected) {
          setError('Socket not connected');
          setIsSyncing(false);
          return;
        }

        // Create Yjs doc
        const ydoc = new Y.Doc();
        const ytext = ydoc.getText('content');
        ydocRef.current = ydoc;

        // Create provider
        const provider = new YSocketIOProvider(socket, fileId, ydoc, {
          updateBatchMs: 50,
          maxUpdateSize: 512 * 1024,
        });
        providerRef.current = provider;

        // Set awareness state
        provider.awareness.setLocalStateField('user', {
          id: userId,
          name: userName,
          color: userColor,
        });

        setIsConnected(true);

        // Listen for connected users via awareness
        const handleAwarenessChange = () => {
          if (cancelled) return;
          const states = provider.awareness.getStates();
          const users: ConnectedUser[] = [];
          states.forEach((state, clientId) => {
            if (clientId === ydoc.clientID) return; // Skip self
            const user = state.user as { id?: string; name?: string; color?: string } | undefined;
            if (user) {
              users.push({
                userId: user.id || String(clientId),
                userName: user.name || 'Anonymous',
                color: user.color || '#888',
              });
            }
          });
          setConnectedUsers(users);
        };
        provider.awareness.on('change', handleAwarenessChange);

        // Listen for user join/leave
        socket.on('collab:user-joined', () => handleAwarenessChange());
        socket.on('collab:user-left', () => handleAwarenessChange());

        // Wait for initial sync before creating binding
        const onSync = async () => {
          if (cancelled || !editorRef.current) return;

          const currentModel = editorRef.current.getModel();
          if (!currentModel) return;

          // If Yjs doc is empty AND editor has content, seed from editor (first user)
          if (ytext.length === 0 && currentModel.getValue().length > 0) {
            isFirstInRoomRef.current = true;
            ydoc.transact(() => {
              ytext.insert(0, currentModel.getValue());
            });
          }

          // Dynamically import MonacoBinding (y-monaco uses ESM)
          try {
            const { MonacoBinding } = await import('y-monaco');
            if (cancelled) return;

            const binding = new MonacoBinding(
              ytext,
              currentModel,
              new Set([editorRef.current]),
              provider.awareness
            );
            bindingRef.current = binding;
            collabActiveRef.current = true;
            setIsSyncing(false);
          } catch (e) {
            console.error('[Collab] Failed to create MonacoBinding:', e);
            setError('Failed to initialize collaborative editing');
            setIsSyncing(false);
          }
        };

        if (provider.synced) {
          onSync();
        } else {
          provider.once('synced', onSync);
        }

        // Auto-save on doc updates
        ydoc.on('update', () => {
          if (cancelled || !fileId) return;
          const content = ytext.toString();
          if (content.length > 0) {
            autoSave(fileId, content);
          }
        });

      } catch (e) {
        console.error('[Collab] Setup failed:', e);
        if (!cancelled) {
          setError('Failed to connect to collaborative editing');
          setIsSyncing(false);
        }
      }
    };

    setup();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [fileId, enabled, isFileLoading, userId, userName, userColor, cleanup, autoSave, collabActiveRef, editorRef, monacoRef, teamId]);

  return {
    isConnected,
    isSyncing,
    connectedUsers,
    error,
  };
}
