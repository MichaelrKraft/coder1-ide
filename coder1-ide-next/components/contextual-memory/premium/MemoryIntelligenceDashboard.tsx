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
    <div className="bg-bg-secondary border-b border-border-default p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">
            Contextual Memory
          </h3>
          <span className="px-2 py-0.5 bg-coder1-cyan/10 border border-coder1-cyan/30 rounded text-xs text-coder1-cyan">
            Active
          </span>
        </div>
      </div>

      {/* AI Intelligence Level */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-text-muted">Learning Progress</span>
          <span className="text-xs text-text-secondary">{intelligenceGrowth.toFixed(1)}% smarter than Day 1</span>
        </div>
        <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-coder1-cyan transition-all duration-1000"
            style={{ width: `${Math.min(intelligenceGrowth, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-bg-tertiary rounded p-2.5">
          <div className="flex items-center justify-between mb-0.5">
            <TrendingUp className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-base font-semibold text-text-primary">{animatedPatterns}</span>
          </div>
          <span className="text-xs text-text-muted">Patterns</span>
          <div className="text-xs text-text-secondary mt-0.5">{successRate}% Success</div>
        </div>

        <div className="bg-bg-tertiary rounded p-2.5">
          <div className="flex items-center justify-between mb-0.5">
            <Clock className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-base font-semibold text-text-primary">{todaysSaved}m</span>
          </div>
          <span className="text-xs text-text-muted">Saved Today</span>
          <div className="text-xs text-text-secondary mt-0.5">{timeSavedMinutes}m Total</div>
        </div>
      </div>

      {/* Today's Learning Summary */}
      <div className="p-2 bg-bg-tertiary border border-border-default rounded text-xs text-text-secondary">
        <span className="text-text-primary font-medium">Today:</span> Learned 12 patterns, avoided 3 mistakes,
        saved {todaysSaved}m.
      </div>
    </div>
  );
};