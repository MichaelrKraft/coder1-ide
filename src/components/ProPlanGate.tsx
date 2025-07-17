import React from 'react';
import './ProPlanGate.css';

interface ProPlanGateProps {
  feature: string;
  description: string;
  children?: React.ReactNode;
  isProPlan: boolean;
  onUpgrade?: () => void;
}

export const ProPlanGate: React.FC<ProPlanGateProps> = ({
  feature,
  description,
  children,
  isProPlan,
  onUpgrade
}) => {
  if (isProPlan) {
    return <>{children}</>;
  }

  return (
    <div className="pro-plan-gate">
      <div className="gate-overlay">
        <div className="gate-content">
          <div className="gate-icon">🔒</div>
          <h3>{feature}</h3>
          <p>{description}</p>
          <div className="gate-features">
            <div className="feature-item">
              <span className="feature-check">✓</span>
              <span>Autonomous AI supervision</span>
            </div>
            <div className="feature-item">
              <span className="feature-check">✓</span>
              <span>24/7 sleep mode monitoring</span>
            </div>
            <div className="feature-item">
              <span className="feature-check">✓</span>
              <span>Multi-workspace management</span>
            </div>
            <div className="feature-item">
              <span className="feature-check">✓</span>
              <span>Enterprise security scanning</span>
            </div>
            <div className="feature-item">
              <span className="feature-check">✓</span>
              <span>Performance monitoring</span>
            </div>
            <div className="feature-item">
              <span className="feature-check">✓</span>
              <span>Super Claude Framework</span>
            </div>
          </div>
          <button className="upgrade-button" onClick={onUpgrade}>
            Upgrade to Coder1 Pro
          </button>
          <p className="gate-note">
            Unlock the full power of autonomous development
          </p>
        </div>
      </div>
      <div className="gate-preview">
        {children}
      </div>
    </div>
  );
};

export const useProPlan = () => {
  const [isProPlan, setIsProPlan] = React.useState(() => {
    return localStorage.getItem('coder1-pro-plan') === 'true';
  });

  const upgradeToPro = () => {
    localStorage.setItem('coder1-pro-plan', 'true');
    setIsProPlan(true);
  };

  const downgradePlan = () => {
    localStorage.setItem('coder1-pro-plan', 'false');
    setIsProPlan(false);
  };

  return {
    isProPlan,
    upgradeToPro,
    downgradePlan
  };
};
