/**
 * Trial Status Banner
 * Shows trial countdown and upgrade prompts
 */

'use client';

import { useState, useEffect } from 'react';
import { premiumClient, TrialStatus } from '@/lib/premium-client';

interface TrialBannerProps {
  userId: string;
  onUpgrade: () => void;
}

export function TrialBanner({ userId, onUpgrade }: TrialBannerProps) {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    premiumClient.setUserId(userId);
    loadTrialStatus();

    // Refresh every 5 minutes
    const interval = setInterval(loadTrialStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadTrialStatus = async () => {
    const status = await premiumClient.getTrialStatus();
    setTrialStatus(status);
    
    // Show banner if trial is active or expired (but not if never started or Pro)
    if (status && !status.isPro && status.status !== 'never_started') {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  if (!isVisible || !trialStatus) {
    return null;
  }

  const isExpired = trialStatus.status === 'expired';
  const isLastDay = trialStatus.daysRemaining === 1;
  const isAlmostExpired = trialStatus.daysRemaining <= 2;

  // Color scheme based on urgency
  const bgColor = isExpired
    ? 'bg-red-500'
    : isLastDay
    ? 'bg-orange-500'
    : isAlmostExpired
    ? 'bg-yellow-500'
    : 'bg-blue-500';

  const textColor = isExpired || isLastDay || isAlmostExpired ? 'text-white' : 'text-white';

  return (
    <div className={`${bgColor} ${textColor} px-4 py-2 flex items-center justify-between shadow-lg`}>
      <div className="flex items-center gap-3">
        {!isExpired && (
          <span className="text-2xl font-bold">
            {trialStatus.daysRemaining}
          </span>
        )}
        <div>
          <p className="font-semibold">
            {isExpired
              ? '⚠️ Your trial has ended'
              : isLastDay
              ? '⏰ Last day of your trial!'
              : isAlmostExpired
              ? `⏰ Only ${trialStatus.daysRemaining} days left in your trial`
              : `🎉 ${trialStatus.daysRemaining} days left in your Pro trial`}
          </p>
          <p className="text-sm opacity-90">
            {isExpired
              ? 'Your memory is preserved for 30 days. Upgrade now to restore it!'
              : 'Eternal Memory + AI Supervision enabled'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!isExpired && trialStatus.trialEndDate && (
          <span className="text-sm opacity-75">
            Expires: {new Date(trialStatus.trialEndDate).toLocaleDateString()}
          </span>
        )}
        <button
          onClick={onUpgrade}
          className="bg-white text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          {isExpired ? 'Restore Memory - Upgrade to Pro' : 'Upgrade to Pro - $29/month'}
        </button>
        <button
          onClick={() => setIsVisible(false)}
          className="text-white hover:bg-white/20 rounded p-1 transition-colors"
          aria-label="Dismiss banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
