import React, { Suspense, lazy } from 'react';

// Import xterm CSS directly
import '@xterm/xterm/css/xterm.css';

// Force webpack to bundle xterm by using require
const Terminal = lazy(() => {
  return Promise.all([
    import('./Terminal'),
    // Force xterm to be included in bundle
    import('@xterm/xterm'),
    import('@xterm/addon-fit')
  ]).then(([terminalModule]) => terminalModule);
});

interface TerminalWrapperProps {
  thinkingMode?: any;
  onThinkingModeChange?: (mode: any) => void;
  onTerminalDataChange?: (data: any) => void;
}

const TerminalWrapper: React.FC<TerminalWrapperProps> = (props) => {
  return (
    <Suspense fallback={
      <div style={{ 
        padding: '20px', 
        color: '#00ff00', 
        backgroundColor: '#000',
        fontFamily: 'monospace' 
      }}>
        Loading Terminal...
      </div>
    }>
      <Terminal {...props} />
    </Suspense>
  );
};

export default TerminalWrapper;