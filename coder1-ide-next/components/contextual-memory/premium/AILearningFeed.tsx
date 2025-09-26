import React, { useEffect, useState } from 'react';
import { useMemoryStore } from '@/stores/useMemoryStore';
import { Brain, CheckCircle, TrendingUp, Zap, AlertCircle } from 'lucide-react';

interface FeedItem {
  id: string;
  type: 'pattern' | 'solution' | 'error_fix' | 'optimization' | 'milestone';
  message: string;
  timestamp: Date;
  icon: React.ReactNode;
  color: string;
}

export const AILearningFeed: React.FC = () => {
  const { learningEvents, aiIntelligenceLevel, totalPatterns } = useMemoryStore();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [showNewBadge, setShowNewBadge] = useState(false);

  useEffect(() => {
    // Convert learning events to feed items
    const items: FeedItem[] = learningEvents.slice(-5).map(event => {
      let icon: React.ReactNode;
      let color: string;
      let message: string;

      switch (event.type) {
        case 'pattern':
          icon = <Brain className="w-4 h-4" />;
          color = 'text-purple-400';
          message = `NEW PATTERN LEARNED: ${event.description}`;
          break;
        case 'solution':
          icon = <CheckCircle className="w-4 h-4" />;
          color = 'text-green-400';
          message = `SOLUTION STORED: ${event.description}`;
          break;
        case 'error_fix':
          icon = <AlertCircle className="w-4 h-4" />;
          color = 'text-orange-400';
          message = `ERROR FIX LEARNED: ${event.description}`;
          break;
        case 'optimization':
          icon = <Zap className="w-4 h-4" />;
          color = 'text-yellow-400';
          message = `OPTIMIZATION DISCOVERED: ${event.description}`;
          break;
        default:
          icon = <TrendingUp className="w-4 h-4" />;
          color = 'text-blue-400';
          message = event.description;
      }

      return {
        id: event.id,
        type: event.type,
        message,
        timestamp: event.timestamp,
        icon,
        color,
      };
    });

    // Add milestone events
    if (totalPatterns % 50 === 0 && totalPatterns > 0) {
      items.unshift({
        id: `milestone_${totalPatterns}`,
        type: 'milestone',
        message: `MILESTONE: ${totalPatterns} patterns learned! AI is ${Math.floor(aiIntelligenceLevel)}% smarter`,
        timestamp: new Date(),
        icon: <TrendingUp className="w-4 h-4" />,
        color: 'text-amber-400',
      });
    }

    setFeedItems(items);

    // Show new badge animation
    if (items.length > feedItems.length) {
      setShowNewBadge(true);
      setTimeout(() => setShowNewBadge(false), 3000);
    }
  }, [learningEvents, totalPatterns, aiIntelligenceLevel, feedItems.length]);

  if (feedItems.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-purple-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-gray-300">AI LEARNING FEED</h3>
        </div>
        <div className="text-xs text-gray-500">
          Your AI will start learning as you code...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-gray-300">AI LEARNING IN PROGRESS</h3>
        </div>
        {showNewBadge && (
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full animate-pulse">
            NEW
          </span>
        )}
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {feedItems.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-start gap-2 p-2 rounded bg-black/30 border border-gray-700/50 ${
              index === 0 && showNewBadge ? 'animate-slideIn' : ''
            }`}
          >
            <div className={`mt-0.5 ${item.color}`}>{item.icon}</div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium ${item.color} break-words`}>
                {item.message}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(item.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Intelligence Progress Bar */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-400">AI Intelligence Level</span>
          <span className="text-xs text-purple-400">+0.1% smarter</span>
        </div>
        <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-1000"
            style={{ width: `${Math.min(aiIntelligenceLevel * 10, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};