import React from 'react';

const TerminalDebug: React.FC = () => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '200px',
      backgroundColor: '#1a1b26',
      color: '#a9b1d6',
      padding: '20px',
      fontFamily: 'monospace',
      fontSize: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <div style={{ color: '#7aa2f7', fontSize: '16px', fontWeight: 'bold' }}>
        🔧 Terminal Debug Component
      </div>
      <div style={{ color: '#9ece6a' }}>
        ✅ React component is rendering
      </div>
      <div style={{ color: '#f7768e' }}>
        ⚠️ Terminal component failed to load
      </div>
      <div style={{ color: '#e0af68' }}>
        📦 Attempting to load XTerm...
      </div>
      <div style={{ 
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#24283b',
        borderRadius: '4px',
        border: '1px solid #414868'
      }}>
        <div>Debug Info:</div>
        <div style={{ fontSize: '12px', marginTop: '5px' }}>
          - Component mounted: {new Date().toISOString()}
          - showTerminal prop: true
          - XTerm loading: pending
        </div>
      </div>
      <div style={{
        marginTop: 'auto',
        padding: '10px',
        backgroundColor: '#292e42',
        borderRadius: '4px',
        textAlign: 'center'
      }}>
        Terminal will appear here when XTerm loads...
      </div>
    </div>
  );
};

export default TerminalDebug;