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
      <div className="bg-bg-tertiary rounded-lg p-3 border border-border-default mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-text-muted" />
          <h3 className="text-xs font-medium text-text-secondary">AI Learning Feed</h3>
        </div>
        <div className="text-xs text-text-muted">
          Your AI will start learning as you code...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-tertiary rounded-lg p-3 border border-border-default mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-text-muted" />
          <h3 className="text-xs font-medium text-text-secondary">AI Learning Feed</h3>
        </div>
        {showNewBadge && (
          <span className="px-1.5 py-0.5 bg-coder1-cyan/10 text-coder1-cyan text-xs rounded">
            NEW
          </span>
        )}
      </div>

      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {feedItems.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-start gap-2 p-2 rounded bg-bg-secondary border border-border-default ${
              index === 0 && showNewBadge ? 'animate-slideIn' : ''
            }`}
          >
            <div className={`mt-0.5 ${item.color}`}>{item.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-text-secondary break-words">
                {item.message}
              </div>
              <div className="text-xs text-text-muted mt-0.5">
                {new Date(item.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};