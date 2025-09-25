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

  // Add document-level listeners for drag events
  useEffect(() => {
    const handleDocumentDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('📄 Document dragenter detected');
      
      // Check if dragging files
      if (e.dataTransfer?.types?.includes('Files')) {
        setDragCounter(prev => {
          const newCount = prev + 1;
          console.log(`📄 Document drag counter: ${prev} -> ${newCount}`);
          if (newCount === 1) {
            console.log('📄 Setting isDragging to true');
            setIsDragging(true);
          }
          return newCount;
        });
      }
    };
    
    const handleDocumentDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };
    
    const handleDocumentDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      setDragCounter(prev => {
        const newCount = Math.max(0, prev - 1);
        console.log(`📄 Document drag leave counter: ${prev} -> ${newCount}`);
        if (newCount === 0) {
          console.log('📄 Setting isDragging to false');
          setIsDragging(false);
        }
        return newCount;
      });
    };
    
    const handleDocumentDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('📄 Document drop detected');
      setIsDragging(false);
      setDragCounter(0);
      
      if (e.dataTransfer?.files?.length) {
        const files = Array.from(e.dataTransfer.files);
        console.log(`📄 Document drop: ${files.length} file(s)`);
        files.forEach((file, index) => {
          console.log(`  File ${index + 1}: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)}KB)`);
        });
        onFileDrop(files);
        
        if (onTextInsert) {
          const fileList = files.map(f => `# File: ${f.name} (${(f.size / 1024).toFixed(1)}KB)`).join('\n');
          onTextInsert(fileList);
        }
      }
    };

    // Add listeners at document level
    document.addEventListener('dragenter', handleDocumentDragEnter, false);
    document.addEventListener('dragover', handleDocumentDragOver, false);
    document.addEventListener('dragleave', handleDocumentDragLeave, false);
    document.addEventListener('drop', handleDocumentDrop, false);
    
    return () => {
      document.removeEventListener('dragenter', handleDocumentDragEnter);
      document.removeEventListener('dragover', handleDocumentDragOver);
      document.removeEventListener('dragleave', handleDocumentDragLeave);
      document.removeEventListener('drop', handleDocumentDrop);
    };
  }, [onFileDrop, onTextInsert]);

  // Note: We primarily use document-level listeners above
  // These component-level handlers are kept as fallback

  return (
    <div
      className="fixed inset-0"
      style={{ 
        zIndex: 50000,
        backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        transition: 'background-color 0.2s',
        // Only block interaction when showing visual feedback
        pointerEvents: isDragging ? 'auto' : 'none'
      }}
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