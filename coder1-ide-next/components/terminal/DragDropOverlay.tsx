'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Upload } from 'lucide-react';

interface DragDropOverlayProps {
  onFileDrop: (files: File[]) => void;
  onTextInsert?: (text: string) => void;
  isProcessing?: boolean;
}

export default function DragDropOverlay({ 
  onFileDrop, 
  onTextInsert,
  isProcessing = false
}: DragDropOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('🚀 DragDropOverlay initialized');
    
    // Use capture phase for better event interception
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Only respond to file drags
      if (!e.dataTransfer?.types?.includes('Files')) return;
      
      dragCounterRef.current++;
      console.log(`📈 Drag enter - counter: ${dragCounterRef.current}`);
      
      if (dragCounterRef.current === 1) {
        console.log('✨ Showing drag overlay');
        setIsDragging(true);
      }
    };
    
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      dragCounterRef.current--;
      console.log(`📉 Drag leave - counter: ${dragCounterRef.current}`);
      
      if (dragCounterRef.current === 0) {
        console.log('👋 Hiding drag overlay');
        setIsDragging(false);
      }
    };
    
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      dragCounterRef.current = 0;
      setIsDragging(false);
      
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) {
        console.log('⚠️ No files in drop event');
        return;
      }
      
      const fileArray = Array.from(files);
      console.log(`🎉 Dropped ${fileArray.length} file(s):`);
      
      fileArray.forEach((file, i) => {
        console.log(`  📄 ${i + 1}. ${file.name} (${file.type || 'unknown'}, ${(file.size / 1024).toFixed(1)}KB)`);
      });
      
      // Process the files
      onFileDrop(fileArray);
      
      // Insert file info into terminal if handler provided
      if (onTextInsert) {
        const fileInfo = fileArray.map(f => {
          const ext = f.name.split('.').pop()?.toLowerCase();
          const icon = ext === 'pdf' ? '📑' : 
                      ['png', 'jpg', 'jpeg', 'gif'].includes(ext || '') ? '🖼️' : '📄';
          return `${icon} ${f.name} (${(f.size / 1024).toFixed(1)}KB)`;
        }).join('\n');
        
        onTextInsert(`# Files received via drag-and-drop:\n${fileInfo}`);
      }
    };
    
    // Use window instead of document for better compatibility
    // Use capture phase (true) to intercept events early
    window.addEventListener('dragenter', handleDragEnter, true);
    window.addEventListener('dragleave', handleDragLeave, true);
    window.addEventListener('dragover', handleDragOver, true);
    window.addEventListener('drop', handleDrop, true);
    
    console.log('✅ Drag-drop event listeners attached to window');
    
    return () => {
      window.removeEventListener('dragenter', handleDragEnter, true);
      window.removeEventListener('dragleave', handleDragLeave, true);
      window.removeEventListener('dragover', handleDragOver, true);
      window.removeEventListener('drop', handleDrop, true);
      console.log('🧹 Drag-drop event listeners removed');
    };
  }, [onFileDrop, onTextInsert]);
  
  // Log state changes
  useEffect(() => {
    console.log(`🎨 Drag state changed: isDragging = ${isDragging}`);
  }, [isDragging]);

  return (
    <>
      {/* Main overlay that shows when dragging */}
      {isDragging && (
        <div 
          ref={overlayRef}
          className="fixed inset-0 z-[99999] pointer-events-auto"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            backdropFilter: 'blur(2px)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div className="h-full w-full flex items-center justify-center">
            <div 
              className="bg-gray-900/95 border-2 border-dashed border-blue-500 rounded-xl p-12 shadow-2xl transform transition-transform"
              style={{
                animation: 'slideUp 0.3s ease-out',
                boxShadow: '0 0 40px rgba(59, 130, 246, 0.5)'
              }}
            >
              <Upload className="w-20 h-20 text-blue-400 mx-auto mb-6 animate-pulse" />
              <h2 className="text-3xl font-bold text-white mb-3 text-center">
                📎 Drop Files Here
              </h2>
              <p className="text-xl text-yellow-300 text-center mb-2 font-semibold">
                ⚠️ Important: Copy-Paste Required
              </p>
              <p className="text-base text-blue-200 text-center mb-4 max-w-md mx-auto">
                After dropping, you'll need to copy the formatted content
                and paste it into your Claude Code conversation
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                  🖼️ Images (PNG, JPEG, GIF)
                </span>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                  📑 Documents (PDF)
                </span>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                  📝 Code & Text Files
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Processing indicator */}
      {isProcessing && (
        <div className="fixed bottom-4 right-4 z-[99999] bg-gray-900 border border-blue-500 rounded-lg p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
            <span className="text-white">Processing files...</span>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}