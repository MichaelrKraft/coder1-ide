import React from 'react';

interface GalaxyBackgroundProps {
  className?: string;
}

const GalaxyBackground: React.FC<GalaxyBackgroundProps> = ({ className = '' }) => {
  return (
    <div className={`galaxy-background ${className}`}>
      <div className="galaxy-container">
        {/* Nebula layers */}
        <div className="nebula nebula-1"></div>
        <div className="nebula nebula-2"></div>
        <div className="nebula nebula-3"></div>
        
        {/* Star layers */}
        <div className="stars stars-1"></div>
        <div className="stars stars-2"></div>
        <div className="stars stars-3"></div>
        
        {/* Galaxy spiral */}
        <div className="galaxy-spiral"></div>
      </div>
    </div>
  );
};

export default GalaxyBackground;