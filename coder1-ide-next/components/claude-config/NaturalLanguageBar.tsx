'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface NaturalLanguageBarProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
}

export function NaturalLanguageBar({ onGenerate, isGenerating }: NaturalLanguageBarProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const examplePrompts = [
    'Create an agent that reviews React code for performance',
    'Build a hook that runs tests before every commit',
    'Make a command that explains TypeScript errors',
    'Generate a skill guide for API design best practices',
    'Create an agent specialized in debugging Node.js applications'
  ];

  const isCreationIntent = input.toLowerCase().match(/(create|build|make|generate|write)\s+(an?|the)?\s*(agent|hook|skill|command)/);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isGenerating) {
      onGenerate(input.trim());
      setInput('');
      setShowSuggestions(false);
    }
  };

  const handleExampleClick = (prompt: string) => {
    setInput(prompt);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-orange-400 rounded-lg opacity-0 group-hover:opacity-20 blur transition-opacity" />
          
          <div className="relative flex items-center bg-black/40 border-2 border-cyan-500/30 rounded-lg overflow-hidden focus-within:border-cyan-400 focus-within:shadow-lg focus-within:shadow-cyan-500/20 transition-all">
            <Sparkles className="w-5 h-5 text-cyan-400 ml-4" />
            
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onFocus={() => setShowSuggestions(input.length > 0)}
              placeholder="Try: 'Create an agent that reviews React code for performance' or click examples below..."
              className="flex-1 px-4 py-4 bg-transparent text-white placeholder-cyan-300/40 focus:outline-none text-lg"
              disabled={isGenerating}
            />

            {isCreationIntent && !isGenerating && (
              <button
                type="submit"
                className="px-6 py-2 m-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold rounded-md transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg shadow-cyan-500/30"
              >
                <Sparkles className="w-4 h-4" />
                Generate with AI
              </button>
            )}

            {isGenerating && (
              <div className="px-6 py-2 m-2 flex items-center gap-2 text-cyan-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-semibold">Generating...</span>
              </div>
            )}
          </div>
        </div>

        {/* Example Prompts */}
        {!isGenerating && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-cyan-300/60 self-center font-medium">Examples:</span>
            {examplePrompts.slice(0, 3).map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleExampleClick(prompt)}
                className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-md text-sm text-cyan-300 hover:text-cyan-200 transition-all"
              >
                {prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt}
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Quick Tips */}
      <div className="mt-4 p-4 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-orange-500/10 border border-cyan-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-orange-300 font-bold mb-1">The Holy Sh*t Moment</p>
            <p className="text-cyan-100/70">
              Just type what you want in plain English. AI will generate a complete, 
              production-ready config in seconds. No templates, no setup, no friction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
