import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import TerminalManager from './TerminalManager';
import { TerminalSessionData } from './Terminal';
import { ThinkingMode } from './ThinkingModeToggle';

interface TerminalPortalProps {
  containerRef?: React.RefObject<HTMLDivElement | null>;
  thinkingMode?: ThinkingMode;
  onThinkingModeChange?: (mode: ThinkingMode) => void;
  onTerminalDataChange?: (data: TerminalSessionData) => void;
  onShowTaskDelegation?: (show: boolean) => void;
  onSetTaskDelegationSessionId?: (sessionId: string | null) => void;
  visible?: boolean;
}

const TerminalPortal: React.FC<TerminalPortalProps> = ({
  containerRef,
  thinkingMode = 'normal',
  onThinkingModeChange,
  onTerminalDataChange,
  onShowTaskDelegation,
  onSetTaskDelegationSessionId,
  visible = true
}) => {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const terminalInstanceRef = useRef<React.ReactElement | null>(null);

  useEffect(() => {
    // Create portal container
    const container = document.getElementById('terminal-portal-root') as HTMLDivElement;
    if (!container) {
      // Create it if it doesn't exist
      const newContainer = document.createElement('div');
      newContainer.id = 'terminal-portal-root';
      newContainer.style.position = 'absolute';
      newContainer.style.pointerEvents = 'none'; // Let events pass through
      document.body.appendChild(newContainer);
      setPortalContainer(newContainer);
    } else {
      setPortalContainer(container);
    }

    return () => {
      // Don't remove the portal container on unmount - it should persist
    };
  }, []);

  // Update portal position to match container
  useEffect(() => {
    if (!containerRef?.current || !portalContainer) return;

    const updatePosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect && portalContainer) {
        // CRITICAL FIX: Prevent terminal from disappearing when container briefly has zero dimensions
        // During panel resize, the container might temporarily have 0 width/height
        // Keep the previous dimensions if the new ones are too small
        const MIN_WIDTH = 100;
        const MIN_HEIGHT = 50;
        
        const width = rect.width > MIN_WIDTH ? rect.width : parseInt(portalContainer.style.width || '400');
        const height = rect.height > MIN_HEIGHT ? rect.height : parseInt(portalContainer.style.height || '200');
        
        portalContainer.style.position = 'fixed';
        portalContainer.style.left = `${rect.left}px`;
        portalContainer.style.top = `${rect.top}px`;
        portalContainer.style.width = `${width}px`;
        portalContainer.style.height = `${height}px`;
        portalContainer.style.pointerEvents = visible ? 'auto' : 'none';
        portalContainer.style.display = visible ? 'block' : 'none';
        portalContainer.style.zIndex = '1'; // Behind modals but above base content
        
        // Debug logging
        if (rect.width < MIN_WIDTH || rect.height < MIN_HEIGHT) {
          console.warn('⚠️ Terminal container has small dimensions during resize:', {
            rectWidth: rect.width,
            rectHeight: rect.height,
            usingWidth: width,
            usingHeight: height
          });
        }
      }
    };

    updatePosition();

    // CRITICAL FIX: Force re-render after resize operations complete
    let resizeTimeout: NodeJS.Timeout;
    const updateWithDebounce = () => {
      updatePosition();
      // Force another update after animations complete
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        updatePosition();
        // Double-check dimensions are correct
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && portalContainer) {
            // Force repaint if dimensions look good
            portalContainer.style.display = 'none';
            // Force reflow by reading offsetHeight
            void portalContainer.offsetHeight;
            portalContainer.style.display = visible ? 'block' : 'none';
          }
        }
      }, 300);
    };

    // Update on resize with debounce
    const resizeObserver = new ResizeObserver(updateWithDebounce);
    resizeObserver.observe(containerRef.current);

    // Update on scroll/layout changes
    window.addEventListener('resize', updateWithDebounce);
    window.addEventListener('scroll', updatePosition);

    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWithDebounce);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [containerRef, portalContainer, visible]);

  // Create terminal instance once and reuse it
  if (!terminalInstanceRef.current) {
    terminalInstanceRef.current = (
      <TerminalManager
        thinkingMode={thinkingMode}
        onThinkingModeChange={onThinkingModeChange}
        onTerminalDataChange={onTerminalDataChange}
        onShowTaskDelegation={onShowTaskDelegation}
        onSetTaskDelegationSessionId={onSetTaskDelegationSessionId}
      />
    );
  }

  if (!portalContainer) return null;

  return ReactDOM.createPortal(
    <div style={{ width: '100%', height: '100%' }}>
      {terminalInstanceRef.current}
    </div>,
    portalContainer
  );
};

export default TerminalPortal;