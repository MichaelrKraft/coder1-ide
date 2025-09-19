import React, { useRef, useEffect } from 'react';

interface DotGridBackgroundProps {
  className?: string;
}

const DotGridBackground: React.FC<DotGridBackgroundProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const interactiveLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const interactiveLayer = interactiveLayerRef.current;
    
    if (!container || !interactiveLayer) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      // Update CSS custom properties for mouse position
      interactiveLayer.style.setProperty('--mouse-x', `${x}%`);
      interactiveLayer.style.setProperty('--mouse-y', `${y}%`);
      
      // Add ripple effect class
      interactiveLayer.classList.add('mouse-active');
    };

    const handleMouseLeave = () => {
      interactiveLayer.classList.remove('mouse-active');
    };

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Create click ripple effect
      const ripple = document.createElement('div');
      ripple.className = 'click-ripple';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      
      interactiveLayer.appendChild(ripple);
      
      // Remove ripple after animation
      setTimeout(() => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      }, 1000);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`dot-grid-background ${className}`}
    >
      <div className="dot-grid-container">
        <div className="dot-grid"></div>
        <div className="dot-grid-overlay"></div>
        <div 
          ref={interactiveLayerRef}
          className="interactive-layer"
        ></div>
      </div>
    </div>
  );
};

export default DotGridBackground;