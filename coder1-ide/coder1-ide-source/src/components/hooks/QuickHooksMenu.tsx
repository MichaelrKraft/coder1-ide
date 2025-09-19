/**
 * QuickHooksMenu - Dropdown menu for quick hooks management
 * Shows active hooks, recommendations, and quick actions
 */

import React, { useState, useEffect, useRef } from 'react';
import hooksService, { HookTemplate, HookRecommendation, HooksStatus } from '../../services/hooks/HooksService';
import AIHookSuggestions from './AIHookSuggestions';

interface QuickHooksMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
}

type TabType = 'hooks' | 'ai-suggestions';

interface ActiveHook {
  id: string;
  name: string;
  enabled: boolean;
}

const QuickHooksMenu: React.FC<QuickHooksMenuProps> = ({
  isOpen,
  onClose,
  position = { x: 0, y: 0 }
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('hooks');
  const [activeHooks, setActiveHooks] = useState<ActiveHook[]>([]);
  const [recommendations, setRecommendations] = useState<HookRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load hooks data
  const loadHooksData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load current status and recommendations in parallel
      const [status, analysis] = await Promise.all([
        hooksService.getStatus(),
        hooksService.analyzeProject().catch(() => ({ projectType: 'Unknown', recommendations: [], detectedTechnologies: [], confidence: 0 }))
      ]);
      
      // Convert status to active hooks format with beginner-friendly names
      const totalHooks = (status.project.hookCount || 0) + (status.user.hookCount || 0);
      const friendlyHookNames = [
        "🚀 Auto-Deploy on Save",
        "🔍 Code Quality Checker", 
        "💡 Smart Suggestions",
        "🛡️ Security Scanner",
        "📝 Auto Documentation"
      ];
      
      const mockActiveHooks: ActiveHook[] = totalHooks > 0 
        ? Array.from({ length: Math.min(totalHooks, 5) }, (_, i) => ({
            id: `hook-${i}`,
            name: friendlyHookNames[i] || `🔧 Helper Tool ${i + 1}`,
            enabled: true
          }))
        : [];
      
      setActiveHooks(mockActiveHooks);
      
      // Create beginner-friendly recommendations
      const beginnerRecommendations: HookRecommendation[] = [
        {
          id: 'beginner-git',
          name: '📦 Smart Save & Backup',
          description: 'Automatically save your work and create backups when you make changes',
          priority: 'high',
          reason: 'Protect your work from accidents',
          hooks: ['auto-commit', 'backup-files']
        },
        {
          id: 'beginner-format',
          name: '✨ Code Beautifier',
          description: 'Make your code look clean and professional automatically',
          priority: 'medium',
          reason: 'Write prettier, more readable code',
          hooks: ['auto-format', 'code-style']
        },
        {
          id: 'beginner-help',
          name: '🤖 AI Coding Assistant',
          description: 'Get instant help and suggestions while you code',
          priority: 'high',
          reason: 'Learn faster and code smarter',
          hooks: ['ai-suggestions', 'error-help']
        }
      ];
      
      setRecommendations(analysis.recommendations.length > 0 ? analysis.recommendations.slice(0, 3) : beginnerRecommendations);
    } catch (err) {
      console.error('Failed to load hooks data:', err);
      setError('Oops! Could not load your helpers. Try refreshing or check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Load data when menu opens
  useEffect(() => {
    if (isOpen) {
      loadHooksData();
    }
  }, [isOpen]);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleInstallRecommendation = async (recommendationId: string) => {
    try {
      await hooksService.installPack(recommendationId);
      console.log(`Installed recommendation pack: ${recommendationId}`);
      // Reload data to reflect changes
      await loadHooksData();
    } catch (err) {
      console.error('Failed to install recommendation:', err);
    }
  };

  const toggleHook = async (hookId: string, enabled: boolean) => {
    try {
      console.log(`${enabled ? 'Starting' : 'Stopping'} helper: ${hookId}`);
      // TODO: Implement hook toggle functionality
      // This would require new API endpoints for enabling/disabling individual hooks
      
      // Update local state optimistically
      setActiveHooks(prev => 
        prev.map(hook => 
          hook.id === hookId ? { ...hook, enabled } : hook
        )
      );
    } catch (err) {
      console.error('Failed to toggle helper:', err);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '8px',
        padding: '12px',
        minWidth: '280px',
        maxWidth: '400px',
        zIndex: 10000,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        color: '#FFA500',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px'
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <h3 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '16px', 
          fontWeight: '600',
          color: '#FF6B35'
        }}>
          🔧 Coding Helpers
        </h3>
        
        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex',
          gap: '4px',
          marginBottom: '8px'
        }}>
          <button
            onClick={() => setActiveTab('hooks')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '500',
              backgroundColor: activeTab === 'hooks' 
                ? 'rgba(255, 107, 53, 0.2)' 
                : 'rgba(107, 114, 128, 0.1)',
              color: activeTab === 'hooks' 
                ? '#FF6B35' 
                : '#9ca3af',
              transition: 'all 0.2s ease'
            }}
          >
            My Helpers
          </button>
          <button
            onClick={() => setActiveTab('ai-suggestions')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '500',
              backgroundColor: activeTab === 'ai-suggestions' 
                ? 'rgba(139, 92, 246, 0.2)' 
                : 'rgba(107, 114, 128, 0.1)',
              color: activeTab === 'ai-suggestions' 
                ? '#a78bfa' 
                : '#9ca3af',
              transition: 'all 0.2s ease'
            }}
          >
            🤖 AI Suggestions
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#a0a0a0' }}>
          <div style={{ 
            display: 'inline-block',
            width: '16px',
            height: '16px',
            border: '2px solid #6b7280',
            borderTop: '2px solid #FF6B35',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '8px'
          }} />
          Finding your helpers...
        </div>
      )}

      {error && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '4px',
          color: '#FCA5A5',
          fontSize: '13px',
          marginBottom: '12px'
        }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Tab Content */}
          {activeTab === 'hooks' && (
            <>
              {/* Active Hooks Section */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ 
                  fontSize: '13px', 
                  fontWeight: '500', 
                  marginBottom: '8px',
                  color: '#22c55e'
                }}>
                  Active Helpers ({activeHooks.length})
                </div>
            
            {activeHooks.length === 0 ? (
              <div style={{ 
                fontSize: '12px', 
                color: '#6b7280',
                fontStyle: 'italic',
                padding: '8px 0'
              }}>
                No helpers are running yet. Try the suggestions below! 👇
              </div>
            ) : (
              <div style={{ gap: '4px' }}>
                {activeHooks.map(hook => (
                  <div
                    key={hook.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 8px',
                      backgroundColor: hook.enabled 
                        ? 'rgba(34, 197, 94, 0.1)' 
                        : 'rgba(107, 114, 128, 0.1)',
                      borderRadius: '4px',
                      marginBottom: '4px'
                    }}
                  >
                    <span style={{ 
                      fontSize: '12px',
                      color: hook.enabled ? '#22c55e' : '#6b7280'
                    }}>
                      {hook.name}
                    </span>
                    <button
                      onClick={() => toggleHook(hook.id, !hook.enabled)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: hook.enabled ? '#22c55e' : '#6b7280',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '2px 4px'
                      }}
                    >
                      {hook.enabled ? '✓' : '○'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommendations Section */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              fontSize: '13px', 
              fontWeight: '500', 
              marginBottom: '8px',
              color: '#f59e0b'
            }}>
              Suggested Helpers ({recommendations.length})
            </div>
            
            {recommendations.length === 0 ? (
              <div style={{ 
                fontSize: '12px', 
                color: '#6b7280',
                fontStyle: 'italic',
                padding: '8px 0'
              }}>
                All good! No new helpers needed right now ✨
              </div>
            ) : (
              <div style={{ gap: '4px' }}>
                {recommendations.map(rec => (
                  <div
                    key={rec.id}
                    style={{
                      padding: '8px',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      borderRadius: '4px',
                      marginBottom: '4px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '4px'
                    }}>
                      <span style={{ 
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#f59e0b'
                      }}>
                        {rec.name}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        backgroundColor: rec.priority === 'high' 
                          ? 'rgba(239, 68, 68, 0.3)' 
                          : rec.priority === 'medium'
                          ? 'rgba(245, 158, 11, 0.3)'
                          : 'rgba(107, 114, 128, 0.3)',
                        borderRadius: '12px',
                        color: rec.priority === 'high' 
                          ? '#ef4444' 
                          : rec.priority === 'medium'
                          ? '#f59e0b'
                          : '#6b7280'
                      }}>
                        {rec.priority}
                      </span>
                    </div>
                    
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#a0a0a0',
                      marginBottom: '6px'
                    }}>
                      {rec.description}
                    </div>
                    
                    <button
                      onClick={() => handleInstallRecommendation(rec.id)}
                      style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.2)',
                        border: '1px solid rgba(245, 158, 11, 0.5)',
                        color: '#f59e0b',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.2)';
                      }}
                    >
                      ✨ Add Helper
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
            </>
          )}

          {/* AI Suggestions Tab */}
          {activeTab === 'ai-suggestions' && (
            <div style={{ 
              maxHeight: '400px', 
              overflowY: 'auto',
              marginBottom: '16px'
            }}>
              <AIHookSuggestions />
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ 
            borderTop: '1px solid rgba(139, 92, 246, 0.2)', 
            paddingTop: '12px',
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={() => {
                window.open('/hooks', '_blank');
                onClose();
              }}
              style={{
                flex: 1,
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.5)',
                color: '#a78bfa',
                borderRadius: '4px',
                padding: '8px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              🔧 Manage All Helpers
            </button>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'rgba(107, 114, 128, 0.2)',
                border: '1px solid rgba(107, 114, 128, 0.5)',
                color: '#9ca3af',
                borderRadius: '4px',
                padding: '8px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default QuickHooksMenu;