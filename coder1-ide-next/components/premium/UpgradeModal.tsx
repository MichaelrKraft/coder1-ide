/**
 * Upgrade Modal
 * Stripe Checkout integration for upgrading to Pro
 */

'use client';

import { useState } from 'react';
import { premiumClient } from '@/lib/premium-client';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  email?: string;
}

export function UpgradeModal({ isOpen, onClose, userId, email }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState(email || '');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    if (!userEmail) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      premiumClient.setUserId(userId);

      const checkout = await premiumClient.createCheckoutSession(
        userEmail,
        `${window.location.origin}/upgrade/success`,
        `${window.location.origin}/upgrade/cancel`
      );

      if (!checkout) {
        throw new Error('Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = checkout.checkoutUrl;
    } catch (err) {
      setError('Failed to start upgrade process. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold">Upgrade to Coder1 Pro</h2>
              <p className="text-blue-100 mt-2">Unlock Eternal Memory + AI Supervision</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              disabled={isLoading}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {/* Pricing */}
          <div className="text-center mb-8">
            <div className="text-5xl font-bold text-gray-900 mb-2">
              $29<span className="text-2xl text-gray-600">/month</span>
            </div>
            <p className="text-gray-600">Cancel anytime • Memory preserved for 30 days</p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-2xl mb-2">🧠</div>
              <h3 className="font-semibold text-gray-900 mb-1">Eternal Memory</h3>
              <p className="text-sm text-gray-600">
                Perfect context across unlimited sessions. Never lose your place.
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-2xl mb-2">👁️</div>
              <h3 className="font-semibold text-gray-900 mb-1">AI Supervision</h3>
              <p className="text-sm text-gray-600">
                Real-time code guidance and error prevention with Claude.
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-semibold text-gray-900 mb-1">Advanced Analytics</h3>
              <p className="text-sm text-gray-600">
                Deep insights into your coding patterns and productivity.
              </p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="text-2xl mb-2">🎯</div>
              <h3 className="font-semibold text-gray-900 mb-1">Priority Support</h3>
              <p className="text-sm text-gray-600">
                Direct access to our team when you need help.
              </p>
            </div>
          </div>

          {/* Email Input */}
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Upgrade Button */}
          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
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
                Loading...
              </span>
            ) : (
              'Upgrade to Pro →'
            )}
          </button>

          {/* Fine Print */}
          <p className="text-xs text-gray-500 text-center mt-4">
            Secure payment powered by Stripe • No commitments • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
