import React, { Component, ReactNode, useState, useEffect } from 'react';
import { detectProject, checkDevServerStatus, getSmartActions, ProjectInfo, DevServerStatus } from '../utils/projectDetection';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Preview component error:', error, errorInfo);
    
    // Send error to parent window if in iframe
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'PREVIEW_ERROR',
        error: error.message,
        stack: error.stack
      }, '*');
    }
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    
    return this.props.children;
  }
}

// Error display components
export const PreviewError: React.FC<{ error?: string }> = ({ error }) => (
  <div className="preview-error">
    <div className="error-icon">⚠️</div>
    <h4>Preview Error</h4>
    <p>Something went wrong while rendering the component.</p>
    {error && (
      <details>
        <summary>Error Details</summary>
        <pre>{error}</pre>
      </details>
    )}
    <button 
      className="error-button"
      onClick={() => window.location.reload()}
    >
      Reload Preview
    </button>
  </div>
);

export const PlaceholderContent: React.FC = () => {
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [devServerStatus, setDevServerStatus] = useState<DevServerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initializeProject() {
      try {
        console.log('🔍 Detecting project configuration...');
        const project = await detectProject();
        setProjectInfo(project);
        
        if (project.hasPackageJson && project.devPort) {
          console.log(`🔍 Checking dev server on port ${project.devPort}...`);
          const serverStatus = await checkDevServerStatus(project.devPort);
          setDevServerStatus(serverStatus);
        }
      } catch (error) {
        console.warn('Failed to initialize project detection:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initializeProject();
  }, []);

  const handleAction = async (actionId: string, action: string) => {
    console.log(`🎬 Executing action: ${actionId} (${action})`);
    
    switch (actionId) {
      case 'open-dev-server':
        if (devServerStatus?.url) {
          window.open(devServerStatus.url, '_blank');
        }
        break;
      case 'create-file':
        // This would integrate with the file explorer when available
        console.log('📄 Create file action - would open file creation dialog');
        break;
      case 'start-dev-server':
        console.log('🚀 Start dev server - would execute in terminal');
        // This could integrate with terminal to run the command
        break;
      case 'build-project':
        console.log('🔨 Build project - would execute build command');
        break;
      default:
        console.log(`Unknown action: ${actionId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="preview-placeholder">
        <div className="placeholder-icon">⏳</div>
        <h4>Initializing Preview</h4>
        <p>Detecting project configuration...</p>
      </div>
    );
  }

  const smartActions = projectInfo && devServerStatus ? getSmartActions(projectInfo, devServerStatus) : [];

  return (
    <div className="preview-placeholder">
      <div className="placeholder-icon">
        {devServerStatus?.isRunning ? '🚀' : '👁️'}
      </div>
      
      {/* Project Status */}
      <h4>
        {devServerStatus?.isRunning 
          ? `${projectInfo?.framework || 'App'} Running` 
          : 'Live Preview'}
      </h4>
      
      {/* Clean Server Status */}
      {devServerStatus?.isRunning ? (
        <div className="server-ready">
          <p className="server-url">
            <code>{devServerStatus.url}</code>
          </p>
          <div className="smart-actions">
            <button
              className="smart-action-btn primary"
              onClick={() => handleAction('open-dev-server', 'Open App')}
              title="Open your running application"
            >
              Open App →
            </button>
          </div>
        </div>
      ) : (
        <div className="server-not-ready">
          <p>Ready to code? Open a file to see live preview</p>
          {projectInfo?.hasPackageJson && (
            <p className="start-hint">
              Try running <code>npm start</code> or <code>npm run dev</code> in the terminal
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorBoundary;