import React, { useEffect, useState } from 'react';
import { useMemoryStore } from '@/stores/useMemoryStore';
import { Brain, TrendingUp, Clock, Link2, Sparkles } from 'lucide-react';

export const MemoryIntelligenceDashboard: React.FC = () => {
  const {
    isPremium,
    totalPatterns,
    successRate,
    timeSavedMinutes,
    sessionsConnected,
    calculateIntelligenceGrowth,
    getTimeSavedToday,
  } = useMemoryStore();

  const [animatedPatterns, setAnimatedPatterns] = useState(0);
  const [intelligenceGrowth, setIntelligenceGrowth] = useState(0);
  const [todaysSaved, setTodaysSaved] = useState(0);

  useEffect(() => {
    // Animate pattern count
    const targetPatterns = totalPatterns;
    const increment = Math.ceil(targetPatterns / 30);
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetPatterns) {
        setAnimatedPatterns(targetPatterns);
        clearInterval(timer);
      } else {
        setAnimatedPatterns(current);
      }
    }, 50);

    // Calculate intelligence growth
    setIntelligenceGrowth(calculateIntelligenceGrowth());
    setTodaysSaved(getTimeSavedToday());

    return () => clearInterval(timer);
  }, [totalPatterns, calculateIntelligenceGrowth, getTimeSavedToday]);

  if (!isPremium) {
    return null; // Free users see the upsell overlay instead
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-semibold text-amber-500">
            CONTEXTUAL MEMORY INTELLIGENCE
          </h3>
          <span className="px-2 py-0.5 bg-amber-500/20 rounded-full text-xs text-amber-400">
            PREMIUM ACTIVE
          </span>
        </div>
      </div>

      {/* AI Intelligence Level */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-400">YOUR AI IS GETTING SMARTER</span>
          <span className="text-xs text-amber-400">{intelligenceGrowth.toFixed(1)}% smarter than Day 1</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000"
            style={{ width: `${Math.min(intelligenceGrowth, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black/30 rounded p-3">
          <div className="flex items-center justify-between mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-lg font-bold text-white">{animatedPatterns}</span>
          </div>
          <span className="text-xs text-gray-400">Patterns Learned</span>
          <div className="text-xs text-green-400 mt-1">{successRate}% Success Rate</div>
        </div>

        <div className="bg-black/30 rounded p-3">
          <div className="flex items-center justify-between mb-1">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-lg font-bold text-white">{todaysSaved}m</span>
          </div>
          <span className="text-xs text-gray-400">Saved Today</span>
          <div className="text-xs text-blue-400 mt-1">{timeSavedMinutes}m Total</div>
        </div>
      </div>

      {/* Session Continuity */}
      <div className="bg-black/30 rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">Session Continuity</span>
          </div>
          <span className="text-xs text-purple-400">{sessionsConnected} Connected</span>
        </div>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <React.Fragment key={i}>
              <div className={`w-2 h-2 rounded-full ${i < sessionsConnected ? 'bg-purple-400' : 'bg-gray-600'}`} />
              {i < 4 && (
                <div className={`flex-1 h-0.5 ${i < sessionsConnected - 1 ? 'bg-purple-400' : 'bg-gray-600'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="text-xs text-green-400 mt-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          All your context carries forward!
        </div>
      </div>

      {/* Today's Learning Summary */}
      <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded">
        <div className="text-xs text-green-400">
          <strong>Today's Learning:</strong> Your AI learned 12 new patterns, avoided 3 past mistakes, 
          and saved you {todaysSaved} minutes by not having to re-explain your project.
        </div>
      </div>
    </div>
  );
};