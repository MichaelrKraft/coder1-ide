'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Sun,
  Coffee,
  RefreshCw,
  Loader2,
  Calendar,
  ChevronDown,
  GitPullRequest,
  FileText,
  X,
  Sunrise,
} from 'lucide-react';
import { useJohnny5Store } from '@/stores/useJohnny5Store';
import type { Johnny5MorningBrief, Johnny5BriefItem } from '@/types/johnny5';
import BriefSection from './BriefSection';
import WeatherWidget from './WeatherWidget';

interface MorningBriefTabProps {
  className?: string;
}

/**
 * MorningBriefTab - Main morning brief display for Johnny5
 *
 * The cornerstone of the "I want to wake up every morning and be like
 * 'wow, you got a lot done while I was sleeping'" vision.
 *
 * Features:
 * - Warm, welcoming morning greeting with date
 * - Optional weather widget (configurable)
 * - Four main sections: Built, Research, Trends, Attention
 * - Action buttons at bottom
 * - Historical brief selector
 * - Empty state for new users
 * - Animated background with morning sun accents
 */
export default function MorningBriefTab({ className = '' }: MorningBriefTabProps) {
  const {
    morningBrief,
    briefHistory,
    briefLoading,
    setMorningBrief,
    setBriefHistory,
    setBriefLoading,
    settings,
    dismissBriefItem,
  } = useJohnny5Store();

  const [selectedBriefDate, setSelectedBriefDate] = useState<string | null>(null);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [showWeather, setShowWeather] = useState(true);

  // Fetch today's brief on mount
  useEffect(() => {
    loadTodaysBrief();
    loadBriefHistory();
  }, []);

  const loadTodaysBrief = async () => {
    setBriefLoading(true);
    try {
      const response = await fetch('/api/johnny5/morning-brief');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setMorningBrief(data.data);
        } else {
          console.error('[MorningBriefTab] API returned unsuccessful response');
          setMorningBrief(null);
        }
      } else {
        console.error('[MorningBriefTab] Failed to fetch brief:', response.status);
        setMorningBrief(null);
      }
    } catch (error) {
      console.error('[MorningBriefTab] Error fetching brief:', error);
      setMorningBrief(null);
    } finally {
      setBriefLoading(false);
    }
  };

  const loadBriefHistory = async () => {
    try {
      const response = await fetch('/api/johnny5/morning-brief/history');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setBriefHistory(data.data);
        }
      }
    } catch {
      // Silently fail for history
    }
  };

  const loadBriefByDate = async (dateStr: string) => {
    setBriefLoading(true);
    setSelectedBriefDate(dateStr);
    try {
      const response = await fetch(`/api/johnny5/morning-brief?date=${dateStr}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setMorningBrief(data.data);
        }
      }
    } catch {
      // Keep current brief on error
    } finally {
      setBriefLoading(false);
      setShowHistoryDropdown(false);
    }
  };

  const handleRefresh = () => {
    setSelectedBriefDate(null);
    loadTodaysBrief();
  };

  const handleItemAction = (item: Johnny5BriefItem) => {
    if (morningBrief && !item.link) {
      dismissBriefItem(morningBrief.id, item.id);
    }
  };

  // Get greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Format date for display
  const formatBriefDate = (date: Date | string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate totals
  const totalItems = useMemo(() => {
    if (!morningBrief) return 0;
    return (
      morningBrief.builtOvernight.length +
      morningBrief.researchCompleted.length +
      morningBrief.trendsSpotted.length +
      morningBrief.needsAttention.length
    );
  }, [morningBrief]);

  return (
    <div className={`h-full flex flex-col relative overflow-hidden ${className}`}>
      {/* Animated Background - Morning Sun Theme */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Main sun glow */}
        <div
          className="absolute w-64 h-64 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.4), rgba(251, 146, 60, 0.2), transparent 70%)',
            top: '-100px',
            right: '-80px',
            filter: 'blur(40px)',
            animation: 'morningGlow 20s ease-in-out infinite',
          }}
        />

        {/* Secondary warm glow */}
        <div
          className="absolute w-40 h-40 rounded-full opacity-8"
          style={{
            background: 'radial-gradient(circle, rgba(251, 146, 60, 0.3), transparent)',
            top: '40%',
            left: '-40px',
            filter: 'blur(30px)',
            animation: 'morningFloat 15s ease-in-out infinite reverse',
          }}
        />

        {/* Cyan accent (Coder1 brand) */}
        <div
          className="absolute w-32 h-32 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(0, 217, 255, 0.3), transparent)',
            bottom: '20%',
            right: '10%',
            filter: 'blur(25px)',
            animation: 'morningPulse 12s ease-in-out infinite',
          }}
        />
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes morningGlow {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.1); opacity: 0.15; }
        }
        @keyframes morningFloat {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-15px) translateX(10px); }
        }
        @keyframes morningPulse {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.15); opacity: 0.12; }
        }
      `}</style>

      {/* Header */}
      <div className="px-4 py-4 border-b border-border-default bg-bg-secondary/80 backdrop-blur-sm relative z-10">
        {/* Greeting Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 flex items-center justify-center">
              <Sunrise className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                {greeting}!
              </h2>
              <p className="text-xs text-text-muted flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {morningBrief ? formatBriefDate(morningBrief.date) : formatBriefDate(new Date())}
                {selectedBriefDate && (
                  <button
                    onClick={handleRefresh}
                    className="ml-2 text-coder1-cyan hover:underline"
                  >
                    Back to today
                  </button>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* History Dropdown */}
            {briefHistory.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                  className="
                    flex items-center gap-1 px-2 py-1.5 rounded-md text-xs
                    text-text-muted hover:text-text-secondary hover:bg-bg-tertiary
                    transition-all
                  "
                >
                  <Calendar className="w-3.5 h-3.5" />
                  History
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showHistoryDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowHistoryDropdown(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-bg-secondary border border-border-default rounded-lg shadow-xl z-20 overflow-hidden">
                      <div className="p-2 max-h-64 overflow-auto">
                        <p className="text-[10px] text-text-muted px-2 mb-1 uppercase tracking-wider">
                          Past Briefs
                        </p>
                        {briefHistory.map((brief) => (
                          <button
                            key={brief.id}
                            onClick={() => loadBriefByDate(new Date(brief.date).toISOString().split('T')[0])}
                            className={`
                              w-full text-left px-2 py-1.5 rounded-md text-xs
                              transition-colors
                              ${selectedBriefDate === new Date(brief.date).toISOString().split('T')[0]
                                ? 'bg-coder1-cyan/20 text-coder1-cyan'
                                : 'text-text-secondary hover:bg-bg-tertiary'
                              }
                            `}
                          >
                            {formatBriefDate(brief.date)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={briefLoading}
              className="
                p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-bg-tertiary
                transition-all disabled:opacity-50
              "
              title="Refresh brief"
            >
              <RefreshCw className={`w-4 h-4 ${briefLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Weather Widget (optional) */}
        {showWeather && settings.morningBrief.includeWeather && morningBrief?.weather && (
          <WeatherWidget
            temperature={morningBrief.weather.temperature}
            condition={morningBrief.weather.condition}
            location={morningBrief.weather.location}
            onHide={() => setShowWeather(false)}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 relative z-10">
        {briefLoading && !morningBrief ? (
          // Loading State
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-4" />
            <p className="text-sm text-text-muted">Preparing your morning brief...</p>
          </div>
        ) : !morningBrief ? (
          // Empty State - New User
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center mb-4">
              <Coffee className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-base font-semibold text-text-primary mb-2">
              No Brief Yet
            </h3>
            <p className="text-sm text-text-muted max-w-sm mb-4">
              Johnny5 will prepare your morning brief once there&apos;s overnight activity to report.
              Schedule tasks and enable monitors to get started.
            </p>
            <button
              onClick={handleRefresh}
              className="
                px-4 py-2 bg-coder1-cyan/20 text-coder1-cyan text-sm font-semibold rounded-lg
                hover:bg-coder1-cyan/30 transition-all
              "
            >
              Load Sample Brief
            </button>
          </div>
        ) : (
          // Brief Content
          <div className="space-y-4">
            {/* Summary */}
            {morningBrief.summary && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-coder1-cyan/10 to-transparent border border-coder1-cyan/20">
                <p className="text-sm text-text-secondary leading-relaxed">
                  {morningBrief.summary}
                </p>
              </div>
            )}

            {/* Sections */}
            <BriefSection
              type="built"
              items={morningBrief.builtOvernight}
              defaultExpanded={true}
              onItemAction={handleItemAction}
            />

            <BriefSection
              type="research"
              items={morningBrief.researchCompleted}
              defaultExpanded={true}
              onItemAction={handleItemAction}
            />

            <BriefSection
              type="trends"
              items={morningBrief.trendsSpotted}
              defaultExpanded={morningBrief.trendsSpotted.length <= 3}
              onItemAction={handleItemAction}
            />

            <BriefSection
              type="attention"
              items={morningBrief.needsAttention}
              defaultExpanded={true}
              onItemAction={handleItemAction}
            />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {morningBrief && totalItems > 0 && (
        <div className="px-4 py-3 border-t border-border-default bg-bg-secondary/80 backdrop-blur-sm relative z-10">
          <div className="flex items-center justify-between gap-3">
            {/* Stats */}
            <div className="text-xs text-text-muted">
              {totalItems} item{totalItems !== 1 ? 's' : ''} in brief
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {morningBrief.builtOvernight.some(b => b.link?.includes('/pull/')) && (
                <button
                  onClick={() => {
                    const prItem = morningBrief.builtOvernight.find(b => b.link?.includes('/pull/'));
                    if (prItem?.link) window.open(prItem.link, '_blank');
                  }}
                  className="
                    flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold
                    bg-purple-500/20 text-purple-400 hover:bg-purple-500/30
                    transition-all
                  "
                >
                  <GitPullRequest className="w-3.5 h-3.5" />
                  Review PRs
                </button>
              )}

              {morningBrief.researchCompleted.length > 0 && (
                <button
                  onClick={() => {
                    const reportItem = morningBrief.researchCompleted[0];
                    if (reportItem?.link) window.open(reportItem.link, '_blank');
                  }}
                  className="
                    flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold
                    bg-blue-500/20 text-blue-400 hover:bg-blue-500/30
                    transition-all
                  "
                >
                  <FileText className="w-3.5 h-3.5" />
                  View Reports
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
