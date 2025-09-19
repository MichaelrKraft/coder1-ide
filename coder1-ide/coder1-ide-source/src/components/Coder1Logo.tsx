import React from 'react';

const Coder1Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      className={className}
      width="180" 
      height="100" 
      viewBox="0 0 180 100" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Gradient definitions */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4FF" stopOpacity="1" />
          <stop offset="50%" stopColor="#7B9FF7" stopOpacity="1" />
          <stop offset="100%" stopColor="#FF0080" stopOpacity="1" />
        </linearGradient>
      </defs>
      
      {/* Background circle */}
      <circle cx="50" cy="50" r="40" fill="url(#logoGradient)" opacity="0.1" />
      
      {/* Main logo shape - stylized C */}
      <path 
        d="M 70 30 Q 50 20, 30 30 Q 20 50, 30 70 Q 50 80, 70 70" 
        stroke="url(#logoGradient)" 
        strokeWidth="4" 
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Number 1 */}
      <line 
        x1="85" y1="30" 
        x2="85" y2="70" 
        stroke="url(#logoGradient)" 
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line 
        x1="75" y1="35" 
        x2="85" y2="30" 
        stroke="url(#logoGradient)" 
        strokeWidth="4"
        strokeLinecap="round"
      />
      
      {/* Text */}
      <text 
        x="110" 
        y="55" 
        fontFamily="Inter, system-ui, sans-serif" 
        fontSize="24" 
        fontWeight="700"
        fill="url(#logoGradient)"
      >
        Coder1
      </text>
      
      {/* Decorative dots */}
      <circle cx="30" cy="50" r="2" fill="#00D4FF" />
      <circle cx="50" cy="50" r="2" fill="#7B9FF7" />
      <circle cx="70" cy="50" r="2" fill="#FF0080" />
    </svg>
  );
};

export default Coder1Logo;