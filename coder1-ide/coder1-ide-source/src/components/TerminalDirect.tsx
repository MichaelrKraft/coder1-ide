import React, { useEffect, useRef } from 'react';
import TerminalManagerFixed from './TerminalManagerFixed';
import { TerminalSessionData } from './Terminal';
import { ThinkingMode } from './ThinkingModeToggle';

interface TerminalDirectProps {
  thinkingMode?: ThinkingMode;
  onThinkingModeChange?: (mode: ThinkingMode) => void;
  onTerminalDataChange?: (data: TerminalSessionData) => void;
  onShowTaskDelegation?: (show: boolean) => void;
  onSetTaskDelegationSessionId?: (sessionId: string | null) => void;
  onAITeamStatusChange?: (active: boolean, sessionId: string | null) => void;
  onShowAIMastermind?: (show: boolean) => void;
  visible?: boolean;
}

const TerminalDirect: React.FC<TerminalDirectProps> = ({
  thinkingMode = 'normal',
  onThinkingModeChange,
  onTerminalDataChange,
  onShowTaskDelegation,
  onSetTaskDelegationSessionId,
  onAITeamStatusChange,
  onShowAIMastermind,
  visible = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    console.log('🎯 TerminalDirect: Rendering directly without portal');
    
    // Monitor container dimensions
    const checkDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        console.log('📏 TerminalDirect container dimensions:', {
          width: rect.width,
          height: rect.height,
          visible,
          display: window.getComputedStyle(containerRef.current).display
        });
        
        if (rect.width === 0 || rect.height === 0) {
          console.error('⚠️ TerminalDirect container has zero dimensions!');
        }
      }
    };
    
    checkDimensions();
    
    const resizeObserver = new ResizeObserver(checkDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [visible]);
  
  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '100%',
        display: visible ? 'block' : 'none',
        position: 'relative',
        minHeight: '100px',
        minWidth: '100px'
      }}
    >
      <TerminalManagerFixed
        thinkingMode={thinkingMode}
        onThinkingModeChange={onThinkingModeChange}
        onTerminalDataChange={onTerminalDataChange}
        onShowTaskDelegation={onShowTaskDelegation}
        onSetTaskDelegationSessionId={onSetTaskDelegationSessionId}
        onAITeamStatusChange={onAITeamStatusChange}
        onShowAIMastermind={onShowAIMastermind}
      />
    </div>
  );
};

export default TerminalDirect;