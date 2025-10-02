'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Clock, Hash, FileText, Image as ImageIcon, ChevronDown, GitBranch, Eye, FilePlus, Undo2, Redo2, Bookmark, Plus, Save, Expand, Minimize, Mic, MicOff } from 'lucide-react';
import { commandHistoryService, CommandHistoryEntry } from '@/services/command-history-service';
import { commandSnippetsService, CommandSnippet } from '@/services/command-snippets-service';
// OCR functionality is optional - only import if available
// import { createWorker } from 'tesseract.js';

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface StagedComposerProps {
  isVisible: boolean;
  onClose: () => void;
  onSend: (command: string, images?: Array<{ base64: string; mimeType: string }>) => void;
  currentCommand?: string;
  sessionId: string;
  isProcessing?: boolean;
  planningMode?: boolean;
  onPlanningModeToggle?: () => void;
}

export default function StagedComposer({
  isVisible,
  onClose,
  onSend,
  currentCommand = '',
  sessionId,
  isProcessing = false,
  planningMode = false,
  onPlanningModeToggle
}: StagedComposerProps) {
  const [command, setCommand] = useState(currentCommand);
  const [images, setImages] = useState<Array<{ base64: string; mimeType: string; preview: string }>>([]);
  const [dragActive, setDragActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [tokenEstimate, setTokenEstimate] = useState(0);
  
  // Undo/Redo state
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const lastSavedCommand = useRef<string>('');
  
  // OCR and PDF processing state
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  const [ocrResults, setOcrResults] = useState<Array<{ filename: string; text: string; confidence: number }>>([]);
  const [pdfResults, setPdfResults] = useState<Array<{ filename: string; text: string; pages: number; method: 'text-extraction' | 'ocr' }>>([]);
  
  // Command history state
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [historySearch, setHistorySearch] = useState('');
  
  // Template state
  const [showTemplates, setShowTemplates] = useState(false);
  
  // AI suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  // Snippets state
  const [snippets, setSnippets] = useState<CommandSnippet[]>([]);
  const [showSnippets, setShowSnippets] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState(0);
  const [showSnippetManager, setShowSnippetManager] = useState(false);
  const [snippetSearch, setSnippetSearch] = useState('');
  const [newSnippetName, setNewSnippetName] = useState('');
  const [newSnippetCategory, setNewSnippetCategory] = useState('other');
  
  // Multi-line mode state
  const [multilineMode, setMultilineMode] = useState(false);
  
  // Voice input state
  const [recognition, setRecognition] = useState<any>(null);
  const [voiceListening, setVoiceListening] = useState(false);
  
  // Error handling and user feedback state
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [warningMessage, setWarningMessage] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Common command templates
  const templates = [
    { name: 'Debug Error', template: 'Help me debug this error: {error_message}' },
    { name: 'Explain Code', template: 'Explain this code and what it does: {code}' },
    { name: 'Write Tests', template: 'Write comprehensive tests for {module_or_function}' },
    { name: 'Refactor Code', template: 'Refactor {component} to use {pattern_or_approach}' },
    { name: 'Fix TypeScript', template: 'Fix the TypeScript error in {file} at line {line_number}' },
    { name: 'Optimize Performance', template: 'Optimize the performance of {component_or_function}' },
    { name: 'Add Feature', template: 'Add a {feature_description} feature to {component}' },
    { name: 'Security Review', template: 'Review {code_or_file} for security vulnerabilities' },
    { name: 'Documentation', template: 'Write documentation for {component_or_api}' },
    { name: 'Code Review', template: 'Please review this code and suggest improvements: {code}' }
  ];

  // Debounce utility for undo/redo
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // User feedback utilities
  const showError = useCallback((message: string, duration = 5000) => {
    console.error('🚨 User Error:', message);
    setErrorMessage(message);
    setSuccessMessage('');
    setWarningMessage('');
    setTimeout(() => setErrorMessage(''), duration);
  }, []);

  const showSuccess = useCallback((message: string, duration = 3000) => {
    console.log('✅ User Success:', message);
    setSuccessMessage(message);
    setErrorMessage('');
    setWarningMessage('');
    setTimeout(() => setSuccessMessage(''), duration);
  }, []);

  const showWarning = useCallback((message: string, duration = 4000) => {
    console.warn('⚠️ User Warning:', message);
    setWarningMessage(message);
    setErrorMessage('');
    setSuccessMessage('');
    setTimeout(() => setWarningMessage(''), duration);
  }, []);

  // Record command changes for undo/redo
  const recordChange = useCallback(debounce((text: string) => {
    console.log('📝 RECORD CHANGE TRIGGERED');
    console.log('📊 New text:', text);
    console.log('📊 Last saved:', lastSavedCommand.current);
    console.log('📊 Text different?', text !== lastSavedCommand.current);
    console.log('📊 Last saved not empty?', lastSavedCommand.current !== '');
    
    if (text !== lastSavedCommand.current && lastSavedCommand.current !== '') {
      console.log('✅ Recording change to undo stack');
      setUndoStack(prev => {
        const newUndoStack = [...prev, lastSavedCommand.current].slice(-50);
        console.log('📤 New undo stack:', newUndoStack);
        return newUndoStack;
      });
      setRedoStack([]); // Clear redo stack when new change is made
      console.log('🧹 Cleared redo stack');
    } else {
      console.log('❌ Not recording change (same as last or last is empty)');
    }
    lastSavedCommand.current = text;
    console.log('💾 Updated last saved command to:', text);
  }, 500), []);

  // Undo function
  const handleUndo = useCallback(() => {
    console.log('🔄 UNDO TRIGGERED');
    console.log('📊 Undo stack length:', undoStack.length);
    console.log('📊 Current command:', command);
    console.log('📊 Undo stack contents:', undoStack);
    
    if (undoStack.length > 0) {
      const previousCommand = undoStack[undoStack.length - 1];
      console.log('⬅️ Previous command:', previousCommand);
      
      setRedoStack(prev => {
        const newRedoStack = [command, ...prev].slice(0, 50);
        console.log('📤 Updated redo stack:', newRedoStack);
        return newRedoStack;
      });
      
      setUndoStack(prev => {
        const newUndoStack = prev.slice(0, -1);
        console.log('📤 Updated undo stack:', newUndoStack);
        return newUndoStack;
      });
      
      console.log('🔄 Setting command to:', previousCommand);
      setCommand(previousCommand);
      lastSavedCommand.current = previousCommand;
      
      // Focus textarea after undo
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(previousCommand.length, previousCommand.length);
        console.log('📍 Focused textarea and set cursor position');
      }
      console.log('✅ UNDO COMPLETED');
    } else {
      console.log('❌ No undo history available');
    }
  }, [undoStack, command]);

  // Redo function
  const handleRedo = useCallback(() => {
    console.log('🔄 REDO TRIGGERED');
    console.log('📊 Redo stack length:', redoStack.length);
    console.log('📊 Current command:', command);
    console.log('📊 Redo stack contents:', redoStack);
    
    if (redoStack.length > 0) {
      const nextCommand = redoStack[0];
      console.log('➡️ Next command:', nextCommand);
      
      setUndoStack(prev => {
        const newUndoStack = [...prev, command].slice(-50);
        console.log('📤 Updated undo stack:', newUndoStack);
        return newUndoStack;
      });
      
      setRedoStack(prev => {
        const newRedoStack = prev.slice(1);
        console.log('📤 Updated redo stack:', newRedoStack);
        return newRedoStack;
      });
      
      console.log('🔄 Setting command to:', nextCommand);
      setCommand(nextCommand);
      lastSavedCommand.current = nextCommand;
      
      // Focus textarea after redo
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextCommand.length, nextCommand.length);
        console.log('📍 Focused textarea and set cursor position');
      }
      console.log('✅ REDO COMPLETED');
    } else {
      console.log('❌ No redo history available');
    }
  }, [redoStack, command]);

  // Fetch AI suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    console.log('🔍 FETCH SUGGESTIONS TRIGGERED');
    console.log('📊 Query:', query);
    console.log('📊 Query length:', query.length);
    
    if (!query.trim() || query.length < 2) {
      console.log('❌ Query too short, clearing suggestions');
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    console.log('🚀 Starting suggestions fetch...');
    setIsLoadingSuggestions(true);
    
    try {
      // Get frequent commands from history
      console.log('📚 Fetching frequent commands from history...');
      const frequentCommands = await commandHistoryService.getFrequentCommands(5);
      console.log('📚 Frequent commands:', frequentCommands);
      
      const historySuggestions = frequentCommands
        .filter(cmd => cmd.command.toLowerCase().includes(query.toLowerCase()))
        .map(cmd => cmd.command);
      console.log('📚 History suggestions:', historySuggestions);

      // Get codebase suggestions
      console.log('🔍 Fetching codebase suggestions...');
      const apiUrl = `/api/codebase/suggest?q=${encodeURIComponent(query)}&limit=5`;
      console.log('🔍 API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('🔍 API Response status:', response.status);
      console.log('🔍 API Response ok:', response.ok);
      
      const data = await response.json();
      console.log('🔍 API Response data:', data);
      
      const codebaseSuggestions = data.success ? data.suggestions.map((s: any) => {
        const suggestion = s.suggestion || s.name || s;
        console.log('🔍 Mapped suggestion:', suggestion);
        return suggestion;
      }) : [];
      console.log('🔍 Codebase suggestions:', codebaseSuggestions);

      // Add common command patterns
      const gitSuggestions = query.toLowerCase().includes('git') ? ['git status', 'git add .', 'git commit -m ""', 'git push'] : [];
      const npmSuggestions = query.toLowerCase().includes('npm') ? ['npm install', 'npm run dev', 'npm run build', 'npm test'] : [];
      const findSuggestions = query.toLowerCase().includes('find') ? ['find . -name "*.js"', 'find . -type f -name "*.ts"'] : [];
      
      console.log('🎯 Pattern suggestions:', { gitSuggestions, npmSuggestions, findSuggestions });

      // Combine and deduplicate suggestions
      const combinedSuggestions = [
        ...historySuggestions,
        ...codebaseSuggestions,
        ...gitSuggestions,
        ...npmSuggestions,
        ...findSuggestions,
      ];
      console.log('🔗 Combined suggestions:', combinedSuggestions);

      const uniqueSuggestions = Array.from(new Set(combinedSuggestions))
        .filter(suggestion => suggestion.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8);
      console.log('✨ Final unique suggestions:', uniqueSuggestions);

      setSuggestions(uniqueSuggestions);
      setSelectedSuggestion(0);
      setShowSuggestions(uniqueSuggestions.length > 0);
      
      console.log('✅ Suggestions updated:', {
        count: uniqueSuggestions.length,
        showing: uniqueSuggestions.length > 0
      });
    } catch (error) {
      console.error('❌ Failed to fetch suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
      console.log('🏁 Suggestions fetch completed');
    }
  }, []);

  // Debounced suggestion fetching
  const debouncedFetchSuggestions = useCallback(debounce(fetchSuggestions, 300), [fetchSuggestions]);

  // Apply selected suggestion
  const applySuggestion = useCallback((suggestion: string) => {
    setCommand(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Focus textarea and position cursor at end
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(suggestion.length, suggestion.length);
    }
  }, []);

  // Load snippets
  const loadSnippets = useCallback(async () => {
    console.log('📦 LOAD SNIPPETS TRIGGERED');
    try {
      console.log('📦 Calling commandSnippetsService.getAllSnippets()...');
      const allSnippets = await commandSnippetsService.getAllSnippets();
      console.log('📦 Retrieved snippets:', allSnippets);
      console.log('📦 Number of snippets:', allSnippets.length);
      setSnippets(allSnippets);
      console.log('✅ Snippets loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load snippets:', error);
      setSnippets([]); // Ensure we clear snippets on error
      showError('Failed to load command snippets. Please try again.');
    }
  }, []);

  // Search snippets
  const searchSnippets = useCallback(async (query: string) => {
    try {
      if (query.trim()) {
        const results = await commandSnippetsService.searchSnippets(query);
        setSnippets(results);
      } else {
        await loadSnippets();
      }
    } catch (error) {
      console.error('Failed to search snippets:', error);
      showError('Failed to search command snippets. Please try again.');
    }
  }, [loadSnippets]);

  // Apply snippet
  const applySnippet = useCallback(async (snippet: CommandSnippet) => {
    setCommand(snippet.command);
    setShowSnippets(false);
    showSuccess(`Applied snippet: ${snippet.name}`);
    
    // Record usage
    try {
      await commandSnippetsService.useSnippet(snippet.id);
      await loadSnippets(); // Refresh to update sort order
    } catch (error) {
      console.error('Failed to record snippet usage:', error);
      showWarning('Snippet applied but usage tracking failed');
    }
    
    // Focus textarea and position cursor at end
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(snippet.command.length, snippet.command.length);
    }
  }, [loadSnippets, showSuccess, showWarning]);

  // Save current command as snippet
  const saveAsSnippet = useCallback(async () => {
    if (!command.trim() || !newSnippetName.trim()) return;
    
    try {
      await commandSnippetsService.addSnippet({
        name: newSnippetName,
        command: command.trim(),
        description: `Saved from command composer`,
        tags: [newSnippetCategory],
        category: newSnippetCategory
      });
      
      setNewSnippetName('');
      await loadSnippets();
      setShowSnippetManager(false);
    } catch (error) {
      console.error('Failed to save snippet:', error);
    }
  }, [command, newSnippetName, newSnippetCategory, loadSnippets]);

  // Focus textarea when component becomes visible
  useEffect(() => {
    if (isVisible && textareaRef.current) {
      textareaRef.current.focus();
      // Place cursor at end of text
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isVisible]);

  // Update command when prop changes (for edit mode)
  useEffect(() => {
    if (currentCommand) {
      setCommand(currentCommand);
      lastSavedCommand.current = currentCommand;
    }
  }, [currentCommand]);

  // Track command changes for undo/redo
  useEffect(() => {
    console.log('🔍 COMMAND CHANGE EFFECT TRIGGERED');
    console.log('📊 Current command:', command);
    console.log('📊 Last saved command:', lastSavedCommand.current);
    console.log('📊 Commands different?', command !== lastSavedCommand.current);
    
    if (command !== lastSavedCommand.current) {
      console.log('🚀 Calling recordChange with:', command);
      recordChange(command);
    } else {
      console.log('⚪ Skipping recordChange (same command)');
    }
  }, [command, recordChange]);

  // Add immediate recording for significant changes (non-debounced)
  useEffect(() => {
    // Record immediately when command becomes empty or when it's a significant change
    const currentLength = command.length;
    const lastLength = lastSavedCommand.current.length;
    const lengthDiff = Math.abs(currentLength - lastLength);
    
    // Immediate recording conditions:
    // 1. Command becomes empty (clear)
    // 2. Large change (paste, template application)
    // 3. First character typed
    if (
      (command === '' && lastSavedCommand.current !== '') ||
      (lengthDiff > 10) ||
      (lastSavedCommand.current === '' && command.length > 0)
    ) {
      console.log('🔥 IMMEDIATE RECORD TRIGGERED:', { 
        reason: command === '' ? 'cleared' : lengthDiff > 10 ? 'large-change' : 'first-char',
        currentLength, 
        lastLength,
        lengthDiff
      });
      
      // Record the previous state immediately (before debounce)
      if (lastSavedCommand.current !== '') {
        setUndoStack(prev => {
          const newStack = [...prev, lastSavedCommand.current].slice(-50);
          console.log('🔥 Immediate undo stack update:', newStack);
          return newStack;
        });
        setRedoStack([]); // Clear redo stack
      }
      lastSavedCommand.current = command;
    }
  }, [command]);

  // Fetch suggestions when command changes
  useEffect(() => {
    if (command && command.length >= 2) {
      debouncedFetchSuggestions(command);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [command, debouncedFetchSuggestions]);

  // Handle @prefix for snippets
  useEffect(() => {
    console.log('🎯 @PREFIX HANDLER TRIGGERED');
    console.log('📊 Current command:', command);
    console.log('📊 Starts with @?', command.startsWith('@'));
    
    if (command.startsWith('@')) {
      const query = command.slice(1); // Remove @ prefix
      console.log('📊 @ query:', query);
      console.log('📊 Query length:', query.length);
      
      if (query.length >= 1) {
        console.log('🔍 Searching snippets with query:', query);
        searchSnippets(query);
        setShowSnippets(true);
        setSelectedSnippet(0);
        console.log('✅ Showing snippets dropdown');
      } else {
        console.log('❌ Query too short, clearing snippets');
        setSnippets([]);
        setShowSnippets(false);
      }
    } else {
      console.log('⚪ Not @ command, hiding snippets');
      setShowSnippets(false);
    }
  }, [command, searchSnippets]);

  // Estimate tokens (rough approximation: ~4 chars per token)
  useEffect(() => {
    const textTokens = Math.ceil(command.length / 4);
    const imageTokens = images.length * 85; // Claude typically uses ~85 tokens per image
    setTokenEstimate(textTokens + imageTokens);
  }, [command, images]);

  // Load command history when component becomes visible
  useEffect(() => {
    if (isVisible) {
      loadHistory();
      loadSnippets();
    }
  }, [isVisible, sessionId, loadSnippets]);

  // Debug effect to monitor dragActive state changes
  useEffect(() => {
    console.log('🔵🔵🔵 dragActive state changed to:', dragActive);
    if (dragActive) {
      console.log('🟢 Overlay should be VISIBLE');
    } else {
      console.log('🔴 Overlay should be HIDDEN');
    }
  }, [dragActive]);

  // Simple escape key handler to clear overlay
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragActive) {
        console.log('⌨️ ESC pressed - clearing overlay');
        dragCounterRef.current = 0;
        setDragActive(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [dragActive]);

  // Initialize speech recognition
  useEffect(() => {
    console.log('🎤 SPEECH RECOGNITION INIT');
    console.log('📊 Window defined?', typeof window !== 'undefined');
    console.log('📊 webkitSpeechRecognition available?', typeof window !== 'undefined' && 'webkitSpeechRecognition' in window);
    console.log('📊 SpeechRecognition available?', typeof window !== 'undefined' && 'SpeechRecognition' in window);
    
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.log('✅ Speech recognition supported, initializing...');
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      console.log('✅ Speech recognition instance created');
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      recognitionInstance.maxAlternatives = 1;
      
      recognitionInstance.onresult = (event: any) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          }
        }
        
        if (finalTranscript && finalTranscript.trim()) {
          const cleanTranscript = finalTranscript.trim();
          
          // Insert voice text at current cursor position or append
          if (textareaRef.current) {
            const textarea = textareaRef.current;
            const cursorPosition = textarea.selectionStart;
            const textBefore = command.slice(0, cursorPosition);
            const textAfter = command.slice(cursorPosition);
            
            const newCommand = textBefore + (textBefore ? ' ' : '') + cleanTranscript + textAfter;
            setCommand(newCommand);
            
            // Set cursor position after inserted text
            setTimeout(() => {
              if (textareaRef.current) {
                const newPosition = cursorPosition + cleanTranscript.length + (textBefore ? 1 : 0);
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(newPosition, newPosition);
              }
            }, 10);
          }
        }
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setVoiceListening(false);
        
        // Show user-friendly error message
        let errorMessage = 'Voice recognition failed';
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please speak clearly and try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Audio capture failed. Please check your microphone connection.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          default:
            errorMessage = `Voice recognition error: ${event.error}`;
        }
        showError(errorMessage);
      };
      
      recognitionInstance.onend = () => {
        if (voiceListening && recognitionInstance) {
          try {
            setTimeout(() => {
              if (voiceListening) {
                recognitionInstance.start();
              }
            }, 100);
          } catch (error) {
            setVoiceListening(false);
          }
        } else {
          setVoiceListening(false);
        }
      };
      
      setRecognition(recognitionInstance);
      console.log('✅ Speech recognition fully configured');
    } else {
      console.log('❌ Speech recognition not supported in this browser');
    }
  }, [command, voiceListening]);

  // Toggle voice recognition
  const toggleVoiceRecognition = useCallback(async () => {
    if (!recognition) {
      console.log('Speech recognition not supported in this browser');
      return;
    }
    
    if (voiceListening) {
      recognition.stop();
      setVoiceListening(false);
    } else {
      try {
        // Request microphone permission first
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (permError) {
            console.error('Microphone permission denied');
            return;
          }
        }
        
        recognition.start();
        setVoiceListening(true);
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setVoiceListening(false);
      }
    }
  }, [recognition, voiceListening]);

  // Manual test functions for debugging (expose to window for console testing)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testUndo = () => {
        console.log('🧪 Manual test: triggering undo');
        handleUndo();
      };
      (window as any).testRedo = () => {
        console.log('🧪 Manual test: triggering redo');
        handleRedo();
      };
      (window as any).testAddToUndo = (text: string) => {
        console.log('🧪 Manual test: adding to undo stack:', text);
        if (lastSavedCommand.current !== '') {
          setUndoStack(prev => [...prev, lastSavedCommand.current]);
        }
        lastSavedCommand.current = text;
        setCommand(text);
      };
      (window as any).getUndoState = () => {
        return {
          undoStack,
          redoStack,
          currentCommand: command,
          lastSavedCommand: lastSavedCommand.current
        };
      };
    }
  }, [undoStack, redoStack, command, handleUndo, handleRedo]);

  const loadHistory = async () => {
    try {
      const entries = await commandHistoryService.getHistory(50);
      setHistory(entries);
    } catch (error) {
      console.error('Failed to load command history:', error);
    }
  };

  const searchHistory = async (query: string) => {
    try {
      if (query.trim()) {
        const entries = await commandHistoryService.searchHistory(query, 20);
        setHistory(entries);
      } else {
        await loadHistory();
      }
    } catch (error) {
      console.error('Failed to search history:', error);
    }
  };

  const applyTemplate = (template: string) => {
    setCommand(template);
    setShowTemplates(false);
    // Focus textarea and position cursor at first placeholder
    if (textareaRef.current) {
      textareaRef.current.focus();
      const firstPlaceholder = template.indexOf('{');
      if (firstPlaceholder !== -1) {
        textareaRef.current.setSelectionRange(firstPlaceholder, template.indexOf('}', firstPlaceholder) + 1);
      }
    }
  };

  const handleSend = async () => {
    if (command.trim() || images.length > 0) {
      // Save to history
      try {
        await commandHistoryService.addCommand({
          command,
          timestamp: Date.now(),
          sessionId,
          hasImages: images.length > 0,
          tokenCount: tokenEstimate
        });
      } catch (error) {
        console.error('Failed to save command to history:', error);
      }

      onSend(command, images.map(({ base64, mimeType }) => ({ base64, mimeType })));
      setCommand('');
      setImages([]);
      setShowHistory(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle snippets navigation when snippets are visible
    if (showSnippets && snippets.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSnippet(prev => (prev + 1) % snippets.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSnippet(prev => prev === 0 ? snippets.length - 1 : prev - 1);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        applySnippet(snippets[selectedSnippet]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSnippets(false);
        return;
      }
    }

    // Handle suggestions navigation when suggestions are visible
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion(prev => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion(prev => prev === 0 ? suggestions.length - 1 : prev - 1);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        applySuggestion(suggestions[selectedSuggestion]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        setSuggestions([]);
        return;
      }
    }

    // Ctrl/Cmd + Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }
    // Ctrl/Cmd + Shift + Z for redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      handleRedo();
      return;
    }
    // Ctrl/Cmd + Y for redo (alternative)
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      handleRedo();
      return;
    }
    // Ctrl/Cmd + Enter to send (always works)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
      return;
    }
    // Enter behavior depends on mode
    if (e.key === 'Enter' && !e.shiftKey) {
      if (multilineMode) {
        // In multi-line mode, Enter adds new line, Shift+Enter sends
        // Let default behavior happen (new line)
        return;
      } else {
        // In single-line mode, Enter sends, Shift+Enter adds new line
        e.preventDefault();
        handleSend();
        return;
      }
    }
    // Shift+Enter behavior depends on mode
    if (e.key === 'Enter' && e.shiftKey) {
      if (multilineMode) {
        // In multi-line mode, Shift+Enter sends
        e.preventDefault();
        handleSend();
        return;
      } else {
        // In single-line mode, Shift+Enter adds new line
        // Let default behavior happen
        return;
      }
    }
    // Escape to close
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
    // Up arrow for previous command in history (only when suggestions not visible)
    if (e.key === 'ArrowUp' && !e.shiftKey && !showSuggestions) {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(history[newIndex].command);
      }
    }
    // Down arrow for next command in history (only when suggestions not visible)
    if (e.key === 'ArrowDown' && !e.shiftKey && !showSuggestions) {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(history[newIndex].command);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  // Add drag counter to handle nested elements properly
  const dragCounterRef = useRef(0);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debug effect to ensure component is mounted and handlers are ready
  useEffect(() => {
    console.log('🚀 StagedComposer mounted - drag handlers ready');
    console.log('📍 Drag state:', { dragActive, dragCounter: dragCounterRef.current });
    
    // Add global drag event listeners for debugging
    const globalDragEnter = (e: DragEvent) => {
      console.log('🌍 GLOBAL dragenter detected', e.dataTransfer?.types);
    };
    
    const globalDragOver = (e: DragEvent) => {
      // Only log once every 500ms to avoid spam
      if (!(window as any)._lastDragOverLog || Date.now() - (window as any)._lastDragOverLog > 500) {
        console.log('🌍 GLOBAL dragover detected');
        (window as any)._lastDragOverLog = Date.now();
      }
    };
    
    const globalDrop = (e: DragEvent) => {
      console.log('🌍 GLOBAL drop detected! Ensuring overlay is cleared');
      // Failsafe: if drop happens anywhere, clear our overlay
      dragCounterRef.current = 0;
      setDragActive(false);
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }
    };
    
    // Global drag end handler - ultimate failsafe
    const globalDragEnd = (e: DragEvent) => {
      console.log('🌍 GLOBAL dragend - clearing overlay');
      dragCounterRef.current = 0;
      setDragActive(false);
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }
    };
    
    window.addEventListener('dragenter', globalDragEnter, true);
    window.addEventListener('dragover', globalDragOver, true);
    window.addEventListener('drop', globalDrop, true);
    window.addEventListener('dragend', globalDragEnd, true);
    
    return () => {
      console.log('👋 StagedComposer unmounting');
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
      window.removeEventListener('dragenter', globalDragEnter, true);
      window.removeEventListener('dragover', globalDragOver, true);
      window.removeEventListener('drop', globalDrop, true);
      window.removeEventListener('dragend', globalDragEnd, true);
    };
  }, []);

  // Simplified drag and drop handlers with extensive debugging
  const handleDrop = async (e: React.DragEvent) => {
    console.log('🎯🎯🎯 DROP EVENT FIRED!');
    console.log('Drop currentTarget:', e.currentTarget);
    console.log('Drop target:', e.target);
    e.preventDefault();
    e.stopPropagation();
    
    // Clear any failsafe timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    
    // Reset drag counter FIRST
    dragCounterRef.current = 0;
    
    // IMMEDIATELY clear the overlay - this is the most important part
    console.log('🔴 Setting dragActive to false NOW');
    setDragActive(false);
    
    // Process files after clearing the overlay
    const files = Array.from(e.dataTransfer.files);
    console.log(`📂 Processing ${files.length} files`);
    
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    // Process image files with OCR
    if (imageFiles.length > 0) {
      console.log(`🖼️ Found ${imageFiles.length} image files - processing with OCR...`);
      setIsProcessingOCR(true);
      
      for (const file of imageFiles) {
        try {
          // Add image to preview first
          const base64 = await fileToBase64(file);
          const preview = URL.createObjectURL(file);
          setImages(prev => [...prev, { base64, mimeType: file.type, preview }]);
          console.log('✅ Image added to preview');
          
          // Process with OCR
          console.log(`🔍 Starting OCR for ${file.name}...`);
          const ocrResult = await processImageWithOCR(file);
          
          // Store OCR result
          setOcrResults(prev => [...prev, {
            filename: file.name,
            text: ocrResult.text,
            confidence: ocrResult.confidence
          }]);
          
          // Auto-inject formatted text into command textarea
          const formattedText = formatTextForClaude(ocrResult, file.name);
          setCommand(prev => {
            const newCommand = prev ? `${prev}\n\n${formattedText}` : formattedText;
            return newCommand;
          });
          
          console.log(`✅ OCR completed for ${file.name} - text auto-injected into command`);
          
        } catch (error) {
          console.error(`❌ Error processing ${file.name}:`, error);
          // Still show the image even if OCR fails
        }
      }
      
      setIsProcessingOCR(false);
    }
    
    // Process PDF files with hybrid approach
    if (pdfFiles.length > 0) {
      console.log(`📄 Found ${pdfFiles.length} PDF files - processing with text extraction + OCR fallback...`);
      setIsProcessingPDF(true);
      
      for (const file of pdfFiles) {
        try {
          console.log(`📄 Processing PDF: ${file.name}...`);
          const pdfResult = await processPDFFile(file);
          
          // Store PDF result
          setPdfResults(prev => [...prev, {
            filename: file.name,
            text: pdfResult.text,
            pages: pdfResult.pages,
            method: pdfResult.method
          }]);
          
          // Auto-inject formatted text into command textarea
          const formattedText = formatPDFTextForClaude(pdfResult, file.name);
          setCommand(prev => {
            const newCommand = prev ? `${prev}\n\n${formattedText}` : formattedText;
            return newCommand;
          });
          
          console.log(`✅ PDF processing completed for ${file.name} using ${pdfResult.method} - text auto-injected into command`);
          
        } catch (error) {
          console.error(`❌ Error processing PDF ${file.name}:`, error);
        }
      }
      
      setIsProcessingPDF(false);
    }
    
    if (imageFiles.length === 0 && pdfFiles.length === 0) {
      console.log('⚠️ No supported files found in drop (images or PDFs)');
    }
    
    console.log('🎯 Drop processing complete');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only count if we have files
    if (!e.dataTransfer?.types?.includes('Files')) return;
    
    // Clear any existing timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    
    dragCounterRef.current++;
    console.log(`🟢 DRAG ENTER - Counter: ${dragCounterRef.current}`);
    
    if (dragCounterRef.current === 1) {
      console.log('🟢 Setting dragActive to true');
      setDragActive(true);
      
      // Set a failsafe timeout to clear the overlay after 5 seconds
      dragTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Failsafe timeout - clearing overlay');
        dragCounterRef.current = 0;
        setDragActive(false);
      }, 5000);
    }
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're leaving the composer entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // If mouse is outside the composer bounds, reset immediately
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      console.log('🔴 Mouse left composer bounds - resetting immediately');
      dragCounterRef.current = 0;
      setDragActive(false);
      
      // Clear any timeout
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }
      return;
    }
    
    // Normal counter decrement for internal elements
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    console.log(`🔴 DRAG LEAVE - Counter: ${dragCounterRef.current}`);
    
    if (dragCounterRef.current === 0) {
      console.log('🔴 Counter reached 0, clearing overlay');
      setDragActive(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const base64 = await fileToBase64(file);
          const preview = URL.createObjectURL(file);
          setImages(prev => [...prev, { 
            base64, 
            mimeType: file.type,
            preview 
          }]);
        }
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // OCR Processing with Smart Content Detection
  const processImageWithOCR = async (file: File): Promise<{ text: string; confidence: number; contentType: string }> => {
    try {
      console.log(`🔍 OCR processing disabled for deployment - would process ${file.name}...`);
      
      // OCR functionality disabled for deployment to avoid tesseract.js dependency
      // To enable, install tesseract.js: npm install tesseract.js
      const extractedText = `[OCR disabled] Image file: ${file.name}`;
      const confidence = 0;
      
      // Smart content detection
      const contentType = detectContentType(extractedText);
      
      console.log(`✅ OCR completed for ${file.name}:`, {
        confidence: Math.round(confidence),
        contentType,
        textLength: extractedText.length
      });
      
      return {
        text: extractedText,
        confidence,
        contentType
      };
    } catch (error) {
      console.error(`❌ OCR failed for ${file.name}:`, error);
      throw error;
    }
  };

  // Detect content type from extracted text
  const detectContentType = (text: string): string => {
    const lowerText = text.toLowerCase();
    
    // Code patterns
    if (text.match(/(?:function|class|import|export|const|let|var|if|for|while)/g)) {
      return 'code';
    }
    
    // Error messages
    if (lowerText.includes('error') || lowerText.includes('exception') || lowerText.includes('failed')) {
      return 'error';
    }
    
    // Terminal/CLI output
    if (text.match(/^\$|➜|#\s|npm|git|cd\s/gm)) {
      return 'terminal';
    }
    
    // File listings
    if (text.match(/\.(js|ts|jsx|tsx|py|java|cpp|html|css)$/gm)) {
      return 'file-listing';
    }
    
    // URLs or links
    if (text.match(/https?:\/\/|www\./g)) {
      return 'urls';
    }
    
    // Default to text/content
    return 'content';
  };

  // Format extracted text for Claude Code injection
  const formatTextForClaude = (ocrResult: { text: string; confidence: number; contentType: string }, filename: string): string => {
    const { text, confidence, contentType } = ocrResult;
    
    let formattedText = `📋 Text extracted from image "${filename}" (${Math.round(confidence)}% confidence):\n\n`;
    
    switch (contentType) {
      case 'code':
        formattedText += '```\n' + text + '\n```\n\n';
        formattedText += 'Please help me understand or work with this code.';
        break;
        
      case 'error':
        formattedText += '❌ Error message:\n```\n' + text + '\n```\n\n';
        formattedText += 'Please help me debug this error and suggest a solution.';
        break;
        
      case 'terminal':
        formattedText += '💻 Terminal output:\n```bash\n' + text + '\n```\n\n';
        formattedText += 'Please help me understand this terminal output or suggest next steps.';
        break;
        
      case 'file-listing':
        formattedText += '📁 File structure:\n```\n' + text + '\n```\n\n';
        formattedText += 'Please help me understand this file structure or suggest improvements.';
        break;
        
      case 'urls':
        formattedText += '🔗 Links/URLs:\n' + text + '\n\n';
        formattedText += 'Please help me understand or work with these links.';
        break;
        
      default:
        formattedText += text + '\n\n';
        formattedText += 'Please help me understand or work with this content.';
    }
    
    return formattedText;
  };

  // PDF Processing with Text Extraction + OCR Fallback
  const processPDFFile = async (file: File): Promise<{ text: string; pages: number; method: 'text-extraction' | 'ocr' }> => {
    try {
      console.log(`📄 Starting simple PDF processing for ${file.name}...`);
      
      // Simple approach: Send PDF to server for processing via API
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        console.log(`📄 Sending PDF to server for text extraction: ${file.name}...`);
        
        const response = await fetch('/api/pdf/extract-text', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.text && result.text.trim().length > 0) {
          console.log(`✅ Successfully extracted ${result.text.length} characters from ${file.name}`);
          return {
            text: result.text.trim(),
            pages: result.pages || 1,
            method: 'text-extraction'
          };
        }
        
        // If no text found, provide helpful message
        console.log(`⚠️ No extractable text found in ${file.name}`);
        const noTextMessage = `PDF file "${file.name}" was processed but no extractable text was found. This might be a scanned document or image-based PDF. Please try manually copying and pasting the text content, or use an OCR tool to convert it to text first.`;
        
        return {
          text: noTextMessage,
          pages: result.pages || 1,
          method: 'text-extraction'
        };
        
      } catch (extractionError) {
        console.warn(`⚠️ Server text extraction failed for ${file.name}:`, extractionError);
        
        // Return helpful error message
        const errorMessage = `PDF file "${file.name}" (${Math.round(file.size / 1024)}KB) could not be processed by the server. This might be due to:\n\n• PDF is password-protected or corrupted\n• Server PDF processing is not available\n• File is too large or complex\n\nPlease try manually copying and pasting the text content from the PDF.`;
        
        return {
          text: errorMessage,
          pages: 1,
          method: 'text-extraction'
        };
      }
      
    } catch (error) {
      console.error(`❌ PDF processing failed for ${file.name}:`, error);
      
      // Return user-friendly error message
      const errorMessage = `PDF file "${file.name}" (${Math.round(file.size / 1024)}KB) could not be processed. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try manually copying and pasting the text content.`;
      
      return {
        text: errorMessage,
        pages: 1,
        method: 'text-extraction'
      };
    }
  };

  // OCR Fallback for scanned PDFs or when text extraction fails
  const processPDFWithOCR = async (file: File, uint8Array: Uint8Array): Promise<{ text: string; pages: number; method: 'ocr' }> => {
    try {
      // Note: This is a simplified OCR implementation
      // In a full implementation, we would convert PDF pages to images first
      // For now, we'll return a message indicating OCR would be needed
      
      const ocrMessage = `PDF file "${file.name}" appears to be a scanned document or contains images. Text extraction completed but OCR functionality is being enhanced. The document was detected but full OCR processing is not yet available in this version.`;
      
      return {
        text: ocrMessage,
        pages: 1,
        method: 'ocr'
      };
      
    } catch (error) {
      console.error(`❌ OCR processing failed for ${file.name}:`, error);
      throw error;
    }
  };

  // Note: PDF text extraction functions temporarily simplified
  // These will be enhanced in future versions with proper PDF.js integration

  // Format PDF text for Claude Code injection
  const formatPDFTextForClaude = (pdfResult: { text: string; pages: number; method: 'text-extraction' | 'ocr' }, filename: string): string => {
    const { text, pages, method } = pdfResult;
    
    let formattedText = `📄 Text extracted from PDF "${filename}" (${pages} page${pages !== 1 ? 's' : ''}, ${method}):\n\n`;
    
    // Detect content type from PDF text
    const contentType = detectContentType(text);
    
    switch (contentType) {
      case 'code':
        formattedText += '```\n' + text + '\n```\n\n';
        formattedText += 'Please help me understand or work with this code from the PDF.';
        break;
        
      case 'error':
        formattedText += '❌ Error information from PDF:\n```\n' + text + '\n```\n\n';
        formattedText += 'Please help me understand and resolve these errors.';
        break;
        
      default:
        // For PDFs, we'll format with better structure
        formattedText += text + '\n\n';
        formattedText += 'Please help me understand and work with this PDF content.';
    }
    
    return formattedText;
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-[999998]"
        onClick={onClose}
      />

      {/* Composer overlay */}
      <div
        className={`fixed bottom-32 left-1/4 right-1/4 bg-bg-secondary border border-border-primary rounded-lg shadow-2xl z-[999999] transition-all duration-200 ${
          dragActive ? 'ring-2 ring-cyan-500 border-cyan-500' : ''
        }`}
        style={{
          minWidth: '720px',
          maxWidth: '1152px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnter={handleDragEnter}
        onDragEnd={() => {
          // Failsafe: clear overlay when drag ends
          console.log('🔴 Drag ended - clearing overlay');
          dragCounterRef.current = 0;
          setDragActive(false);
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-primary bg-bg-primary/50 rounded-t-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-primary">Staged Command Composer</span>
            {isProcessing && (
              <span className="text-xs text-text-muted animate-pulse">Claude is processing...</span>
            )}
            {isProcessingOCR && (
              <span className="text-xs text-cyan-400 animate-pulse flex items-center gap-1">
                <Eye className="w-3 h-3" />
                OCR extracting text...
              </span>
            )}
            {isProcessingPDF && (
              <span className="text-xs text-orange-400 animate-pulse flex items-center gap-1">
                <FilePlus className="w-3 h-3" />
                PDF processing...
              </span>
            )}
            <span className="text-xs text-text-muted">~{tokenEstimate} tokens</span>
            
            {/* Multi-line mode toggle */}
            <button
              onClick={() => setMultilineMode(!multilineMode)}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${
                multilineMode 
                  ? 'bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30' 
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
              }`}
              title={multilineMode ? 'Switch to single-line mode' : 'Switch to multi-line mode'}
            >
              {multilineMode ? <Minimize className="w-3 h-3" /> : <Expand className="w-3 h-3" />}
              <span>{multilineMode ? 'Multi' : 'Single'}</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg-tertiary rounded transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* User feedback messages */}
        {(errorMessage || successMessage || warningMessage) && (
          <div className="px-4 py-2 border-b border-border-primary">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 mb-2 bg-red-500/10 border border-red-500/20 rounded-md">
                <span className="text-red-400 text-sm">❌</span>
                <span className="text-red-400 text-sm font-medium">{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="flex items-center gap-2 p-3 mb-2 bg-green-500/10 border border-green-500/20 rounded-md">
                <span className="text-green-400 text-sm">✅</span>
                <span className="text-green-400 text-sm font-medium">{successMessage}</span>
              </div>
            )}
            {warningMessage && (
              <div className="flex items-center gap-2 p-3 mb-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <span className="text-yellow-400 text-sm">⚠️</span>
                <span className="text-yellow-400 text-sm font-medium">{warningMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Text area */}
        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              isProcessingOCR ? "🔍 Processing images with OCR... Please wait..." :
              isProcessingPDF ? "📄 Processing PDF files... Please wait..." :
              dragActive ? "🖼️ Drop images or PDFs to extract text automatically..." : 
              multilineMode ? "Type your command here... (Enter for new line, Shift+Enter to send)" :
              "Type your command here... (Enter to send, Shift+Enter for new line, @ for snippets)"
            }
            className={`w-full px-3 py-2 bg-bg-primary border border-border-primary rounded-md text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono text-sm transition-all duration-200 ${
              multilineMode ? 'h-40' : 'h-24'
            }`}
            style={{ 
              minHeight: multilineMode ? '160px' : '96px', 
              pointerEvents: dragActive ? 'none' : 'auto' 
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />

          {/* AI Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-4 right-4 mt-1 bg-bg-secondary border border-border-primary rounded-md shadow-xl max-h-64 overflow-hidden z-50">
              <div className="p-2 border-b border-border-primary">
                <div className="text-xs text-text-muted flex items-center gap-2">
                  <Hash className="w-3 h-3" />
                  AI Suggestions
                  {isLoadingSuggestions && <span className="animate-pulse">Loading...</span>}
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => applySuggestion(suggestion)}
                    className={`w-full px-3 py-2 text-left transition-colors border-b border-border-primary/50 last:border-0 ${
                      index === selectedSuggestion 
                        ? 'bg-cyan-600/20 text-cyan-400' 
                        : 'hover:bg-bg-tertiary'
                    }`}
                  >
                    <div className="text-xs font-mono text-text-primary truncate">
                      {suggestion}
                    </div>
                    <div className="text-xs text-text-muted mt-1">
                      {suggestion.startsWith('git') ? '🔗 Git command' :
                       suggestion.startsWith('npm') ? '📦 NPM command' :
                       suggestion.startsWith('find') ? '🔍 Search command' :
                       suggestion.includes('/') ? '📁 File path' :
                       '💡 Suggestion'}
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-border-primary bg-bg-primary/30">
                <div className="text-xs text-text-muted">
                  Navigate: ↑/↓ • Select: Tab/Enter • Cancel: Esc
                </div>
              </div>
            </div>
          )}

          {/* Image previews */}
          {images.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img.preview}
                    alt={`Upload ${index + 1}`}
                    className="w-20 h-20 object-cover rounded border border-border-primary"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary bg-bg-primary/30 rounded-b-lg">
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) setShowTemplates(false);
              }}
              className="flex items-center gap-1 hover:text-text-primary transition-colors"
            >
              <Clock className="w-3 h-3" />
              History
              <ChevronDown className={`w-3 h-3 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => {
                setShowTemplates(!showTemplates);
                if (!showTemplates) setShowHistory(false);
              }}
              className="flex items-center gap-1 hover:text-text-primary transition-colors"
            >
              <FileText className="w-3 h-3" />
              Templates
              <ChevronDown className={`w-3 h-3 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => {
                loadSnippets();
                setShowSnippetManager(!showSnippetManager);
                if (!showSnippetManager) {
                  setShowHistory(false);
                  setShowTemplates(false);
                }
              }}
              className="flex items-center gap-1 hover:text-text-primary transition-colors"
            >
              <Bookmark className="w-3 h-3" />
              Snippets
              <ChevronDown className={`w-3 h-3 transition-transform ${showSnippetManager ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Undo/Redo buttons */}
            <button
              onClick={() => {
                console.log('🖱️ UNDO BUTTON CLICKED');
                handleUndo();
              }}
              disabled={undoStack.length === 0}
              className="flex items-center gap-1 hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Undo (Ctrl+Z) - ${undoStack.length} actions available`}
            >
              <Undo2 className="w-3 h-3" />
              <span className="text-xs">({undoStack.length})</span>
            </button>
            <button
              onClick={() => {
                console.log('🖱️ REDO BUTTON CLICKED');
                handleRedo();
              }}
              disabled={redoStack.length === 0}
              className="flex items-center gap-1 hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Redo (Ctrl+Shift+Z) - ${redoStack.length} actions available`}
            >
              <Redo2 className="w-3 h-3" />
              <span className="text-xs">({redoStack.length})</span>
            </button>
            {onPlanningModeToggle && (
              <button
                onClick={onPlanningModeToggle}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                  planningMode 
                    ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30' 
                    : 'hover:text-text-primary'
                }`}
              >
                <GitBranch className="w-3 h-3" />
                <span>{planningMode ? 'Planning On' : 'Planning'}</span>
              </button>
            )}
            {images.length > 0 && (
              <span className="flex items-center gap-1 text-cyan-500">
                <ImageIcon className="w-3 h-3" />
                {images.length} image{images.length !== 1 ? 's' : ''} attached
              </span>
            )}
            {ocrResults.length > 0 && (
              <span className="flex items-center gap-1 text-green-500">
                <Eye className="w-3 h-3" />
                {ocrResults.length} text{ocrResults.length !== 1 ? 's' : ''} extracted
              </span>
            )}
            {pdfResults.length > 0 && (
              <span className="flex items-center gap-1 text-orange-500">
                <FilePlus className="w-3 h-3" />
                {pdfResults.length} PDF{pdfResults.length !== 1 ? 's' : ''} processed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {command.trim() && (
              <button
                onClick={() => setShowSnippetManager(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-bg-tertiary hover:bg-bg-secondary text-text-secondary hover:text-text-primary rounded transition-colors"
                title="Save as snippet"
              >
                <Save className="w-3 h-3" />
                Save
              </button>
            )}
            
            {/* Voice input button */}
            <button
              onClick={toggleVoiceRecognition}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                voiceListening 
                  ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' 
                  : 'bg-bg-tertiary hover:bg-bg-secondary text-text-secondary hover:text-text-primary'
              }`}
              title={voiceListening ? 'Stop voice input' : 'Start voice input'}
            >
              {voiceListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              {voiceListening && <span>Listening</span>}
            </button>
            
            <button
              onClick={handleSend}
              disabled={!command.trim() && images.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>

        {/* Template dropdown panel */}
        {showTemplates && (
          <div className="absolute bottom-full mb-2 left-0 right-0 bg-bg-secondary border border-border-primary rounded-lg shadow-xl max-h-64 overflow-hidden">
            <div className="p-2 border-b border-border-primary">
              <div className="text-xs text-text-muted">Select a template to get started quickly</div>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {templates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => applyTemplate(template.template)}
                  className="w-full px-3 py-2 text-left hover:bg-bg-tertiary transition-colors border-b border-border-primary/50 last:border-0"
                >
                  <div className="text-xs font-medium text-text-primary">{template.name}</div>
                  <div className="text-xs text-text-muted mt-1 font-mono truncate">
                    {template.template}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* History dropdown panel */}
        {showHistory && (
          <div className="absolute bottom-full mb-2 left-0 right-0 bg-bg-secondary border border-border-primary rounded-lg shadow-xl max-h-64 overflow-hidden">
            <div className="p-2 border-b border-border-primary">
              <input
                type="text"
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => {
                  setHistorySearch(e.target.value);
                  searchHistory(e.target.value);
                }}
                className="w-full px-2 py-1 bg-bg-primary border border-border-primary rounded text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-3 text-center text-xs text-text-muted">No command history yet</div>
              ) : (
                history.map((entry, index) => (
                  <button
                    key={entry.id}
                    onClick={() => {
                      setCommand(entry.command);
                      setShowHistory(false);
                      setHistoryIndex(index);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-bg-tertiary transition-colors border-b border-border-primary/50 last:border-0"
                  >
                    <div className="text-xs text-text-primary truncate font-mono">
                      {entry.command}
                    </div>
                    <div className="text-xs text-text-muted mt-1 flex items-center gap-2">
                      <span>{new Date(entry.timestamp).toLocaleString()}</span>
                      {entry.hasImages && <span className="text-cyan-500">📷</span>}
                      {entry.tokenCount && <span>{entry.tokenCount} tokens</span>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Snippets dropdown panel */}
        {showSnippetManager && (
          <div className="absolute bottom-full mb-2 left-0 right-0 bg-bg-secondary border border-border-primary rounded-lg shadow-xl max-h-80 overflow-hidden">
            {/* Header with search and save */}
            <div className="p-3 border-b border-border-primary">
              <div className="flex items-center gap-2 mb-2">
                <Bookmark className="w-4 h-4 text-text-muted" />
                <span className="text-sm font-medium text-text-primary">Command Snippets</span>
                <span className="text-xs text-text-muted">({snippets.length})</span>
              </div>
              
              {/* Search */}
              <input
                type="text"
                placeholder="Search snippets..."
                value={snippetSearch}
                onChange={(e) => {
                  setSnippetSearch(e.target.value);
                  searchSnippets(e.target.value);
                }}
                className="w-full px-2 py-1 mb-2 bg-bg-primary border border-border-primary rounded text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              
              {/* Save new snippet */}
              {command.trim() && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Snippet name..."
                    value={newSnippetName}
                    onChange={(e) => setNewSnippetName(e.target.value)}
                    className="flex-1 px-2 py-1 bg-bg-primary border border-border-primary rounded text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <select
                    value={newSnippetCategory}
                    onChange={(e) => setNewSnippetCategory(e.target.value)}
                    className="px-2 py-1 bg-bg-primary border border-border-primary rounded text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {commandSnippetsService.getCategories().map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button
                    onClick={saveAsSnippet}
                    disabled={!newSnippetName.trim()}
                    className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Snippets list */}
            <div className="max-h-48 overflow-y-auto">
              {snippets.length === 0 ? (
                <div className="p-3 text-center text-xs text-text-muted">
                  {snippetSearch ? 'No snippets found' : 'No snippets yet. Type @ to use snippets.'}
                </div>
              ) : (
                snippets.map((snippet, index) => (
                  <button
                    key={snippet.id}
                    onClick={() => applySnippet(snippet)}
                    className="w-full px-3 py-2 text-left hover:bg-bg-tertiary transition-colors border-b border-border-primary/50 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-text-primary">{snippet.name}</div>
                      <div className="flex items-center gap-1 text-xs text-text-muted">
                        <span className="px-1 rounded bg-bg-tertiary">{snippet.category}</span>
                        {snippet.useCount > 0 && <span>({snippet.useCount}x)</span>}
                      </div>
                    </div>
                    <div className="text-xs text-text-muted mt-1 font-mono truncate">
                      {snippet.command}
                    </div>
                    {snippet.description && (
                      <div className="text-xs text-text-muted mt-1 opacity-75">
                        {snippet.description}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
            
            <div className="p-2 border-t border-border-primary bg-bg-primary/30">
              <div className="text-xs text-text-muted">
                Type @ followed by keywords to quickly find snippets
              </div>
            </div>
          </div>
        )}

        {/* @snippets dropdown (when typing @) */}
        {showSnippets && snippets.length > 0 && (
          <div className="absolute left-4 right-4 mt-1 bg-bg-secondary border border-border-primary rounded-md shadow-xl max-h-64 overflow-hidden z-50">
            <div className="p-2 border-b border-border-primary">
              <div className="text-xs text-text-muted flex items-center gap-2">
                <Bookmark className="w-3 h-3" />
                Snippets ({snippets.length})
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {snippets.map((snippet, index) => (
                <button
                  key={snippet.id}
                  onClick={() => applySnippet(snippet)}
                  className={`w-full px-3 py-2 text-left transition-colors border-b border-border-primary/50 last:border-0 ${
                    index === selectedSnippet 
                      ? 'bg-cyan-600/20 text-cyan-400' 
                      : 'hover:bg-bg-tertiary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-text-primary">{snippet.name}</div>
                    <div className="text-xs text-text-muted px-1 rounded bg-bg-tertiary">
                      {snippet.category}
                    </div>
                  </div>
                  <div className="text-xs font-mono text-text-muted mt-1 truncate">
                    {snippet.command}
                  </div>
                </button>
              ))}
            </div>
            <div className="p-2 border-t border-border-primary bg-bg-primary/30">
              <div className="text-xs text-text-muted">
                Navigate: ↑/↓ • Select: Tab/Enter • Cancel: Esc
              </div>
            </div>
          </div>
        )}

        {/* Simple overlay - purely visual, no event handlers */}
        {dragActive && (
          <div className="absolute inset-0 rounded-lg flex items-center justify-center border-2 border-dashed border-cyan-400 bg-cyan-500/10 z-50 pointer-events-none">
            <div className="bg-cyan-500/90 text-white px-6 py-3 rounded-lg shadow-lg">
              <div className="flex items-center gap-2 text-lg font-medium">
                🖼️📄 Drop images or PDFs to extract text
              </div>
              <div className="text-sm opacity-90 text-center mt-1">
                AI will automatically read text and inject it into your command
              </div>
            </div>
          </div>
        )}
        
        {/* Debug indicator - always visible to show drag state */}
        <div className="absolute top-1 right-1 text-xs bg-black/70 text-white px-2 py-1 rounded pointer-events-none z-[100]">
          Drag: {dragActive ? '✅ ON' : '⭕ OFF'}
        </div>
      </div>
    </>
  );
}