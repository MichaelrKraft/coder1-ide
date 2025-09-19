import React, { useState, useEffect } from 'react';
import './SimpleDeveloperDashboard.css';
import CodingTimeCard from './CodingTimeCard';
import CommandCard from './CommandCard';
import GitPushCard from './GitPushCard';
import NextStepsCard from './NextStepsCard';
import ProjectProgressCard from './ProjectProgressCard';
import LearningToggleCard from './LearningToggleCard';
import TokenUsageCard from './TokenUsageCard';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';

interface SimpleDeveloperDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const SimpleDeveloperDashboard: React.FC<SimpleDeveloperDashboardProps> = ({ isOpen, onClose }) => {
  const { metrics, loading, toggleHelp, isHelpEnabled } = useDashboardMetrics();

  if (!isOpen) return null;

  return (
    <div className="dashboard-overlay" onClick={onClose}>
      <div 
        className="dashboard-container" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dashboard-header">
          <div className="dashboard-title">
            <h1>💻 Your Coding Dashboard</h1>
            <p>Track your progress and stay motivated</p>
          </div>
          <div className="dashboard-controls">
            <button 
              className="help-button"
              onClick={() => toggleHelp()}
              title="Toggle help system"
            >
              🎓 Help
            </button>
            <button 
              className="settings-button"
              title="Dashboard settings"
            >
              ⚙️
            </button>
            <button 
              className="close-button"
              onClick={onClose}
              title="Close dashboard"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          <CodingTimeCard 
            timeToday={metrics?.codingTime?.today || 0}
            loading={loading}
          />
          
          <CommandCard 
            command={metrics?.favoriteCommand?.command || 'Loading...'}
            count={metrics?.favoriteCommand?.count || 0}
            loading={loading}
          />
          
          <GitPushCard 
            pushCount={metrics?.gitPushes?.count || 0}
            trend={metrics?.gitPushes?.trend || 'stable'}
            loading={loading}
          />
          
          <NextStepsCard 
            suggestions={metrics?.nextSteps?.suggestions || []}
            loading={loading}
          />
          
          <ProjectProgressCard 
            progress={metrics?.projectProgress?.percentage || 0}
            phase={metrics?.projectProgress?.currentPhase || 'Getting Started'}
            loading={loading}
          />
          
          <LearningToggleCard 
            isEnabled={isHelpEnabled}
            onToggle={toggleHelp}
          />
        </div>

        {/* Token Usage Bar */}
        <div className="dashboard-footer">
          <TokenUsageCard 
            used={metrics?.tokenUsage?.used || 0}
            limit={metrics?.tokenUsage?.limit || 10000}
            loading={loading}
          />
        </div>

        {/* Help Overlay */}
        {isHelpEnabled && (
          <div className="help-overlay">
            <div className="help-content">
              <h3>💡 Coding Tips</h3>
              <ul>
                <li><strong>git add .</strong> - Stage all changes for commit</li>
                <li><strong>git commit -m "message"</strong> - Commit with a message</li>
                <li><strong>git push</strong> - Upload your code to the repository</li>
                <li><strong>npm install</strong> - Install project dependencies</li>
                <li><strong>npm start</strong> - Start the development server</li>
              </ul>
              <button 
                className="help-close-button"
                onClick={() => toggleHelp()}
              >
                Got it!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleDeveloperDashboard;