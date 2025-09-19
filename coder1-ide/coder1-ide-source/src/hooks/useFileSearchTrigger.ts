import { useEffect, useState, useCallback, RefObject } from 'react';

interface FileSearchState {
  isOpen: boolean;
  triggerPosition: { x: number; y: number } | null;
  insertPosition: number;
}

/**
 * Hook to detect @ symbol in input fields and trigger file search
 */
export function useFileSearchTrigger(
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement>
): {
  fileSearchState: FileSearchState;
  handleFileSelect: (filePath: string) => void;
  closeFileSearch: () => void;
} {
  const [fileSearchState, setFileSearchState] = useState<FileSearchState>({
    isOpen: false,
    triggerPosition: null,
    insertPosition: 0,
  });

  const detectAtSymbol = useCallback((e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    
    if (target.value.includes('@')) {
      const cursorPosition = target.selectionStart || 0;
      const textBeforeCursor = target.value.substring(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      
      // Check if @ was just typed (is at cursor position - 1)
      if (lastAtIndex === cursorPosition - 1) {
        // Calculate position for the search overlay
        const rect = target.getBoundingClientRect();
        
        // For textarea, we need to calculate line position
        if (target.tagName === 'TEXTAREA') {
          const textBeforeAt = target.value.substring(0, lastAtIndex);
          const lines = textBeforeAt.split('\n');
          const currentLine = lines.length;
          const lineHeight = parseInt(getComputedStyle(target).lineHeight) || 20;
          
          setFileSearchState({
            isOpen: true,
            triggerPosition: {
              x: rect.left,
              y: rect.top + (currentLine * lineHeight),
            },
            insertPosition: lastAtIndex,
          });
        } else {
          // For input, position below the field
          setFileSearchState({
            isOpen: true,
            triggerPosition: {
              x: rect.left,
              y: rect.bottom + 5,
            },
            insertPosition: lastAtIndex,
          });
        }
      }
    }
  }, []);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.addEventListener('input', detectAtSymbol);
    
    return () => {
      input.removeEventListener('input', detectAtSymbol);
    };
  }, [inputRef, detectAtSymbol]);

  const handleFileSelect = useCallback((filePath: string) => {
    const input = inputRef.current;
    if (!input) return;

    const { insertPosition } = fileSearchState;
    const currentValue = input.value;
    
    // Replace @ with the file path
    const newValue = 
      currentValue.substring(0, insertPosition) + 
      filePath + 
      currentValue.substring(insertPosition + 1);
    
    input.value = newValue;
    
    // Trigger input event for React
    const event = new Event('input', { bubbles: true });
    input.dispatchEvent(event);
    
    // Move cursor after the inserted path
    const newCursorPosition = insertPosition + filePath.length;
    input.setSelectionRange(newCursorPosition, newCursorPosition);
    input.focus();
    
    // Close the search
    setFileSearchState({
      isOpen: false,
      triggerPosition: null,
      insertPosition: 0,
    });
  }, [inputRef, fileSearchState]);

  const closeFileSearch = useCallback(() => {
    // Remove the @ symbol if search is cancelled
    const input = inputRef.current;
    if (input && fileSearchState.isOpen) {
      const { insertPosition } = fileSearchState;
      const currentValue = input.value;
      
      // Only remove if @ is still there
      if (currentValue[insertPosition] === '@') {
        const newValue = 
          currentValue.substring(0, insertPosition) + 
          currentValue.substring(insertPosition + 1);
        
        input.value = newValue;
        
        // Trigger input event
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
        
        // Reset cursor position
        input.setSelectionRange(insertPosition, insertPosition);
        input.focus();
      }
    }
    
    setFileSearchState({
      isOpen: false,
      triggerPosition: null,
      insertPosition: 0,
    });
  }, [inputRef, fileSearchState]);

  return {
    fileSearchState,
    handleFileSelect,
    closeFileSearch,
  };
}