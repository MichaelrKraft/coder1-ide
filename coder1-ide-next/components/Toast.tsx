'use client';

import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, duration = 2000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div 
      className={`
        fixed bottom-4 right-4 px-4 py-2 bg-bg-tertiary border border-coder1-cyan 
        rounded-md shadow-lg z-50 transition-all duration-300
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
      style={{
        boxShadow: '0 0 20px rgba(0, 217, 255, 0.3)',
      }}
    >
      <span className="text-sm text-text-primary">{message}</span>
    </div>
  );
}