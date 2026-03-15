import { useState, useCallback } from 'react';

interface MentionState {
  isOpen: boolean;
  query: string;
  position: { top: number; left: number };
  triggerIndex: number; // position in text where @ was typed
}

interface UseVaultMentionReturn {
  mentionState: MentionState | null;
  handleInputChange: (value: string, cursorPos: number, inputRect?: DOMRect) => void;
  handleMentionSelect: (
    currentValue: string,
    notePath: string,
    noteTitle: string,
    onValueChange: (newValue: string, newCursor: number) => void
  ) => void;
  closeMention: () => void;
}

export function useVaultMention(): UseVaultMentionReturn {
  const [mentionState, setMentionState] = useState<MentionState | null>(null);

  const handleInputChange = useCallback(
    (value: string, cursorPos: number, inputRect?: DOMRect) => {
      // Find the last @ before the cursor
      const textBeforeCursor = value.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex === -1) {
        setMentionState(null);
        return;
      }

      // No space between @ and cursor (allow short queries with spaces, but cap at 20 chars)
      const query = textBeforeCursor.slice(lastAtIndex + 1);
      if (query.includes(' ') && query.length > 20) {
        setMentionState(null);
        return;
      }

      setMentionState({
        isOpen: true,
        query,
        position: inputRect
          ? { top: inputRect.bottom + 4, left: inputRect.left }
          : { top: 0, left: 0 },
        triggerIndex: lastAtIndex,
      });
    },
    []
  );

  const handleMentionSelect = useCallback(
    (
      currentValue: string,
      notePath: string,
      noteTitle: string,
      onValueChange: (newValue: string, newCursor: number) => void
    ) => {
      if (!mentionState) return;
      const before = currentValue.slice(0, mentionState.triggerIndex);
      const after = currentValue.slice(
        mentionState.triggerIndex + 1 + mentionState.query.length
      );
      const insertion = `@[[${notePath}|${noteTitle}]]`;
      const newValue = before + insertion + after;
      onValueChange(newValue, before.length + insertion.length);
      setMentionState(null);
    },
    [mentionState]
  );

  const closeMention = useCallback(() => setMentionState(null), []);

  return { mentionState, handleInputChange, handleMentionSelect, closeMention };
}
