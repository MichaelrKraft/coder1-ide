import React, { useState, useEffect } from 'react';
import { useMemoryStore } from '@/stores/useMemoryStore';
import { Lock, Brain, TrendingUp, Clock, Sparkles, X } from 'lucide-react';

interface PremiumUpsellOverlayProps {
  memoriesCount: number;
  onUpgradeClick: () => void;
}

export const PremiumUpsellOverlay: React.FC<PremiumUpsellOverlayProps> = ({
  memoriesCount,
  onUpgradeClick,
}) => {
  const { totalPatterns } = useMemoryStore();
  const [timeSaved, setTimeSaved] = useState(15); // Start at 15 minutes

  useEffect(() => {
    // Increment time saved every 20 seconds to simulate accumulating value
    const interval = setInterval(() => {
      setTimeSaved(prev => prev + 1); // Add 1 minute
    }, 20000); // Every 20 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Format time display
  const formatTimeSaved = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="relative h-full">
      {/* Blurred Background with Scrolling Memories */}
      <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
        <div className="space-y-2 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-700/50 rounded p-2 blur-sm">
              <div className="h-4 bg-gray-600/50 rounded w-3/4 mb-1" />
              <div className="h-3 bg-gray-600/50 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Upsell Content */}
      <div className="relative bg-gray-900/95 border border-amber-500/30 rounded-lg p-6">
        <div className="flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-amber-500 mr-3" />
          <h2 className="text-base font-bold text-white">
            CONTEXTUAL MEMORY™
          </h2>
        </div>

        {/* Stats Tease */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-black/40 rounded-lg p-4 border border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]">
            <div className="flex items-center justify-between mb-2">
              <Brain className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold text-white">{memoriesCount}</span>
            </div>
            <div className="text-sm text-gray-400">Memories Ready to Use</div>
          </div>

          <div className="bg-black/40 rounded-lg p-4 border border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-2xl font-bold text-white">{totalPatterns}</span>
            </div>
            <div className="text-sm text-gray-400">Patterns Learned</div>
          </div>
        </div>

        {/* Pain Points */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-red-400 mb-3">WITHOUT PREMIUM:</h3>
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-300">
              <X className="w-4 h-4 text-red-400 mr-2" />
              Claude forgets everything when session ends
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <X className="w-4 h-4 text-red-400 mr-2" />
              Repeat yourself every new session
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <X className="w-4 h-4 text-red-400 mr-2" />
              Same mistakes, no learning from errors
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-green-400 mb-3">WITH PREMIUM:</h3>
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-300">
              <Sparkles className="w-4 h-4 text-green-400 mr-2" />
              Never explain your project again
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <Sparkles className="w-4 h-4 text-green-400 mr-2" />
              AI gets smarter with every session
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <Sparkles className="w-4 h-4 text-green-400 mr-2" />
              Learn from 1000s of coding patterns
            </div>
          </div>
        </div>


        {/* Daily Time Saved Counter */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
          <div className="text-sm text-blue-400 mb-2">Daily Time Saved:</div>
          <div className="flex items-baseline gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xl font-bold text-white">{formatTimeSaved(timeSaved)}</span>
            <span className="text-sm text-gray-400">= ${Math.floor(timeSaved * 0.83)}-{Math.floor(timeSaved * 1.17)} at $50/hr</span>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={onUpgradeClick}
          className="w-full bg-black hover:bg-gray-900 text-white font-medium py-3 px-6 rounded-lg transition-all border border-purple-500 hover:border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)] hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
        >
          <div className="text-base">Enable Contextual Memory™</div>
        </button>

        {/* Social Proof */}
        <div className="mt-4 text-center text-xs text-gray-400">
          Join 1,247 developers whose AI gets smarter daily
        </div>
      </div>
    </div>
  );
};