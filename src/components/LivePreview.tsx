import React, { useRef, useEffect } from 'react';

interface LivePreviewProps {
  isInspectorEnabled: boolean;
  onElementSelected: (element: HTMLElement, context: any) => void;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ 
  isInspectorEnabled, 
  onElementSelected 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && isInspectorEnabled) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (iframeDoc) {
        const handleClick = (e: Event) => {
          e.preventDefault();
          const target = e.target as HTMLElement;
          onElementSelected(target, {
            tagName: target.tagName,
            className: target.className,
            id: target.id,
            textContent: target.textContent?.slice(0, 100)
          });
        };

        iframeDoc.addEventListener('click', handleClick);
        
        return () => {
          iframeDoc.removeEventListener('click', handleClick);
        };
      }
    }
  }, [isInspectorEnabled, onElementSelected]);

  return (
    <div className="live-preview">
      <div className="preview-header">
        <h3>Live Preview</h3>
        <span className={`inspector-status ${isInspectorEnabled ? 'active' : 'inactive'}`}>
          Inspector: {isInspectorEnabled ? 'ON' : 'OFF'}
        </span>
      </div>
      <div className="preview-content">
        <iframe
          ref={iframeRef}
          src="about:blank"
          title="Live Preview"
          className="preview-iframe"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
};

export default LivePreview;
