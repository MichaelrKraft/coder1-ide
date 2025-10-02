'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Brain, Sparkles } from 'lucide-react';
import type { MemoryDetectionResult } from '@/lib/memory-detection-client';

interface CheckpointNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, createMemory?: boolean, memoryData?: { title: string; description: string; tags: string[] }) => void;
  isLoading?: boolean;
  memoryDetection?: MemoryDetectionResult | null;
}

export default function CheckpointNameModal({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
  memoryDetection = null
}: CheckpointNameModalProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Memory creation state
  const [createMemory, setCreateMemory] = useState(false);
  const [memoryTitle, setMemoryTitle] = useState('');
  const [memoryDescription, setMemoryDescription] = useState('');
  const [memoryTags, setMemoryTags] = useState('');

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset inputs when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setCreateMemory(false);
      setMemoryTitle('');
      setMemoryDescription('');
      setMemoryTags('');
    }
  }, [isOpen]);
  
  // Auto-populate memory fields when detection changes
  useEffect(() => {
    if (memoryDetection?.isMemoryWorthy && isOpen) {
      setCreateMemory(memoryDetection.autoGenerationRecommended);
      setMemoryTitle(memoryDetection.suggestedMemoryTitle);
      setMemoryDescription(memoryDetection.suggestedMemoryDescription);
      
      // Convert events to tags
      const allTags = memoryDetection.events.flatMap(event => event.suggestedTags);
      const uniqueTags = [...new Set(allTags)];
      setMemoryTags(uniqueTags.join(', '));
    }
  }, [memoryDetection, isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, name]);

  const handleSave = () => {
    const memoryData = createMemory ? {
      title: memoryTitle.trim(),
      description: memoryDescription.trim(),
      tags: memoryTags.split(',').map(tag => tag.trim()).filter(Boolean)
    } : undefined;
    
    onSave(name.trim(), createMemory, memoryData);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
        <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-2xl w-full max-w-md">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
            <h2 className="text-lg font-semibold text-text-primary">
              Name Your Checkpoint
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-bg-tertiary rounded transition-colors"
              disabled={isLoading}
            >
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="mb-4">
              <label 
                htmlFor="checkpoint-name" 
                className="block text-sm font-medium text-text-primary mb-2"
              >
                Checkpoint Name (optional)
              </label>
              <input
                ref={inputRef}
                id="checkpoint-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Added user authentication, Fixed navigation bug..."
                className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                disabled={isLoading}
                maxLength={100}
              />
              <p className="text-xs text-text-muted mt-1">
                Leave empty for default timestamp-based name
              </p>
            </div>

            <div className="text-xs text-text-muted mb-4">
              {name.trim() ? (
                <>
                  <strong>Preview:</strong> "{name.trim()}" - {new Date().toLocaleDateString('en-US')} {new Date().toLocaleTimeString()}
                </>
              ) : (
                <>
                  <strong>Default:</strong> Checkpoint {new Date().toLocaleDateString('en-US')} {new Date().toLocaleTimeString()}
                </>
              )}
            </div>
            
            {/* Memory Creation Section */}
            {memoryDetection?.isMemoryWorthy && (
              <div className="border-t border-border-primary pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-medium text-text-primary">Memory Creation</h3>
                  <span className="px-2 py-1 bg-cyan-600/20 text-cyan-300 text-xs rounded-full">
                    {Math.round(memoryDetection.confidence * 100)}% confidence
                  </span>
                </div>
                
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="create-memory"
                    checked={createMemory}
                    onChange={(e) => setCreateMemory(e.target.checked)}
                    className="mt-1 w-4 h-4 text-cyan-600 bg-bg-tertiary border-border-primary rounded focus:ring-cyan-500"
                    disabled={isLoading}
                  />
                  <div className="flex-1">
                    <label htmlFor="create-memory" className="text-sm font-medium text-text-primary cursor-pointer">
                      Create Memory from this Session
                    </label>
                    <p className="text-xs text-text-muted mt-1">
                      AI detected {memoryDetection.events.length} memory-worthy event(s): {memoryDetection.events.map(e => e.type).join(', ')}
                    </p>
                  </div>
                </div>
                
                {createMemory && (
                  <div className="space-y-3 pl-7">
                    <div>
                      <label htmlFor="memory-title" className="block text-xs font-medium text-text-primary mb-1">
                        Memory Title
                      </label>
                      <input
                        id="memory-title"
                        type="text"
                        value={memoryTitle}
                        onChange={(e) => setMemoryTitle(e.target.value)}
                        placeholder="Descriptive title for this learning moment..."
                        className="w-full px-2 py-1 text-xs bg-bg-tertiary border border-border-primary rounded text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="memory-description" className="block text-xs font-medium text-text-primary mb-1">
                        Memory Description
                      </label>
                      <textarea
                        id="memory-description"
                        value={memoryDescription}
                        onChange={(e) => setMemoryDescription(e.target.value)}
                        placeholder="What was learned or accomplished in this session..."
                        rows={2}
                        className="w-full px-2 py-1 text-xs bg-bg-tertiary border border-border-primary rounded text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="memory-tags" className="block text-xs font-medium text-text-primary mb-1">
                        Tags
                      </label>
                      <input
                        id="memory-tags"
                        type="text"
                        value={memoryTags}
                        onChange={(e) => setMemoryTags(e.target.value)}
                        placeholder="bug-fix, feature, learning, breakthrough..."
                        className="w-full px-2 py-1 text-xs bg-bg-tertiary border border-border-primary rounded text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        disabled={isLoading}
                      />
                      <p className="text-xs text-text-muted mt-1">
                        Comma-separated tags for organization
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-border-primary bg-bg-primary/30">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {createMemory ? <Sparkles className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {createMemory ? 'Save Checkpoint + Memory' : 'Save Checkpoint'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}