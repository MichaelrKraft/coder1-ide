import React, { useRef, useEffect, useState } from 'react';
import Terminal, { TerminalSessionData } from './Terminal';
import { ThinkingMode } from './ThinkingModeToggle';

interface TerminalStableProps {
  thinkingMode?: ThinkingMode;
  onThinkingModeChange?: (mode: ThinkingMode) => void;
  onTerminalDataChange?: (data: TerminalSessionData) => void;
  onShowTaskDelegation?: (show: boolean) => void;
  onSetTaskDelegationSessionId?: (sessionId: string | null) => void;
}

/**
 * TerminalStable - Maintains stable dimensions during resize
 * 
 * CRITICAL FIX: This component prevents the terminal from disappearing by:
 * 1. Never allowing the terminal container to go to 0 dimensions
 * 2. Preserving last valid dimensions during resize operations
 * 3. Using absolute positioning during resize to maintain visibility
 */
const TerminalStable: React.FC<TerminalStableProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [stableDimensions, setStableDimensions] = useState({ width: 800, height: 400 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    let lastValidWidth = 800;
    let lastValidHeight = 400;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        console.log('📐 Container dimensions:', { width, height, isResizing });
        
        // If dimensions are collapsing (going to zero)
        if (width < 50 || height < 50) {
          if (!isResizing) {
            console.log('⚠️ Resize detected - preserving terminal at:', lastValidWidth, 'x', lastValidHeight);
            setIsResizing(true);
            
            // Lock the inner container to last valid dimensions
            if (innerRef.current) {
              innerRef.current.style.width = `${lastValidWidth}px`;
              innerRef.current.style.height = `${lastValidHeight}px`;
              innerRef.current.style.position = 'absolute';
              innerRef.current.style.overflow = 'hidden';
            }
          }
        } else {
          // Valid dimensions - save them
          lastValidWidth = width;
          lastValidHeight = height;
          
          if (!isResizing) {
            setStableDimensions({ width, height });
          }
        }
        
        // Detect when resize ends
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        resizeTimeoutRef.current = setTimeout(() => {
          if (isResizing) {
            console.log('✅ Resize complete - restoring normal layout');
            setIsResizing(false);
            
            // Restore normal layout
            if (innerRef.current) {
              innerRef.current.style.width = '100%';
              innerRef.current.style.height = '100%';
              innerRef.current.style.position = 'relative';
              
              // Update to new dimensions
              if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                if (rect.width > 50 && rect.height > 50) {
                  setStableDimensions({ width: rect.width, height: rect.height });
                  lastValidWidth = rect.width;
                  lastValidHeight = rect.height;
                }
              }
            }
          }
        }, 500); // Wait longer to ensure resize is complete
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    // Initial dimensions
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 50 && rect.height > 50) {
      setStableDimensions({ width: rect.width, height: rect.height });
    }
    
    return () => {
      resizeObserver.disconnect();
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [isResizing]);
  
  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        minWidth: '100px',
        minHeight: '100px'
      }}
    >
      {/* Inner container that maintains dimensions */}
      <div
        ref={innerRef}
        style={{
          width: isResizing ? `${stableDimensions.width}px` : '100%',
          height: isResizing ? `${stableDimensions.height}px` : '100%',
          position: isResizing ? 'absolute' : 'relative',
          top: 0,
          left: 0,
          overflow: 'hidden',
          backgroundColor: '#1a1b26' // Tokyo Night background
        }}
      >
        <Terminal {...props} />
      </div>
      
      {/* Visual indicator during resize */}
      {isResizing && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 165, 0, 0.1)',
            border: '2px solid orange',
            borderRadius: '8px',
            padding: '20px',
            color: 'orange',
            fontSize: '14px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            zIndex: 9999
          }}
        >
          Terminal preserved during resize...
        </div>
      )}
    </div>
  );
};

export default TerminalStable;