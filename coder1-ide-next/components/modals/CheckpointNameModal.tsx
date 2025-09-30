'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Save } from 'lucide-react';

interface CheckpointNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  isLoading?: boolean;
}

export default function CheckpointNameModal({
  isOpen,
  onClose,
  onSave,
  isLoading = false
}: CheckpointNameModalProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset input when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
    }
  }, [isOpen]);

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
    onSave(name.trim());
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
                  <Save className="w-4 h-4" />
                  Save Checkpoint
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}