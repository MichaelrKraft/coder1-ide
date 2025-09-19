import React from 'react';
import Terminal, { TerminalSessionData } from './Terminal';
import { ThinkingMode } from './ThinkingModeToggle';

interface TerminalManagerFixedProps {
  thinkingMode?: ThinkingMode;
  onThinkingModeChange?: (mode: ThinkingMode) => void;
  onTerminalDataChange?: (data: TerminalSessionData) => void;
  onShowTaskDelegation?: (show: boolean) => void;
  onSetTaskDelegationSessionId?: (sessionId: string | null) => void;
  onAITeamStatusChange?: (active: boolean, sessionId: string | null) => void;
  onShowAIMastermind?: (show: boolean) => void;
}

// Fixed version - no singleton, normal React component
const TerminalManagerFixed: React.FC<TerminalManagerFixedProps> = ({
  thinkingMode = 'normal',
  onThinkingModeChange,
  onTerminalDataChange,
  onShowTaskDelegation,
  onSetTaskDelegationSessionId,
  onAITeamStatusChange,
  onShowAIMastermind,
}) => {
  console.log('🔧 TerminalManagerFixed: Rendering terminal normally (no singleton)');
  
  return (
    <Terminal
      thinkingMode={thinkingMode}
      onThinkingModeChange={onThinkingModeChange}
      onTerminalDataChange={onTerminalDataChange}
      onShowTaskDelegation={onShowTaskDelegation}
      onSetTaskDelegationSessionId={onSetTaskDelegationSessionId}
      onAITeamStatusChange={onAITeamStatusChange}
      onShowAIMastermind={onShowAIMastermind}
    />
  );
};

export default TerminalManagerFixed;