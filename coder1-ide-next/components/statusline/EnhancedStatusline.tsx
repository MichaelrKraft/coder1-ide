/**
 * Enhanced Statusline Component
 * 
 * Shadow implementation of the Claude Code statusline system
 * Hidden by default for safe testing and validation
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { claudeStatuslineService, ComponentData } from '@/lib/claude-statusline-service';
import { statuslineConfigManager, StatuslineSettings, StatuslineComponentLayout } from '@/lib/claude-statusline-config';
import { STATUSLINE_COMPONENTS } from '@/lib/statusline-components';
import { logger } from '@/lib/logger';

interface EnhancedStatuslineProps {
  terminalRef?: React.RefObject<HTMLDivElement>;
  settingsButtonRef?: React.RefObject<HTMLButtonElement>;
  xtermRef?: React.RefObject<any>;
  className?: string;
  style?: React.CSSProperties;
  testMode?: boolean; // For testing without hiding
}

export default function EnhancedStatusline({
  terminalRef,
  settingsButtonRef,
  xtermRef,
  className = '',
  style = {},
  testMode = false
}: EnhancedStatuslineProps) {
  const [config, setConfig] = useState<StatuslineSettings | null>(null);
  const [componentData, setComponentData] = useState<Map<string, ComponentData>>(new Map());
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize configuration and service
  useEffect(() => {
    // Subscribe to configuration changes
    const unsubscribeConfig = statuslineConfigManager.subscribe((newConfig) => {
      setConfig(newConfig);
      setIsVisible(newConfig.enabled && !newConfig.shadowMode);
      
      logger.debug('[EnhancedStatusline] Config updated:', {
        enabled: newConfig.enabled,
        shadowMode: newConfig.shadowMode,
        visible: newConfig.enabled && !newConfig.shadowMode
      });
    });

    // Subscribe to component data updates
    const unsubscribeData = claudeStatuslineService.subscribe((data) => {
      setComponentData(prev => {
        const updated = new Map(prev);
        updated.set(data.component, data);
        return updated;
      });
    });

    // Capture layout baseline when refs are available
    if (terminalRef && settingsButtonRef && xtermRef) {
      claudeStatuslineService.captureLayoutBaseline(terminalRef, settingsButtonRef, xtermRef);
    }

    return () => {
      unsubscribeConfig();
      unsubscribeData();
    };
  }, [terminalRef, settingsButtonRef, xtermRef]);

  // Start/stop service based on configuration
  useEffect(() => {
    if (config?.enabled && claudeStatuslineService.isEnabled()) {
      // Service should already be running
      return;
    }

    if (config?.enabled) {
      claudeStatuslineService.enable();
    } else {
      claudeStatuslineService.disable();
    }
  }, [config?.enabled]);

  // Validate layout when component mounts or updates
  useEffect(() => {
    if (terminalRef && settingsButtonRef && xtermRef && config?.enabled) {
      const issues = claudeStatuslineService.validateLayout(terminalRef, settingsButtonRef, xtermRef);
      
      if (issues.length > 0) {
        logger.warn('[EnhancedStatusline] Layout validation issues:', issues);
        // Could disable statusline or show warning if issues are critical
      } else {
        logger.debug('[EnhancedStatusline] Layout validation passed');
      }
    }
  }, [config, terminalRef, settingsButtonRef, xtermRef]);

  // Don't render if not configured
  if (!config) {
    return null;
  }

  // Render components for a specific line
  const renderLine = (lineNumber: number) => {
    const lineComponents = config.layout.components
      .filter(comp => comp.line === lineNumber && comp.enabled)
      .sort((a, b) => a.position - b.position);

    if (lineComponents.length === 0) {
      return null;
    }

    return (
      <div
        key={`line-${lineNumber}`}
        className="statusline-line flex items-center gap-4"
        style={{
          height: `${config.layout.height / config.layout.lines}px`,
          minHeight: '20px'
        }}
      >
        {lineComponents.map(comp => renderComponent(comp))}
      </div>
    );
  };

  // Render individual component
  const renderComponent = (layout: StatuslineComponentLayout) => {
    const component = STATUSLINE_COMPONENTS[layout.component];
    const data = componentData.get(layout.component);
    
    if (!component || !data) {
      return (
        <div
          key={`${layout.component}-${layout.line}-${layout.position}`}
          className="statusline-component loading"
          style={{ width: layout.width || 'auto' }}
        >
          <span className="text-text-muted text-xs">...</span>
        </div>
      );
    }

    let displayText = '';
    let hasError = false;

    try {
      // Format component data using its specific formatter
      switch (layout.component) {
        case 'model_info':
          displayText = component.formatDisplay ? 
            component.formatDisplay(layout.format, data.data) : 
            layout.format.replace('{icon}', data.data.icon || '🤖').replace('{name}', data.data.name || 'Unknown');
          break;
          
        case 'time_display':
          displayText = component.formatDisplay ? 
            component.formatDisplay(layout.format, data.data) : 
            data.data.formatted || new Date().toLocaleTimeString();
          break;
          
        case 'cost_daily':
        case 'cost_live':
          displayText = component.formatDisplay ? 
            component.formatDisplay(layout.format, data.data) : 
            layout.format.replace('{amount}', data.data.amount?.toString() || '0.00');
          break;
          
        case 'repo_info':
        case 'commits':
        case 'mcp_status':
          displayText = component.formatDisplay ? 
            component.formatDisplay(layout.format, data.data) : 
            JSON.stringify(data.data);
          break;
          
        default:
          displayText = layout.format;
      }
      
      hasError = !!data.error;
      
    } catch (error) {
      logger.error(`[EnhancedStatusline] Error rendering ${layout.component}:`, error);
      displayText = `Error: ${layout.component}`;
      hasError = true;
    }

    return (
      <div
        key={`${layout.component}-${layout.line}-${layout.position}`}
        className={`statusline-component ${hasError ? 'error' : ''}`}
        style={{ 
          width: layout.width || 'auto',
          color: hasError ? config.theme.colors.error : config.theme.colors.text
        }}
        title={data.error || `${layout.component} (updated: ${new Date(data.timestamp).toLocaleTimeString()})`}
      >
        <span className="text-xs">{displayText}</span>
      </div>
    );
  };

  // Calculate visibility
  const shouldShow = testMode || isVisible;
  const isShadowMode = !testMode && config.shadowMode;

  // Generate lines to render
  const linesToRender = Array.from(
    { length: Math.min(config.layout.lines, 9) },
    (_, i) => i + 1
  );

  // Container styles
  const containerStyles: React.CSSProperties = {
    // Core layout
    position: config.layout.position === 'top' ? 'absolute' : 'relative',
    height: `${config.layout.height}px`,
    width: '100%',
    zIndex: 10, // Below dropdowns but above content
    
    // Theme styles
    backgroundColor: config.theme.colors.background,
    borderTop: `1px solid ${config.theme.colors.border}`,
    color: config.theme.colors.text,
    fontSize: config.theme.fonts.size,
    fontFamily: config.theme.fonts.family,
    fontWeight: config.theme.fonts.weight,
    
    // Effects
    backdropFilter: config.theme.effects.blur,
    WebkitBackdropFilter: config.theme.effects.blur,
    boxShadow: config.theme.effects.shadow,
    
    // Glow effect
    ...(config.theme.effects.glow && {
      boxShadow: `${config.theme.effects.shadow}, 0 0 20px ${config.theme.colors.accent}20`
    }),
    
    // Visibility control
    display: shouldShow ? 'flex' : 'none',
    opacity: isShadowMode ? 0.3 : 1,
    pointerEvents: isShadowMode ? 'none' : 'auto',
    
    // Safe positioning
    flexShrink: 0,
    overflow: 'hidden',
    
    // Custom styles override
    ...style
  };

  return (
    <div
      ref={containerRef}
      className={`enhanced-statusline ${className}`}
      style={containerStyles}
      data-testid="enhanced-statusline"
      data-shadow-mode={isShadowMode}
      data-visible={shouldShow}
    >
      <div className="statusline-content flex flex-col justify-center px-4 w-full">
        {linesToRender.map(lineNumber => renderLine(lineNumber))}
      </div>
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="statusline-debug absolute top-0 right-0 text-xs opacity-50">
          <span>
            {config.enabled ? 'ON' : 'OFF'} | 
            {config.shadowMode ? 'SHADOW' : 'LIVE'} | 
            {componentData.size} components
          </span>
        </div>
      )}
    </div>
  );
}

// Export configuration hook for easy access
export const useEnhancedStatusline = () => {
  const [config, setConfig] = useState<StatuslineSettings | null>(null);
  
  useEffect(() => {
    const unsubscribe = statuslineConfigManager.subscribe(setConfig);
    return unsubscribe;
  }, []);
  
  const enable = () => {
    if (config) {
      statuslineConfigManager.updateConfig({ enabled: true });
    }
  };
  
  const disable = () => {
    if (config) {
      statuslineConfigManager.updateConfig({ enabled: false });
    }
  };
  
  const setShadowMode = (enabled: boolean) => {
    if (config) {
      statuslineConfigManager.updateConfig({ shadowMode: enabled });
    }
  };
  
  const enableComponent = (component: keyof typeof STATUSLINE_COMPONENTS) => {
    statuslineConfigManager.enableComponent(component);
  };
  
  const disableComponent = (component: keyof typeof STATUSLINE_COMPONENTS) => {
    statuslineConfigManager.disableComponent(component);
  };
  
  return {
    config,
    enable,
    disable,
    setShadowMode,
    enableComponent,
    disableComponent,
    manager: statuslineConfigManager,
    service: claudeStatuslineService
  };
};