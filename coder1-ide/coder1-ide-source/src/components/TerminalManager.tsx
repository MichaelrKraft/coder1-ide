import React from 'react';
import Terminal, { TerminalSessionData } from './Terminal';
import { ThinkingMode } from './ThinkingModeToggle';

// Global terminal singleton outside React lifecycle
let globalTerminalInstance: React.ReactElement | null = null;
let globalProps: any = {};

interface TerminalManagerProps {
  thinkingMode?: ThinkingMode;
  onThinkingModeChange?: (mode: ThinkingMode) => void;
  onTerminalDataChange?: (data: TerminalSessionData) => void;
  onShowTaskDelegation?: (show: boolean) => void;
  onSetTaskDelegationSessionId?: (sessionId: string | null) => void;
}

const TerminalManager: React.FC<TerminalManagerProps> = ({
  thinkingMode = 'normal',
  onThinkingModeChange,
  onTerminalDataChange,
  onShowTaskDelegation,
  onSetTaskDelegationSessionId,
}) => {
  // Only create the terminal instance once, globally
  if (!globalTerminalInstance) {
    console.log('🔥 Creating GLOBAL terminal singleton');
    globalTerminalInstance = (
      <Terminal
        key="global-terminal-singleton"
        thinkingMode={thinkingMode}
        onThinkingModeChange={onThinkingModeChange}
        onTerminalDataChange={onTerminalDataChange}
        onShowTaskDelegation={onShowTaskDelegation}
        onSetTaskDelegationSessionId={onSetTaskDelegationSessionId}
      />
    );
    
    globalProps = {
      thinkingMode,
      onThinkingModeChange,
      onTerminalDataChange,
      onShowTaskDelegation,
      onSetTaskDelegationSessionId,
    };
  } else {
    // Update global props reference for future use
    globalProps = {
      thinkingMode,
      onThinkingModeChange,
      onTerminalDataChange,
      onShowTaskDelegation,
      onSetTaskDelegationSessionId,
    };
  }

  return globalTerminalInstance;
};

export default TerminalManager;
export { globalProps };