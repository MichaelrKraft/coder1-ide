'use client';

import React, { useEffect, useRef } from 'react';

interface MatrixBackgroundProps {
  color?: string;
  speed?: number;
  fontSize?: number;
  charset?: string;
  children?: React.ReactNode;
}

export default function MatrixBackground({
  color = '#00D9FF', // Coder1 cyan
  speed = 0.05,
  fontSize = 16,
  charset = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  children,
}: MatrixBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create drops
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = new Array(columns).fill(1);

    // Animation
    const draw = () => {
      // Fade effect - creates trailing effect
      ctx.fillStyle = 'rgba(10, 10, 15, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set text properties
      ctx.fillStyle = color;
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const char = charset[Math.floor(Math.random() * charset.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Draw character with glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillText(char, x, y);
        ctx.shadowBlur = 0;

        // Reset drop when it reaches bottom or randomly
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        // Move drop down
        drops[i] += speed;
      }
    };

    const interval = setInterval(draw, 33); // ~30fps

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resize);
    };
  }, [color, speed, fontSize, charset]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Matrix canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{ opacity: 0.8 }}
      />

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.1) 0px, rgba(0, 0, 0, 0.1) 1px, transparent 1px, transparent 2px)',
        }}
      />

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(10, 10, 15, 0.6) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-20">
        {children}
      </div>
    </div>
  );
}
