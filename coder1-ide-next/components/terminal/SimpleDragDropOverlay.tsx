'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Upload } from 'lucide-react';

interface SimpleDragDropOverlayProps {
  onFileDrop: (files: File[]) => void;
  onTextInsert?: (text: string) => void;
  isProcessing?: boolean;
}

export default function SimpleDragDropOverlay({ 
  onFileDrop, 
  onTextInsert,
  isProcessing = false
}: SimpleDragDropOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  useEffect(() => {
    console.log('✅ SimpleDragDropOverlay mounted');
    return () => {
      console.log('❌ SimpleDragDropOverlay unmounted');
    };
  }, []);

  // Prevent default drag behavior globally
  useEffect(() => {
    const preventDefault = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Add listeners to prevent browser default behavior
    document.addEventListener('dragover', preventDefault, false);
    document.addEventListener('drop', preventDefault, false);
    
    return () => {
      document.removeEventListener('dragover', preventDefault);
      document.removeEventListener('drop', preventDefault);
    };
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎯 SimpleDragDropOverlay: dragEnter event triggered');
    
    setDragCounter(prev => {
      const newCount = prev + 1;
      console.log(`🎯 Drag counter: ${prev} -> ${newCount}`);
      if (newCount === 1) {
        console.log('🎯 Setting isDragging to true');
        setIsDragging(true);
      }
      return newCount;
    });
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => {
      const newCount = Math.max(0, prev - 1);
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    console.log('🎯 SimpleDragDropOverlay: dragOver event');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    console.log('🎯 SimpleDragDropOverlay: drop event triggered');
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(false);
    setDragCounter(0);
    
    const files = Array.from(e.dataTransfer.files);
    console.log(`🎯 Files detected: ${files.length}`);
    
    if (files.length > 0) {
      console.log(`📎 Received ${files.length} file(s) via drag-and-drop`);
      files.forEach((file, index) => {
        console.log(`  File ${index + 1}: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)}KB)`);
      });
      onFileDrop(files);
      
      // Insert file names into terminal if handler provided
      if (onTextInsert) {
        const fileList = files.map(f => `# File: ${f.name} (${(f.size / 1024).toFixed(1)}KB)`).join('\n');
        onTextInsert(fileList);
      }
    } else {
      console.log('⚠️ No files in drop event');
    }
  }, [onFileDrop, onTextInsert]);

  return (
    <div
      className={`fixed inset-0 ${isDragging ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{ 
        zIndex: 50000,
        backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        transition: 'background-color 0.2s'
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="h-full w-full flex items-center justify-center">
          <div className="bg-gray-800 border-2 border-dashed border-blue-500 rounded-lg p-8 shadow-2xl">
            <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
            <p className="text-lg font-semibold text-white">Drop files here for Claude Code</p>
            <p className="text-sm text-gray-400 mt-2">
              Images (PNG, JPEG) • Documents (PDF) • Code files • Text files
            </p>
          </div>
        </div>
      )}
    </div>
  );
}