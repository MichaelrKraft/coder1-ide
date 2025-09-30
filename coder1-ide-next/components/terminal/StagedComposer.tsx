'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Clock, Hash, FileText, Image as ImageIcon, ChevronDown, GitBranch, Eye, FilePlus } from 'lucide-react';
import { commandHistoryService, CommandHistoryEntry } from '@/services/command-history-service';
import { createWorker } from 'tesseract.js';

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
    }
  }, [currentCommand]);

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
    }
  }, [isVisible, sessionId]);

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
    // Ctrl/Cmd + Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
    // Escape to close
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
    // Up arrow for previous command in history
    if (e.key === 'ArrowUp' && !e.shiftKey) {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(history[newIndex].command);
      }
    }
    // Down arrow for next command in history
    if (e.key === 'ArrowDown' && !e.shiftKey) {
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
      console.log(`🔍 Starting OCR processing for ${file.name}...`);
      
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(file);
      await worker.terminate();
      
      const extractedText = data.text.trim();
      const confidence = data.confidence;
      
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
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg-tertiary rounded transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

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
              "Type or paste your command here... (Drag images/PDFs to extract text)"
            }
            className="w-full h-24 px-3 py-2 bg-bg-primary border border-border-primary rounded-md text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono text-sm"
            style={{ minHeight: '96px', pointerEvents: dragActive ? 'none' : 'auto' }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />

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