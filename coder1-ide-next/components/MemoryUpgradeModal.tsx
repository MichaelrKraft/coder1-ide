'use client';

import React, { useState, useEffect } from 'react';
import { memoryTrialService } from '@/services/memory-trial-service';

interface MemoryUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  trialStatus: {
    daysRemaining: number;
    trialExpired: boolean;
    shouldShowUpgrade: boolean;
  };
}

export const MemoryUpgradeModal: React.FC<MemoryUpgradeModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  trialStatus
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setIsProcessing(true);
    try {
      await onUpgrade();
    } finally {
      setIsProcessing(false);
    }
  };

  const getModalContent = () => {
    if (trialStatus.trialExpired) {
      return {
        title: "🧠 Memory Trial Expired",
        message: "Your 7-day memory trial has ended. All your context and session history has been cleared.",
        description: "Upgrade to Pro to restore your memory and never lose context again. All your previous sessions will be restored immediately after upgrade.",
        buttonText: "Restore My Memory - $29/month",
        urgency: "high"
      };
    }

    if (trialStatus.daysRemaining <= 1) {
      return {
        title: "⚠️ Memory Trial Ending Soon",
        message: `Only ${trialStatus.daysRemaining} day${trialStatus.daysRemaining === 1 ? '' : 's'} left in your memory trial!`,
        description: "Don't lose all your valuable context and session history. Upgrade now to keep your eternal memory forever.",
        buttonText: "Keep My Memory - $29/month",
        urgency: "high"
      };
    }

    return {
      title: "🚀 Upgrade to Eternal Memory",
      message: `${trialStatus.daysRemaining} days remaining in your trial`,
      description: "You're experiencing the power of never losing context. Make it permanent with Pro.",
      buttonText: "Upgrade to Pro - $29/month",
      urgency: "medium"
    };
  };

  const content = getModalContent();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">{content.title}</h2>
          {!trialStatus.trialExpired && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-white font-medium mb-3">{content.message}</p>
          <p className="text-gray-300 text-sm leading-relaxed">{content.description}</p>
        </div>

        {/* Benefits List */}
        <div className="mb-6">
          <p className="text-sm text-gray-300 mb-2">Pro Memory includes:</p>
          <ul className="text-sm text-gray-300 space-y-1">
            <li className="flex items-center">
              <span className="text-green-400 mr-2">✓</span>
              Unlimited eternal memory storage
            </li>
            <li className="flex items-center">
              <span className="text-green-400 mr-2">✓</span>
              Context preserved across all sessions
            </li>
            <li className="flex items-center">
              <span className="text-green-400 mr-2">✓</span>
              Advanced session summaries and exports
            </li>
            <li className="flex items-center">
              <span className="text-green-400 mr-2">✓</span>
              Priority support and updates
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleUpgrade}
            disabled={isProcessing}
            className={`
              flex-1 py-3 px-4 rounded-lg font-medium transition-colors
              ${content.urgency === 'high' 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isProcessing ? 'Processing...' : content.buttonText}
          </button>
          
          {!trialStatus.trialExpired && (
            <button
              onClick={onClose}
              className="px-4 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Later
            </button>
          )}
        </div>

        {/* Additional Info */}
        <div className="mt-4 pt-4 border-t border-gray-600">
          <p className="text-xs text-gray-400 text-center">
            Cancel anytime • No setup fees • Instant memory restoration
          </p>
        </div>
      </div>
    </div>
  );
};

// Hook for managing memory trial state
export const useMemoryTrial = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [trialStatus, setTrialStatus] = useState({
    isTrialUser: false,
    isPaidUser: false,
    daysRemaining: 0,
    trialExpired: false,
    shouldShowUpgrade: false
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    // Initialize user on component mount
    const currentUserId = memoryTrialService.initializeUser();
    setUserId(currentUserId);
    
    // Update trial status
    const status = memoryTrialService.getTrialStatus(currentUserId);
    setTrialStatus(status);
    
    // Show upgrade modal if needed
    if (status.shouldShowUpgrade && !showUpgradeModal) {
      setShowUpgradeModal(true);
    }
  }, [showUpgradeModal]);

  const handleUpgrade = async () => {
    if (!userId) return;
    
    // In a real app, this would integrate with Stripe
    // For now, we'll simulate the upgrade
    const success = memoryTrialService.upgradeToPaid(userId);
    
    if (success) {
      setTrialStatus(prev => ({
        ...prev,
        isPaidUser: true,
        isTrialUser: false,
        shouldShowUpgrade: false
      }));
      setShowUpgradeModal(false);
      
      // Show success message
      alert('Welcome to Coder1 Pro! Your eternal memory is now activated.');
    }
  };

  const canStoreMemory = userId ? memoryTrialService.canStoreMemory(userId) : false;

  return {
    userId,
    trialStatus,
    showUpgradeModal,
    setShowUpgradeModal,
    handleUpgrade,
    canStoreMemory,
    memoryService: memoryTrialService
  };
};