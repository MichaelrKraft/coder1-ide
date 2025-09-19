import React, { useState, useEffect, useRef } from 'react';
import './MagicFloatingWand.css';

interface MagicFloatingWandProps {
  onActivate: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'static';
  visible?: boolean;
}

const MagicFloatingWand: React.FC<MagicFloatingWandProps> = ({ 
  onActivate, 
  position = 'bottom-right',
  visible = true 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Add direct DOM event listener as fallback
  useEffect(() => {
    // Magic wand mount debug removed - was causing console spam
    const button = buttonRef.current;
    
    if (button && onActivate) {
      const handleDirectClick = (e: MouseEvent) => {
        // Direct click debug removed - was causing console spam
        e.preventDefault();
        e.stopPropagation();
        onActivate();
      };
      
      button.addEventListener('click', handleDirectClick);
      // Direct listener debug removed - was causing console spam
      
      return () => {
        button.removeEventListener('click', handleDirectClick);
      };
    }
  }, [onActivate]);

  if (!visible) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    console.log('🎯 React onClick fired!');
    e.preventDefault();
    setIsPressed(true);
    onActivate();
    setTimeout(() => setIsPressed(false), 200);
  };

  // Simplified button styles
  const buttonStyles: React.CSSProperties = {
    position: position === 'static' ? 'relative' : 'fixed',
    width: position === 'static' ? '44px' : '56px',
    height: position === 'static' ? '44px' : '56px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 25%, #c084fc 50%, #fb7185 75%, #f97316 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
    outline: 'none',
    padding: 0,
    boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4), 0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    pointerEvents: 'auto',
    zIndex: position === 'static' ? 'auto' : 99999,
    ...(position !== 'static' && {
      bottom: position.includes('bottom') ? '24px' : 'auto',
      top: position.includes('top') ? '24px' : 'auto',
      left: position.includes('left') ? '24px' : 'auto',
      right: position.includes('right') ? '24px' : 'auto',
    })
  };

  // Single button implementation for all positions
  return (
    <button
      ref={buttonRef}
      className={`magic-floating-wand ${position} ${isHovered ? 'hovered' : ''} ${isPressed ? 'pressed' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Open Magic Command Bar (Cmd+K)"
      style={buttonStyles}
      type="button"
      aria-label="Open Magic Command Bar"
    >
      <span className="wand-emoji" style={{ fontSize: position === 'static' ? '20px' : '24px', pointerEvents: 'none' }}>✨</span>
      {isHovered && (
        <div className="wand-tooltip" style={{ pointerEvents: 'none' }}>
          <span>Magic AI</span>
          <div className="tooltip-shortcut">⌘K</div>
        </div>
      )}
    </button>
  );
};

export default MagicFloatingWand;