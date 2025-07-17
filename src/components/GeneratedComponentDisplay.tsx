import React, { useState } from 'react';
import { X, Copy, Download, Eye } from 'lucide-react';

interface GeneratedComponentDisplayProps {
  isVisible: boolean;
  onClose: () => void;
}

interface GeneratedComponent {
  id: string;
  name: string;
  code: string;
  preview: string;
  timestamp: Date;
}

export const GeneratedComponentDisplay: React.FC<GeneratedComponentDisplayProps> = ({ 
  isVisible, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview');
  const [generatedComponent] = useState<GeneratedComponent>({
    id: 'comp-1',
    name: 'Button Component',
    code: `import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false 
}) => {
  return (
    <button 
      className={\`btn btn-\${variant}\`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};`,
    preview: '<button class="btn btn-primary">Click me</button>',
    timestamp: new Date()
  });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedComponent.code);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedComponent.code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedComponent.name.replace(/\s+/g, '')}.tsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  return (
    <div className="generated-component-overlay">
      <div className="generated-component-modal">
        <div className="modal-header">
          <h2>Generated Component: {generatedComponent.name}</h2>
          <div className="modal-actions">
            <button className="action-btn" onClick={handleCopyCode} title="Copy Code">
              <Copy size={16} />
            </button>
            <button className="action-btn" onClick={handleDownload} title="Download">
              <Download size={16} />
            </button>
            <button className="action-btn close-btn" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            <Eye size={16} />
            Preview
          </button>
          <button 
            className={`tab ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => setActiveTab('code')}
          >
            <Copy size={16} />
            Code
          </button>
        </div>

        <div className="modal-content">
          {activeTab === 'preview' && (
            <div className="preview-panel">
              <div 
                className="component-preview"
                dangerouslySetInnerHTML={{ __html: generatedComponent.preview }}
              />
            </div>
          )}
          
          {activeTab === 'code' && (
            <div className="code-panel">
              <pre className="code-block">
                <code>{generatedComponent.code}</code>
              </pre>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <span className="timestamp">
            Generated: {generatedComponent.timestamp.toLocaleString()}
          </span>
          <div className="footer-actions">
            <button className="btn secondary" onClick={onClose}>
              Close
            </button>
            <button className="btn primary" onClick={handleCopyCode}>
              Copy to Clipboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneratedComponentDisplay;
