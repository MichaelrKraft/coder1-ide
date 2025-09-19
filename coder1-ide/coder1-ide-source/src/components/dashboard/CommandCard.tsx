import React from 'react';

interface CommandCardProps {
  command: string;
  count: number;
  loading?: boolean;
}

const CommandCard: React.FC<CommandCardProps> = ({ command, count, loading = false }) => {
  const getCommandTip = (cmd: string): string => {
    const tips: { [key: string]: string } = {
      'npm': 'Package manager for Node.js',
      'git': 'Version control system',
      'cd': 'Navigate between directories',
      'ls': 'List files in current directory',
      'mkdir': 'Create new directories',
      'code': 'Open files in VS Code',
      'python': 'Run Python scripts',
      'node': 'Run JavaScript with Node.js',
      'npx': 'Execute npm packages'
    };
    
    for (const [key, tip] of Object.entries(tips)) {
      if (cmd.startsWith(key)) return tip;
    }
    
    return 'Your go-to command';
  };

  return (
    <div className={`dashboard-card ${loading ? 'card-loading' : ''}`}>
      <span className="card-icon">⚡</span>
      <div className="card-title">Favorite Command</div>
      <div className="card-value" style={{ 
        fontSize: '20px', 
        fontFamily: 'Monaco, monospace',
        color: '#059669',
        wordBreak: 'break-all'
      }}>
        {loading ? '...' : command}
      </div>
      <div className="card-subtitle">
        {loading ? 'Analyzing...' : (
          <>
            <div style={{ marginBottom: '4px' }}>
              Used <strong>{count}</strong> times
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              {getCommandTip(command)}
            </div>
          </>
        )}
      </div>
      
      {/* Usage frequency indicator */}
      {!loading && count > 0 && (
        <div style={{ 
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: '#fef3c7',
          color: '#d97706',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          #{count}
        </div>
      )}
    </div>
  );
};

export default CommandCard;