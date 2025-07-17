import React, { useState, useEffect } from 'react';
import { useProPlan } from './ProPlanGate';
import './SubscriptionManager.css';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
}

interface SubscriptionManagerProps {
  onClose?: () => void;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ onClose }) => {
  const { isProPlan, upgradeToPro, downgradePlan } = useProPlan();
  const [selectedPlan, setSelectedPlan] = useState<string>('pro-monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  const plans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Coder1 Base',
      price: 0,
      interval: 'month',
      features: [
        'Basic IDE functionality',
        'Manual AI assistance',
        'Single workspace',
        'Basic file management',
        'Community support'
      ]
    },
    {
      id: 'pro-monthly',
      name: 'Coder1 Pro',
      price: 29,
      interval: 'month',
      popular: true,
      features: [
        'Autonomous AI supervision',
        '24/7 sleep mode monitoring',
        'Multi-workspace management',
        'Super Claude Framework',
        'Enterprise security scanning',
        'Performance monitoring',
        'Priority support',
        'Advanced code analysis',
        'Custom personas',
        'Compliance checking'
      ]
    },
    {
      id: 'pro-yearly',
      name: 'Coder1 Pro (Annual)',
      price: 290,
      interval: 'year',
      features: [
        'All Pro features',
        '2 months free',
        'Priority support',
        'Beta feature access',
        'Custom integrations'
      ]
    }
  ];

  const handlePlanSelect = async (planId: string) => {
    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (planId === 'free') {
        downgradePlan();
      } else {
        upgradeToPro();
      }
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Payment processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrentPlan = (): SubscriptionPlan => {
    return isProPlan 
      ? plans.find(p => p.id === 'pro-monthly') || plans[1]
      : plans[0];
  };

  const currentPlan = getCurrentPlan();

  return (
    <div className="subscription-manager">
      <div className="subscription-header">
        <h2>Choose Your Plan</h2>
        <p>Unlock the full potential of autonomous development</p>
        {onClose && (
          <button className="close-button" onClick={onClose}>×</button>
        )}
      </div>

      <div className="current-plan">
        <h3>Current Plan</h3>
        <div className="plan-badge">
          <span className="plan-name">{currentPlan.name}</span>
          <span className="plan-price">
            ${currentPlan.price}/{currentPlan.interval}
          </span>
        </div>
      </div>

      <div className="plans-grid">
        {plans.map(plan => (
          <div 
            key={plan.id} 
            className={`plan-card ${plan.popular ? 'popular' : ''} ${currentPlan.id === plan.id ? 'current' : ''}`}
          >
            {plan.popular && <div className="popular-badge">Most Popular</div>}
            
            <div className="plan-header">
              <h3>{plan.name}</h3>
              <div className="plan-pricing">
                <span className="price">${plan.price}</span>
                <span className="interval">/{plan.interval}</span>
              </div>
            </div>

            <div className="plan-features">
              {plan.features.map((feature, index) => (
                <div key={index} className="feature-item">
                  <span className="feature-check">✓</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <button
              className={`plan-button ${currentPlan.id === plan.id ? 'current' : ''}`}
              onClick={() => handlePlanSelect(plan.id)}
              disabled={isProcessing || currentPlan.id === plan.id}
            >
              {isProcessing ? 'Processing...' : 
               currentPlan.id === plan.id ? 'Current Plan' : 
               plan.id === 'free' ? 'Downgrade' : 'Upgrade'}
            </button>
          </div>
        ))}
      </div>

      <div className="subscription-footer">
        <div className="security-badges">
          <div className="badge">
            <span className="badge-icon">🔒</span>
            <span>Secure Payment</span>
          </div>
          <div className="badge">
            <span className="badge-icon">↩️</span>
            <span>30-Day Refund</span>
          </div>
          <div className="badge">
            <span className="badge-icon">⚡</span>
            <span>Instant Activation</span>
          </div>
        </div>
        
        <p className="terms">
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          Cancel anytime from your account settings.
        </p>
      </div>
    </div>
  );
};
