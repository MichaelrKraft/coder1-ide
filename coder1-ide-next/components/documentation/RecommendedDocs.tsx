'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Loader2, Sparkles, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { detectProjectStack, type DetectedStack } from '@/lib/stack-detector';
import { getRecommendedDocs, type DocRecommendation } from '@/lib/recommended-docs';

interface RecommendedDocsProps {
  onAddDoc: (url: string, title: string) => Promise<void>;
}

const RecommendedDocs: React.FC<RecommendedDocsProps> = ({ onAddDoc }) => {
  const [stack, setStack] = useState<DetectedStack | null>(null);
  const [recommendations, setRecommendations] = useState<DocRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [addingUrls, setAddingUrls] = useState<Set<string>>(new Set());
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());
  const [isAddingAll, setIsAddingAll] = useState(false);

  useEffect(() => {
    const detect = async () => {
      setIsLoading(true);
      try {
        const detectedStack = await detectProjectStack();
        setStack(detectedStack);
        
        const allItems = [
          ...detectedStack.frameworks,
          ...detectedStack.libraries,
          ...detectedStack.databases,
          ...detectedStack.tools.filter(t => t === 'typescript')
        ];
        
        const recs = getRecommendedDocs(allItems);
        setRecommendations(recs);
      } catch (error) {
        console.error('[RECOMMENDED-DOCS] Detection failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    detect();
  }, []);

  const handleAddUrl = async (url: string, title: string) => {
    if (addingUrls.has(url) || addedUrls.has(url)) return;
    
    setAddingUrls(prev => new Set(prev).add(url));
    try {
      await onAddDoc(url, title);
      setAddedUrls(prev => new Set(prev).add(url));
    } catch (error) {
      console.error('Failed to add doc:', error);
    } finally {
      setAddingUrls(prev => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
    }
  };

  const handleAddAll = async () => {
    if (isAddingAll) return;
    
    setIsAddingAll(true);
    try {
      for (const rec of recommendations) {
        for (const urlItem of rec.urls.filter(u => u.priority === 'high')) {
          if (!addedUrls.has(urlItem.url)) {
            await handleAddUrl(urlItem.url, `${rec.name}: ${urlItem.title}`);
          }
        }
      }
    } finally {
      setIsAddingAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 border-b border-border-default">
        <div className="flex items-center gap-2 text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Detecting your stack...</span>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  const highPriorityCount = recommendations.reduce(
    (count, rec) => count + rec.urls.filter(u => u.priority === 'high').length,
    0
  );

  return (
    <div className="border-b border-border-default">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-bg-tertiary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span className="font-medium text-text-primary text-sm">Recommended for Your Stack</span>
          <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full">
            {recommendations.length} libraries
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {recommendations.slice(0, 5).map((rec) => (
            <div key={rec.name} className="space-y-1">
              <div className="text-xs font-medium text-text-secondary">{rec.name}</div>
              <div className="space-y-1">
                {rec.urls.filter(u => u.priority === 'high').map((urlItem) => {
                  const isAdding = addingUrls.has(urlItem.url);
                  const isAdded = addedUrls.has(urlItem.url);
                  
                  return (
                    <div
                      key={urlItem.url}
                      className="flex items-center justify-between py-1 px-2 bg-bg-tertiary/50 rounded text-xs"
                    >
                      <span className="text-text-primary truncate flex-1 mr-2">
                        {urlItem.title}
                      </span>
                      <button
                        onClick={() => handleAddUrl(urlItem.url, `${rec.name}: ${urlItem.title}`)}
                        disabled={isAdding || isAdded}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                          isAdded
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                        } disabled:opacity-50`}
                      >
                        {isAdding ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isAdded ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {recommendations.length > 0 && (
            <button
              onClick={handleAddAll}
              disabled={isAddingAll || addedUrls.size >= highPriorityCount}
              className="w-full py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 text-yellow-400 rounded-md transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isAddingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding all...
                </>
              ) : addedUrls.size >= highPriorityCount ? (
                <>
                  <Check className="w-4 h-4" />
                  All recommended docs added
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Add All Recommended ({highPriorityCount})
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RecommendedDocs;
