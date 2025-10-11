/**
 * Start Trial Button
 * One-click trial activation component
 */

'use client';

import { useState } from 'react';
import { premiumClient } from '@/lib/premium-client';

interface StartTrialButtonProps {
  userId: string;
  onTrialStarted?: () => void;
  variant?: 'primary' | 'secondary' | 'minimal';
  className?: string;
}

export function StartTrialButton({
  userId,
  onTrialStarted,
  variant = 'primary',
  className = '',
}: StartTrialButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleStartTrial = async () => {
    setIsLoading(true);
    setError(null);

    try {
      premiumClient.setUserId(userId);
      const result = await premiumClient.startTrial();

      if (result && result.success) {
        setSuccess(true);
        setTimeout(() => {
          if (onTrialStarted) {
            onTrialStarted();
          }
        }, 1500);
      } else {
        throw new Error('Failed to start trial');
      }
    } catch (err) {
      setError('Could not start trial. You may have already used your trial.');
    } finally {
      setIsLoading(false);
    }
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700',
    secondary: 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50',
    minimal: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
  };

  if (success) {
    return (
      <div className={`px-6 py-3 rounded-lg bg-green-500 text-white font-semibold ${className}`}>
        ✓ Trial Activated!
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleStartTrial}
        disabled={isLoading}
        className={`px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Starting Trial...
          </span>
        ) : (
          '🎉 Start 7-Day Free Trial'
        )}
      </button>

      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 px-4 py-2 rounded border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
