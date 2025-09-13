'use client';

import React, { useState, useEffect } from 'react';
import { X, GitBranch, FileText, Clock } from 'lucide-react';
import { 
  getSessionTypes, 
  SESSION_TYPES, 
  SessionType, 
  generateSessionNameSuggestions,
  formatSessionDate,
  NameSuggestionContext 
} from '@/lib/session-types';
import { GitContext } from '@/lib/git-context';

interface EnhancedSessionCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSession: (sessionType: string, name: string, description?: string, context?: any) => Promise<void>;
}

export default function EnhancedSessionCreationModal({
  isOpen,
  onClose,
  onCreateSession
}: EnhancedSessionCreationModalProps) {
  // Modal state
  const [step, setStep] = useState<'type' | 'name' | 'context'>('type');
  const [selectedType, setSelectedType] = useState<SessionType | null>(null);
  const [sessionName, setSessionName] = useState<string>('');
  const [sessionDescription, setSessionDescription] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  
  // Context and suggestions
  const [gitContext, setGitContext] = useState<GitContext | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState<boolean>(false);

  // Load git context when modal opens
  useEffect(() => {
    if (isOpen && !gitContext) {
      setIsLoadingContext(true);
      fetch('/api/git-context')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setGitContext(data.context);
          }
          setIsLoadingContext(false);
        })
        .catch(() => {
          setIsLoadingContext(false);
        });
    }
  }, [isOpen, gitContext]);

  // Generate name suggestions when session type is selected
  useEffect(() => {
    if (selectedType && gitContext) {
      const suggestionContext: NameSuggestionContext = {
        gitBranch: gitContext.branch,
        recentCommits: gitContext.recentCommits,
        modifiedFiles: gitContext.modifiedFiles,
        workingDirectory: gitContext.workingDirectory
      };
      
      const suggestions = generateSessionNameSuggestions(selectedType, suggestionContext);
      setNameSuggestions(suggestions);
      
      // Auto-select first suggestion as default
      if (suggestions.length > 0) {
        setSessionName(suggestions[0]);
      }
    }
  }, [selectedType, gitContext]);

  // Reset modal state when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('type');
        setSelectedType(null);
        setSessionName('');
        setSessionDescription('');
        setCustomName('');
        setNameSuggestions([]);
        setIsCreating(false);
      }, 300); // Delay to allow animation
    }
  }, [isOpen]);

  const handleTypeSelection = (type: SessionType) => {
    setSelectedType(type);
    setStep('name');
  };

  const handleNameSelection = (name: string) => {
    console.log('📝 handleNameSelection called with:', name);
    setSessionName(name);
    setCustomName(''); // Clear custom name when suggestion is selected
    console.log('✅ Session name set to:', name);
  };

  const handleCustomNameChange = (name: string) => {
    setCustomName(name);
    setSessionName(name); // Update session name with custom input
  };

  const handleNext = () => {
    console.log('🔄 handleNext called');
    console.log('Current step:', step);
    console.log('Session name:', sessionName);
    console.log('Session name trimmed:', sessionName.trim());
    
    if (step === 'name' && sessionName.trim()) {
      console.log('✅ Moving to context step');
      setStep('context');
    } else {
      console.log('❌ Cannot proceed - session name is empty or wrong step');
    }
  };

  const handleBack = () => {
    if (step === 'name') {
      setStep('type');
    } else if (step === 'context') {
      setStep('name');
    }
  };

  const handleCreateSession = async () => {
    if (!selectedType || !sessionName.trim()) return;
    
    console.log('🚀 Starting session creation from modal...');
    setIsCreating(true);
    
    try {
      const contextData = {
        sessionType: selectedType.id,
        gitContext,
        workingDirectory: gitContext?.workingDirectory || '/workspace',
        createdAt: new Date().toISOString()
      };
      
      console.log('📝 Calling onCreateSession with:', { 
        type: selectedType.id, 
        name: sessionName.trim(),
        description: sessionDescription.trim()
      });
      
      await onCreateSession(
        selectedType.id,
        sessionName.trim(),
        sessionDescription.trim() || undefined,
        contextData
      );
      
      console.log('✅ Session created successfully, closing modal...');
      
      // Reset modal state
      setStep('type');
      setSelectedType(null);
      setSessionName('');
      setSessionDescription('');
      setCustomName('');
      
      onClose();
    } catch (error) {
      console.error('❌ Failed to create enhanced session:', error);
      // Add user-visible error feedback
      alert(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in-0 duration-300">
      <div className="bg-bg-primary border border-border-primary rounded-lg shadow-xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-primary">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-coder1-cyan/10 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-coder1-cyan">+</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Create New Session</h2>
              <p className="text-sm text-text-secondary">Set up your contextual workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === 'type' ? 'bg-coder1-cyan text-black' : 'bg-bg-secondary text-text-secondary'
              }`}>
                1
              </div>
              <div className="w-8 h-0.5 bg-bg-secondary"></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === 'name' ? 'bg-coder1-cyan text-black' : step === 'context' ? 'bg-coder1-cyan/50 text-text-primary' : 'bg-bg-secondary text-text-secondary'
              }`}>
                2
              </div>
              <div className="w-8 h-0.5 bg-bg-secondary"></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === 'context' ? 'bg-coder1-cyan text-black' : 'bg-bg-secondary text-text-secondary'
              }`}>
                3
              </div>
            </div>
          </div>

          {/* Step 1: Session Type Selection */}
          {step === 'type' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium text-text-primary mb-2">Choose Session Type</h3>
                <p className="text-sm text-text-secondary">What kind of work will you be doing?</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {getSessionTypes().map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleTypeSelection(type)}
                    className={`p-4 rounded-lg border transition-all text-left hover:border-coder1-cyan/50 hover:bg-bg-secondary/50 ${
                      selectedType?.id === type.id 
                        ? 'border-coder1-cyan bg-coder1-cyan/5' 
                        : 'border-border-primary bg-bg-secondary/20'
                    }`}
                  >
                    <div className="text-sm font-medium text-text-primary mb-1">{type.name}</div>
                    <div className="text-xs text-text-secondary">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Session Name */}
          {step === 'name' && selectedType && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium text-text-primary mb-2">Name Your Session</h3>
                <p className="text-sm text-text-secondary">Choose from suggestions or create your own</p>
              </div>

              {/* Selected Type Display */}
              <div className="flex items-center gap-3 p-3 bg-bg-secondary/30 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-text-primary">{selectedType.name}</div>
                  <div className="text-xs text-text-secondary">{selectedType.description}</div>
                </div>
              </div>

              {/* Context Loading */}
              {isLoadingContext && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <div className="w-4 h-4 border-2 border-coder1-cyan/30 border-t-coder1-cyan rounded-full animate-spin"></div>
                  Analyzing current context...
                </div>
              )}

              {/* Name Suggestions */}
              {nameSuggestions.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Suggested Names</label>
                  <div className="space-y-2">
                    {nameSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleNameSelection(suggestion)}
                        className={`w-full p-3 text-left rounded-lg border transition-all ${
                          sessionName === suggestion && !customName
                            ? 'border-coder1-cyan bg-coder1-cyan/5 text-text-primary'
                            : 'border-border-primary bg-bg-secondary/20 text-text-secondary hover:border-coder1-cyan/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{suggestion}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Or Enter Custom Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => handleCustomNameChange(e.target.value)}
                  placeholder="Enter custom session name..."
                  className="w-full p-3 bg-bg-secondary border border-border-primary rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-coder1-cyan/50 focus:border-coder1-cyan"
                />
              </div>

              {/* Current Selection Display */}
              {sessionName && (
                <div className="p-3 bg-coder1-cyan/5 border border-coder1-cyan/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-secondary">Selected:</span>
                    <span className="font-medium text-text-primary">{sessionName}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Context & Notes */}
          {step === 'context' && selectedType && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium text-text-primary mb-2">Add Context</h3>
                <p className="text-sm text-text-secondary">Optional notes about your session</p>
              </div>

              {/* Session Summary */}
              <div className="p-4 bg-bg-secondary/30 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium text-text-primary">{sessionName}</div>
                    <div className="text-sm text-text-secondary">{selectedType.name}</div>
                  </div>
                </div>

                {/* Git Context Display */}
                {gitContext && (
                  <div className="flex flex-wrap gap-4 text-xs">
                    {gitContext.branch && (
                      <div className="flex items-center gap-1 text-text-secondary">
                        <GitBranch className="w-3 h-3" />
                        <span>{gitContext.branch}</span>
                      </div>
                    )}
                    {gitContext.modifiedFiles.length > 0 && (
                      <div className="flex items-center gap-1 text-text-secondary">
                        <FileText className="w-3 h-3" />
                        <span>{gitContext.modifiedFiles.length} files modified</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-text-secondary">
                      <Clock className="w-3 h-3" />
                      <span>{formatSessionDate()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Session Notes (Optional)</label>
                <textarea
                  value={sessionDescription}
                  onChange={(e) => setSessionDescription(e.target.value)}
                  placeholder="Add notes about what you'll be working on..."
                  rows={3}
                  className="w-full p-3 bg-bg-secondary border border-border-primary rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-coder1-cyan/50 focus:border-coder1-cyan resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border-primary">
          <div className="flex items-center gap-2">
            {step !== 'type' && (
              <button
                onClick={handleBack}
                disabled={isCreating}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              >
                ← Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            
            {step === 'name' && (
              <button
                onClick={handleNext}
                disabled={!sessionName.trim() || isCreating}
                className="px-4 py-2 bg-coder1-cyan text-black font-medium rounded-lg text-sm hover:bg-coder1-cyan-secondary transition-colors disabled:opacity-50"
              >
                Next →
              </button>
            )}
            
            {step === 'context' && (
              <button
                onClick={() => {
                  console.log('🔘 Create Session button clicked!');
                  console.log('Session name:', sessionName);
                  console.log('Selected type:', selectedType);
                  console.log('Is creating:', isCreating);
                  console.log('Button disabled?', !sessionName || !sessionName.trim() || isCreating);
                  if (!sessionName || !sessionName.trim()) {
                    console.error('❌ Session name is empty!');
                    return;
                  }
                  handleCreateSession();
                }}
                disabled={!sessionName || !sessionName.trim() || isCreating}
                className="px-4 py-2 bg-coder1-cyan text-black font-medium rounded-lg text-sm hover:bg-coder1-cyan-secondary transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isCreating && (
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                )}
                {isCreating ? 'Creating...' : 'Create Session'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}