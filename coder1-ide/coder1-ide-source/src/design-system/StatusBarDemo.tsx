import React, { useState, useEffect } from 'react';
import StatusBar, { StatusItem, StatusSection } from './StatusBar';
import { useDesignTokens } from './useDesignTokens';

// Demo component to showcase status bar functionality
const StatusBarDemo: React.FC = () => {
  const [items, setItems] = useState<StatusItem[]>([]);
  const [sections, setSections] = useState<StatusSection[]>([]);
  const [demoMode, setDemoMode] = useState<'basic' | 'advanced' | 'loading'>('basic');
  
  const { colors, getSpacing } = useDesignTokens();
  
  // Demo icons
  const FileIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14,2 L14,8 L20,8 M14,2 L20,8 L20,22 L4,22 L4,2 L14,2 Z"></path>
    </svg>
  );
  
  const ServerIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="4" rx="1"></rect>
      <rect x="2" y="9" width="20" height="4" rx="1"></rect>
      <rect x="2" y="15" width="20" height="4" rx="1"></rect>
      <line x1="6" y1="5" x2="6.01" y2="5"></line>
      <line x1="6" y1="11" x2="6.01" y2="11"></line>
      <line x1="6" y1="17" x2="6.01" y2="17"></line>
    </svg>
  );
  
  const GitIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
      <line x1="9" y1="9" x2="9.01" y2="9"></line>
      <line x1="15" y1="9" x2="15.01" y2="9"></line>
    </svg>
  );
  
  const BuildIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
    </svg>
  );
  
  // Initialize demo data
  useEffect(() => {
    switch (demoMode) {
      case 'basic':
        setItems([
          {
            id: 'files',
            label: 'Files',
            value: '24',
            status: 'idle',
            icon: <FileIcon />,
            tooltip: '24 files in workspace'
          },
          {
            id: 'server',
            label: 'Server',
            status: 'success',
            icon: <ServerIcon />,
            tooltip: 'Development server running on port 3000'
          },
          {
            id: 'git',
            label: 'Git',
            value: 'main',
            status: 'idle',
            icon: <GitIcon />,
            tooltip: 'Current branch: main'
          }
        ]);
        setSections([]);
        break;
        
      case 'advanced':
        setItems([
          {
            id: 'memory',
            label: 'Memory',
            value: '156 MB',
            status: 'warning',
            tooltip: 'Memory usage is high',
            action: () => alert('Memory details clicked!')
          }
        ]);
        setSections([
          {
            id: 'build',
            title: 'Build',
            collapsible: true,
            items: [
              {
                id: 'webpack',
                label: 'Webpack',
                status: 'success',
                icon: <BuildIcon />,
                timestamp: new Date()
              },
              {
                id: 'typescript',
                label: 'TypeScript',
                status: 'success',
                value: '0 errors'
              }
            ]
          },
          {
            id: 'services',
            title: 'Services',
            collapsible: true,
            items: [
              {
                id: 'api',
                label: 'API',
                status: 'success',
                value: '200ms'
              },
              {
                id: 'database',
                label: 'Database',
                status: 'warning',
                value: 'Slow queries detected'
              }
            ]
          }
        ]);
        break;
        
      case 'loading':
        setItems([
          {
            id: 'building',
            label: 'Building',
            status: 'loading',
            progress: 65,
            tooltip: 'Building application...'
          },
          {
            id: 'tests',
            label: 'Tests',
            status: 'loading',
            value: '12/20',
            progress: 60
          },
          {
            id: 'deploy',
            label: 'Deploy',
            status: 'error',
            value: 'Failed',
            tooltip: 'Deployment failed - check logs'
          }
        ]);
        setSections([]);
        break;
    }
  }, [demoMode]);
  
  // Simulate progress updates
  useEffect(() => {
    if (demoMode === 'loading') {
      const interval = setInterval(() => {
        setItems(prevItems => 
          prevItems.map(item => {
            if (item.status === 'loading' && item.progress !== undefined) {
              const newProgress = Math.min(100, item.progress + Math.random() * 10);
              return {
                ...item,
                progress: newProgress,
                status: newProgress >= 100 ? 'success' : 'loading'
              };
            }
            return item;
          })
        );
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [demoMode]);
  
  return (
    <div style={{ 
      fontFamily: 'var(--font-family-sans)',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: getSpacing(6),
      backgroundColor: colors.background,
      color: colors.textPrimary
    }}>
      <h1 style={{ 
        fontSize: 'var(--font-size-3xl)', 
        fontWeight: 'var(--font-weight-bold)',
        marginBottom: getSpacing(6),
        color: colors.primary
      }}>
        🔄 Design System - Status Bar Component
      </h1>
      
      {/* Demo Controls */}
      <section style={{ marginBottom: getSpacing(8) }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-xl)', 
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Demo Modes
        </h2>
        <div style={{ display: 'flex', gap: getSpacing(3), marginBottom: getSpacing(6) }}>
          {(['basic', 'advanced', 'loading'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setDemoMode(mode)}
              style={{
                padding: `${getSpacing(2)} ${getSpacing(4)}`,
                borderRadius: 'var(--border-radius-base)',
                border: '1px solid var(--color-border)',
                backgroundColor: demoMode === mode ? colors.primary : colors.surface,
                color: demoMode === mode ? '#ffffff' : colors.textPrimary,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </section>
      
      {/* Bottom Status Bar */}
      <section style={{ marginBottom: getSpacing(8) }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-xl)', 
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Bottom Status Bar (Default)
        </h2>
        
        <div style={{ 
          position: 'relative',
          height: '400px',
          border: `1px solid ${colors.border}`,
          borderRadius: 'var(--border-radius-lg)',
          backgroundColor: colors.surface,
          overflow: 'hidden'
        }}>
          <div style={{
            padding: getSpacing(4),
            height: 'calc(100% - 40px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textSecondary,
            fontSize: 'var(--font-size-lg)'
          }}>
            Mock Editor Window - Status bar appears at bottom
          </div>
          
          <StatusBar
            items={items}
            sections={sections}
            position="bottom"
            showProgress={true}
            showTimestamp={demoMode === 'advanced'}
            onItemClick={(item) => console.log('Item clicked:', item)}
            onSectionToggle={(sectionId, collapsed) => 
              console.log('Section toggled:', sectionId, collapsed)
            }
          />
        </div>
      </section>
      
      {/* Top Status Bar */}
      <section style={{ marginBottom: getSpacing(8) }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-xl)', 
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Top Status Bar
        </h2>
        
        <div style={{ 
          position: 'relative',
          height: '300px',
          border: `1px solid ${colors.border}`,
          borderRadius: 'var(--border-radius-lg)',
          backgroundColor: colors.surface,
          overflow: 'hidden'
        }}>
          <StatusBar
            items={items}
            sections={sections}
            position="top"
            showProgress={true}
            onItemClick={(item) => console.log('Item clicked:', item)}
          />
          
          <div style={{
            padding: getSpacing(4),
            height: 'calc(100% - 40px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textSecondary,
            fontSize: 'var(--font-size-lg)'
          }}>
            Mock Editor Window - Status bar appears at top
          </div>
        </div>
      </section>
      
      {/* Compact Status Bar */}
      <section style={{ marginBottom: getSpacing(8) }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-xl)', 
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Compact Status Bar
        </h2>
        
        <div style={{ 
          position: 'relative',
          height: '200px',
          border: `1px solid ${colors.border}`,
          borderRadius: 'var(--border-radius-lg)',
          backgroundColor: colors.surface,
          overflow: 'hidden'
        }}>
          <div style={{
            padding: getSpacing(4),
            height: 'calc(100% - 28px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textSecondary,
            fontSize: 'var(--font-size-base)'
          }}>
            Compact interface with minimal status bar
          </div>
          
          <StatusBar
            items={items.slice(0, 3)} // Fewer items for compact demo
            position="bottom"
            compact={true}
            showProgress={false}
            maxItems={3}
          />
        </div>
      </section>
      
      {/* Feature Highlights */}
      <section>
        <h2 style={{ 
          fontSize: 'var(--font-size-xl)', 
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: getSpacing(4),
          color: colors.textPrimary
        }}>
          Features Demonstrated
        </h2>
        
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: getSpacing(4)
        }}>
          {[
            {
              title: 'Multiple Status Types',
              description: 'idle, loading, success, error, warning states'
            },
            {
              title: 'Progress Indicators',
              description: 'Real-time progress bars for long operations'
            },
            {
              title: 'Collapsible Sections',
              description: 'Organize related status items into sections'
            },
            {
              title: 'Interactive Items',
              description: 'Click handlers and tooltips for detailed info'
            },
            {
              title: 'Responsive Design',
              description: 'Adapts to different screen sizes and containers'
            },
            {
              title: 'Accessibility',
              description: 'Keyboard navigation and screen reader support'
            }
          ].map((feature, index) => (
            <div
              key={index}
              style={{
                padding: getSpacing(4),
                border: `1px solid ${colors.border}`,
                borderRadius: 'var(--border-radius-md)',
                backgroundColor: colors.surface
              }}
            >
              <h3 style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: getSpacing(2),
                color: colors.textPrimary
              }}>
                {feature.title}
              </h3>
              <p style={{
                color: colors.textSecondary,
                fontSize: 'var(--font-size-sm)',
                lineHeight: 1.5
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default StatusBarDemo;