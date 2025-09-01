'use client';

import React from 'react';

interface Coder1LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export default function Coder1Logo({ className = '', size = 'medium' }: Coder1LogoProps) {
  const sizes = {
    small: { fontSize: '20px', padding: '4px 8px' },
    medium: { fontSize: '28px', padding: '6px 12px' },
    large: { fontSize: '36px', padding: '8px 16px' }
  };

  const currentSize = sizes[size];

  return (
    <div 
      className={`inline-flex items-center ${className}`}
      style={{
        fontFamily: 'Monaco, Menlo, "Courier New", monospace',
        fontWeight: 'bold',
        fontSize: currentSize.fontSize,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%)',
        border: '2px solid #ff6b35',
        borderRadius: '8px',
        padding: currentSize.padding,
        boxShadow: '0 0 20px rgba(255, 107, 53, 0.3), inset 0 0 20px rgba(255, 107, 53, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Glow effect background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 30% 50%, rgba(255, 107, 53, 0.2) 0%, transparent 70%)',
          animation: 'pulse 3s ease-in-out infinite'
        }}
      />
      
      {/* Logo text */}
      <span style={{ 
        color: '#ff6b35',
        textShadow: '0 0 10px rgba(255, 107, 53, 0.8), 0 0 20px rgba(255, 107, 53, 0.6), 0 0 30px rgba(255, 107, 53, 0.4)',
        letterSpacing: '2px',
        position: 'relative',
        zIndex: 1
      }}>
        {'{'}
      </span>
      <span style={{ 
        color: '#00d9ff',
        textShadow: '0 0 10px rgba(0, 217, 255, 0.8), 0 0 20px rgba(0, 217, 255, 0.6), 0 0 30px rgba(0, 217, 255, 0.4)',
        letterSpacing: '1px',
        marginLeft: '2px',
        position: 'relative',
        zIndex: 1
      }}>
        CODER1
      </span>
      <span style={{ 
        color: '#ff6b35',
        textShadow: '0 0 10px rgba(255, 107, 53, 0.8), 0 0 20px rgba(255, 107, 53, 0.6), 0 0 30px rgba(255, 107, 53, 0.4)',
        letterSpacing: '2px',
        marginLeft: '2px',
        position: 'relative',
        zIndex: 1
      }}>
        {'}'}
      </span>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}